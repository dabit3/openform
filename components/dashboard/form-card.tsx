'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreVertical, 
  ExternalLink,
  BarChart3,
  Pencil,
  Copy
} from 'lucide-react'
import { Form, FormStatus } from '@/lib/database.types'
import { DeleteFormButton } from './delete-form-button'
import { toast } from 'sonner'

interface FormCardProps {
  form: Form
  responseCount: number
}

function getStatusBadge(status: FormStatus) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">פורסם</Badge>
    case 'draft':
      return <Badge variant="secondary" className="bg-slate-100 text-slate-600">טיוטה</Badge>
    case 'closed':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700">סגור</Badge>
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('he-IL', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getStatusColor(status: FormStatus) {
  switch (status) {
    case 'published':
      return 'from-emerald-400 to-teal-500'
    case 'draft':
      return 'from-slate-300 to-slate-400'
    case 'closed':
      return 'from-amber-400 to-orange-500'
  }
}

export function FormCard({ form, responseCount }: FormCardProps) {
  const copyFormLink = () => {
    const link = `${window.location.origin}/f/${form.slug}`
    navigator.clipboard.writeText(link)
    toast.success('הקישור הועתק')
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-0.5 bg-white/80 backdrop-blur-sm border-slate-200/60">
      {/* Color accent bar */}
      <div className={`h-1 bg-gradient-to-r ${getStatusColor(form.status)}`} />
      <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <Link 
            href={`/forms/${form.id}/edit`}
            className="text-lg font-semibold text-slate-900 hover:text-blue-600 truncate block transition-colors"
          >
            {form.title || 'טופס ללא שם'}
          </Link>
          <p className="text-sm text-slate-500 mt-1">
            עודכן ב-{formatDate(form.updated_at)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/forms/${form.id}/edit`} className="cursor-pointer">
                <Pencil className="me-2 h-4 w-4" />
                עריכה
              </Link>
            </DropdownMenuItem>
            {form.status === 'published' && (
              <DropdownMenuItem asChild>
                <Link href={`/f/${form.slug}`} target="_blank" className="cursor-pointer">
                  <ExternalLink className="me-2 h-4 w-4" />
                  צפייה בטופס
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/forms/${form.id}/responses`} className="cursor-pointer">
                <BarChart3 className="me-2 h-4 w-4" />
                תשובות
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={copyFormLink}
              className="cursor-pointer"
            >
              <Copy className="me-2 h-4 w-4" />
              העתקת קישור
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteFormButton formId={form.id} formTitle={form.title} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        {getStatusBadge(form.status)}
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <BarChart3 className="w-4 h-4" />
          <span>{responseCount} תשובות</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
        <Link href={`/forms/${form.id}/edit`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
            <Pencil className="w-3 h-3 me-2" />
            עריכה
          </Button>
        </Link>
        <Link href={`/forms/${form.id}/responses`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-colors">
            <BarChart3 className="w-3 h-3 me-2" />
            תשובות
          </Button>
        </Link>
      </div>
      </div>
    </Card>
  )
}
