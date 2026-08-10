import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuestionConfig } from '@/lib/database.types'
import { deleteR2Objects, isR2Configured, putR2Object } from '@/lib/r2'
import { consumeRateLimit, getClientIp } from '@/lib/security/rate-limit'
import { verifyUploadToken } from '@/lib/security/upload-token'
import { cappedRequest } from '@/lib/security/body-limit'

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
  // 24h, comfortably past any plausible open form session, so a slow respondent's
  // pending upload is not GC'd out from under them by another form's upload.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
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
  const token = request.headers.get('x-upload-token')
  const tokenPayload = token ? verifyUploadToken(token) : null
  if (!tokenPayload) {
    return NextResponse.json({ error: 'הרשאת ההעלאה אינה תקינה או שפג תוקפה' }, { status: 401 })
  }

  try {
    const [ipAllowed, formAllowed] = await Promise.all([
      consumeRateLimit('upload-ip', getClientIp(request), 10, 10 * 60),
      consumeRateLimit('upload-form', tokenPayload.formId, 100, 60 * 60),
    ])
    if (!ipAllowed || !formAllowed) {
      return NextResponse.json({ error: 'יותר מדי העלאות. יש לנסות שוב מאוחר יותר.' }, { status: 429 })
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
      return NextResponse.json({ error: 'שאלת ההעלאה לא נמצאה בטופס שפורסם' }, { status: 404 })
    }

    // Enforce the size cap while streaming; the body is never fully buffered
    // past MAX_REQUEST_BYTES even if Content-Length lies or is absent.
    let formData: FormData
    try {
      formData = await cappedRequest(request, MAX_REQUEST_BYTES).formData()
    } catch {
      return NextResponse.json({ error: 'הקובץ גדול מדי' }, { status: 413 })
    }
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 })
    }

    const configuredTypes = question.allowedFileTypes || ['image/*', 'application/pdf']
    if (!SUPPORTED_FILE_TYPES.includes(file.type as typeof SUPPORTED_FILE_TYPES[number])
      || !isAllowedByQuestion(file.type, configuredTypes)) {
      return NextResponse.json({ error: 'סוג הקובץ אינו נתמך' }, { status: 400 })
    }

    const maxFileSizeMb = Math.min(Math.max(question.maxFileSize || 10, 1), 25)
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `הקובץ גדול מדי. הגודל המרבי הוא ${maxFileSizeMb}MB` },
        { status: 400 }
      )
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: 'אחסון הקבצים אינו מוגדר', configured: false }, { status: 503 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasValidFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: 'תוכן הקובץ אינו תואם לסוג הקובץ שנבחר' }, { status: 400 })
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
    return NextResponse.json({ error: 'העלאת הקובץ נכשלה' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ configured: isR2Configured() })
}
