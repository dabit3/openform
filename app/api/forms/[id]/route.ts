import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteR2Objects } from '@/lib/r2'

interface FormRouteProps {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: FormRouteProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })

  const admin = createAdminClient()
  const { data: form } = await admin
    .from('forms')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!form) return NextResponse.json({ error: 'הטופס לא נמצא' }, { status: 404 })

  const { data: uploads } = await admin.from('uploads').select('object_key').eq('form_id', id)

  try {
    await deleteR2Objects((uploads || []).map(upload => upload.object_key))
    const { error } = await admin.from('forms').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Form deletion error:', error)
    return NextResponse.json({ error: 'מחיקת הטופס נכשלה' }, { status: 500 })
  }
}
