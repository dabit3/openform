import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, FileText, Globe, BarChart3 } from 'lucide-react'
import { Form } from '@/lib/database.types'
import { FormCard } from '@/components/dashboard/form-card'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: formsData } = await supabase
    .from('forms')
    .select('*')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  const forms = (formsData || []) as Form[]

  // Get response counts for each form
  const formIds = forms.map(f => f.id)
  const { data: responseCounts } = formIds.length > 0 
    ? await supabase
        .from('responses')
        .select('form_id')
        .in('form_id', formIds)
    : { data: [] }

  const responseCountMap = new Map<string, number>()
  responseCounts?.forEach((r: { form_id: string }) => {
    const count = responseCountMap.get(r.form_id) || 0
    responseCountMap.set(r.form_id, count + 1)
  })

  const totalResponses = responseCounts?.length ?? 0
  const publishedCount = forms.filter(f => f.status === 'published').length
  const stats = [
    { label: 'Forms', value: forms.length, icon: FileText },
    { label: 'Published', value: publishedCount, icon: Globe },
    { label: 'Responses', value: totalResponses, icon: BarChart3 },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Forms</h1>
          <p className="text-sm text-slate-500 mt-1">Create, publish, and review responses to your forms.</p>
        </div>
        {forms.length > 0 && (
          <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-sm self-start sm:self-auto">
            <Link href="/forms/new">
              <Plus className="w-4 h-4" />
              New form
            </Link>
          </Button>
        )}
      </div>

      {forms.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <stat.icon className="w-3.5 h-3.5" />
                {stat.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {forms.length === 0 ? (
        <Card className="px-6 py-16 sm:p-16 text-center border-dashed border-2 border-slate-200 bg-white shadow-none">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
            <FileText className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Create your first form</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
            Build forms people actually enjoy filling out, one question at a time.
          </p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Link href="/forms/new">
              <Plus className="w-4 h-4" />
              Create a form
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <FormCard 
              key={form.id} 
              form={form} 
              responseCount={responseCountMap.get(form.id) || 0} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
