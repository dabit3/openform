import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FormPlayer } from '@/components/form-player/form-player'
import { Form } from '@/lib/database.types'
import { QuestionConfig } from '@/lib/database.types'
import { createUploadToken } from '@/lib/security/upload-token'

export const dynamic = 'force-dynamic'

interface FormPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: FormPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('forms')
    .select('title, description')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  const form = data as { title: string; description: string | null } | null

  if (!form) {
    return { title: 'Form Not Found' }
  }

  return {
    title: form.title || 'Form',
    description: form.description || 'Fill out this form',
  }
}

export default async function FormPage({ params }: FormPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  const form = data as Form | null

  if (error || !form) {
    notFound()
  }

  const uploadTokens = Object.fromEntries(
    (form.questions as QuestionConfig[])
      .filter(question => question.type === 'file_upload')
      .map(question => [question.id, createUploadToken(form.id, question.id)])
  )

  return <FormPlayer form={form} uploadTokens={uploadTokens} />
}
