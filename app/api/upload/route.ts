import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuestionConfig } from '@/lib/database.types'
import { deleteR2Objects, isR2Configured, putR2Object } from '@/lib/r2'
import { consumeRateLimit, getClientIp } from '@/lib/security/rate-limit'
import { verifyUploadToken } from '@/lib/security/upload-token'

const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const
const MAX_REQUEST_BYTES = 26 * 1024 * 1024

function isAllowedByQuestion(fileType: string, allowedFileTypes: string[]): boolean {
  return allowedFileTypes.some(allowedType => {
    if (allowedType === fileType) return true
    return allowedType.endsWith('/*') && fileType.startsWith(allowedType.slice(0, -1))
  })
}

function hasValidFileSignature(buffer: Buffer, fileType: string): boolean {
  if (fileType === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  if (fileType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (fileType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
  if (fileType === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  if (fileType === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  return false
}

async function cleanupAbandonedUploads(): Promise<void> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: abandoned } = await admin
    .from('uploads')
    .select('id, object_key')
    .is('response_id', null)
    .lt('created_at', cutoff)
    .limit(50)

  if (!abandoned?.length) return
  await deleteR2Objects(abandoned.map(upload => upload.object_key))
  await admin.from('uploads').delete().in('id', abandoned.map(upload => upload.id))
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Upload request is too large' }, { status: 413 })
  }

  const token = request.headers.get('x-upload-token')
  const tokenPayload = token ? verifyUploadToken(token) : null
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Invalid or expired upload authorization' }, { status: 401 })
  }

  try {
    const [ipAllowed, formAllowed] = await Promise.all([
      consumeRateLimit('upload-ip', getClientIp(request), 10, 10 * 60),
      consumeRateLimit('upload-form', tokenPayload.formId, 100, 60 * 60),
    ])
    if (!ipAllowed || !formAllowed) {
      return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 })
    }

    const admin = createAdminClient()
    const { data: form } = await admin
      .from('forms')
      .select('questions')
      .eq('id', tokenPayload.formId)
      .eq('status', 'published')
      .maybeSingle()

    const question = (form?.questions as QuestionConfig[] | undefined)
      ?.find(candidate => candidate.id === tokenPayload.questionId && candidate.type === 'file_upload')
    if (!question) {
      return NextResponse.json({ error: 'Published upload question not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const configuredTypes = question.allowedFileTypes || ['image/*', 'application/pdf']
    if (!SUPPORTED_FILE_TYPES.includes(file.type as typeof SUPPORTED_FILE_TYPES[number])
      || !isAllowedByQuestion(file.type, configuredTypes)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const maxFileSizeMb = Math.min(Math.max(question.maxFileSize || 10, 1), 25)
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxFileSizeMb}MB` },
        { status: 400 }
      )
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: 'File storage is not configured', configured: false }, { status: 503 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasValidFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: 'File contents do not match the selected file type' }, { status: 400 })
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_') || 'upload'
    const objectKey = `uploads/${tokenPayload.formId}/${tokenPayload.questionId}/${crypto.randomUUID()}-${sanitizedName}`
    await putR2Object(objectKey, buffer, file.type)

    const { data: upload, error: insertError } = await admin
      .from('uploads')
      .insert({
        form_id: tokenPayload.formId,
        question_id: tokenPayload.questionId,
        object_key: objectKey,
        original_name: file.name.slice(0, 255),
        content_type: file.type,
        size_bytes: file.size,
      })
      .select('id')
      .single()

    if (insertError || !upload) {
      await deleteR2Objects([objectKey])
      throw insertError || new Error('Failed to record upload')
    }

    try {
      await cleanupAbandonedUploads()
    } catch (cleanupError) {
      console.error('Abandoned upload cleanup error:', cleanupError)
    }

    return NextResponse.json({
      success: true,
      file: {
        uploadId: upload.id,
        name: file.name,
        type: file.type,
        size: file.size,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ configured: isR2Configured() })
}
