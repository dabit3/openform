import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuestionConfig, Json } from '@/lib/database.types'
import { getClientIp, consumeRateLimit } from '@/lib/security/rate-limit'
import { validateResponseAnswers } from '@/lib/security/response-validation'

const MAX_RESPONSE_BYTES = 64 * 1024

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_RESPONSE_BYTES) {
    return NextResponse.json({ error: 'Response is too large' }, { status: 413 })
  }

  try {
    const bodyText = await request.text()
    if (Buffer.byteLength(bodyText) > MAX_RESPONSE_BYTES) {
      return NextResponse.json({ error: 'Response is too large' }, { status: 413 })
    }

    const body = JSON.parse(bodyText) as { formId?: unknown; answers?: unknown }
    if (typeof body.formId !== 'string') {
      return NextResponse.json({ error: 'Form is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: form, error: formError } = await admin
      .from('forms')
      .select('id, questions')
      .eq('id', body.formId)
      .eq('status', 'published')
      .maybeSingle()

    if (formError || !form) {
      return NextResponse.json({ error: 'Form is not accepting responses' }, { status: 404 })
    }

    const [ipAllowed, formAllowed] = await Promise.all([
      consumeRateLimit('response-ip', getClientIp(request), 20, 10 * 60),
      consumeRateLimit('response-form', body.formId, 1000, 60 * 60),
    ])
    if (!ipAllowed || !formAllowed) {
      return NextResponse.json({ error: 'Too many responses. Please try again later.' }, { status: 429 })
    }

    const validated = validateResponseAnswers(form.questions as QuestionConfig[], body.answers)
    const uploadIds = [...new Set(validated.uploadReferences.map(reference => reference.uploadId))]

    if (uploadIds.length > 0) {
      const { data: uploads, error: uploadError } = await admin
        .from('uploads')
        .select('id, question_id, original_name, content_type, size_bytes')
        .eq('form_id', body.formId)
        .is('response_id', null)
        .in('id', uploadIds)

      if (uploadError || !uploads || uploads.length !== uploadIds.length) {
        return NextResponse.json({ error: 'One or more uploads are invalid' }, { status: 400 })
      }

      const uploadsById = new Map(uploads.map(upload => [upload.id, upload]))
      for (const reference of validated.uploadReferences) {
        const upload = uploadsById.get(reference.uploadId)
        if (!upload || upload.question_id !== reference.questionId) {
          return NextResponse.json({ error: 'An upload does not belong to this question' }, { status: 400 })
        }
        validated.answers[reference.questionId] = {
          uploadId: upload.id,
          name: upload.original_name,
          type: upload.content_type,
          size: upload.size_bytes,
        }
      }
    }

    const { error: submitError } = await admin.rpc('submit_form_response', {
      p_form_id: body.formId,
      p_answers: validated.answers as Record<string, Json>,
      p_upload_ids: uploadIds,
    })

    if (submitError) {
      return NextResponse.json({ error: 'Failed to submit response' }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    if (error instanceof Error && error.message && !error.message.includes('Supabase')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Response submission error:', error)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}
