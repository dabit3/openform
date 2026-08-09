import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteR2Objects } from '@/lib/r2'

interface ResponseRouteProps {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: ResponseRouteProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: response } = await admin.from('responses').select('form_id').eq('id', id).maybeSingle()
  if (!response) return NextResponse.json({ error: 'Response not found' }, { status: 404 })

  const { data: form } = await admin
    .from('forms')
    .select('id')
    .eq('id', response.form_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!form) return NextResponse.json({ error: 'Response not found' }, { status: 404 })

  const { data: uploads } = await admin.from('uploads').select('object_key').eq('response_id', id)

  try {
    await deleteR2Objects((uploads || []).map(upload => upload.object_key))
    const { error } = await admin.from('responses').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Response deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete response' }, { status: 500 })
  }
}
