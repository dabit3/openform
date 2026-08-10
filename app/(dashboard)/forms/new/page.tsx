import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { FormInsert } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

function generateSlug(): string {
  // Generate a short random slug
  return Math.random().toString(36).substring(2, 10)
}

export default async function NewFormPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Create a new form
  const formId = uuidv4()
  const slug = generateSlug()

  const newForm: FormInsert = {
    id: formId,
    user_id: user.id,
    title: 'טופס ללא שם',
    slug: slug,
    status: 'draft',
    theme: 'minimal',
    questions: [],
    thank_you_message: 'תודה על התשובה!',
  }

  const { error } = await supabase
    .from('forms')
    .insert(newForm as never)

  if (error) {
    console.error('Error creating form:', error)
    redirect('/dashboard')
  }

  // Redirect to the form editor
  redirect(`/forms/${formId}/edit`)
}

