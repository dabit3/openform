import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getR2Object } from '@/lib/r2'

interface UploadRouteProps {
  params: Promise<{ id: string }>
}

function contentDisposition(name: string, download: boolean): string {
  const safeAscii = name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'download'
  return `${download ? 'attachment' : 'inline'}; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function GET(request: NextRequest, { params }: UploadRouteProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: upload } = await admin
    .from('uploads')
    .select('form_id, object_key, original_name, content_type')
    .eq('id', id)
    .not('response_id', 'is', null)
    .maybeSingle()

  if (!upload) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const { data: form } = await admin
    .from('forms')
    .select('id')
    .eq('id', upload.form_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!form) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  try {
    const object = await getR2Object(upload.object_key)
    if (!object.Body) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const download = request.nextUrl.searchParams.get('download') === '1'
    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        'Content-Type': upload.content_type,
        'Content-Disposition': contentDisposition(upload.original_name, download),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    })
  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json({ error: 'File unavailable' }, { status: 502 })
  }
}
