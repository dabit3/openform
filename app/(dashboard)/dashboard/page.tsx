import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, FileText } from 'lucide-react'
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">הטפסים שלי</h1>
          <p className="text-slate-600 mt-1">יצירה וניהול של הטפסים שלך</p>
        </div>
        <Link href="/forms/new">
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/30 hover:-translate-y-0.5">
            <Plus className="w-4 h-4 me-2" />
            טופס חדש
          </Button>
        </Link>
      </div>

      {forms.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-blue-200/60 bg-gradient-to-br from-white via-blue-50/30 to-sky-50/30">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">כאן מתחיל הטופס הראשון שלך</h2>
          <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
            אפשר לבנות טפסים יפים ומזמינים שאנשים באמת ירצו למלא. שאלה אחת בכל פעם.
          </p>
          <Link href="/forms/new">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-600/35 hover:-translate-y-0.5">
              <Plus className="w-5 h-5 me-2" />
              יצירת הטופס הראשון
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
