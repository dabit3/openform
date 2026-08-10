'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Form, Response, QuestionConfig, Json } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  ArrowRight,
  Search,
  Download,
  Trash2,
  MoreVertical,
  FileText,
  ExternalLink,
  Copy,
  Pencil,
  Image as ImageIcon,
  File,
  Eye,
} from 'lucide-react'

interface ResponsesDashboardProps {
  form: Form
  responses: Response[]
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('he-IL', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface FileUpload {
  uploadId: string
  name: string
  type: string
  size?: number
}

function isFileUpload(answer: Json): boolean {
  if (answer === null || typeof answer !== 'object' || Array.isArray(answer)) {
    return false
  }
  const obj = answer as Record<string, unknown>
  return (
    'uploadId' in obj &&
    typeof obj.uploadId === 'string' &&
    'name' in obj &&
    typeof obj.name === 'string'
  )
}

function asFileUpload(answer: Json): FileUpload {
  return answer as unknown as FileUpload
}

function getFileUrl(file: FileUpload): string {
  return `/api/uploads/${encodeURIComponent(file.uploadId)}`
}

const LTR_ANSWER_TYPES = new Set(['email', 'url', 'phone', 'number'])

// 'Yes'/'No' are the stored answer values; only their display label is Hebrew.
const YES_NO_LABELS: Record<string, string> = { Yes: 'כן', No: 'לא' }

function formatAnswer(answer: Json, question?: QuestionConfig): string {
  if (answer === null || answer === undefined) return '-'
  if (typeof answer === 'boolean') return answer ? 'כן' : 'לא'
  if (question?.type === 'yes_no' && typeof answer === 'string' && answer in YES_NO_LABELS) {
    return YES_NO_LABELS[answer]
  }
  if (Array.isArray(answer)) return answer.join(', ')
  if (typeof answer === 'object') {
    // Handle file uploads
    if (isFileUpload(answer)) {
      return asFileUpload(answer).name
    }
    return JSON.stringify(answer)
  }
  return String(answer)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function escapeCsvCell(value: unknown): string {
  const cell = String(value)
  const neutralized = /^(?:[\t\r\n]|[\s]*[=+\-@])/.test(cell) ? `'${cell}` : cell
  return `"${neutralized.replace(/"/g, '""')}"`
}

export function ResponsesDashboard({ form, responses: initialResponses }: ResponsesDashboardProps) {
  const questions = useMemo(() => (form.questions as QuestionConfig[]) || [], [form.questions])

  const [responses, setResponses] = useState(initialResponses)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filePreview, setFilePreview] = useState<FileUpload | null>(null)

  // Filter responses based on search query
  const filteredResponses = useMemo(() => {
    if (!searchQuery.trim()) return responses

    const query = searchQuery.toLowerCase()
    return responses.filter(response => {
      const answers = response.answers as Record<string, Json>
      return Object.entries(answers).some(([questionId, answer]) =>
        formatAnswer(answer, questions.find(q => q.id === questionId))
          .toLowerCase()
          .includes(query)
      )
    })
  }, [questions, responses, searchQuery])

  const handleDelete = async () => {
    if (!responseToDelete) return
    
    setIsDeleting(true)
    const result = await fetch(`/api/responses/${responseToDelete}`, { method: 'DELETE' })

    if (!result.ok) {
      toast.error('מחיקת התשובה נכשלה')
    } else {
      setResponses(prev => prev.filter(r => r.id !== responseToDelete))
      toast.success('התשובה נמחקה')
    }
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setResponseToDelete(null)
  }

  const exportToCSV = () => {
    if (responses.length === 0) {
      toast.error('אין תשובות לייצוא')
      return
    }

    // Build CSV header
    const headers = ['נשלח בתאריך', ...questions.map(q => q.title || 'ללא כותרת')]

    // Build CSV rows
    const rows = responses.map(response => {
      const answers = response.answers as Record<string, Json>
      return [
        formatDate(response.submitted_at),
        ...questions.map(q => formatAnswer(answers[q.id], q))
      ]
    })

    // Create CSV content
    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => 
        row.map(escapeCsvCell).join(',')
      )
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${form.title || 'טופס ללא שם'}-תשובות-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)

    toast.success('קובץ ה-CSV יוצא בהצלחה')
  }

  const copyFormLink = () => {
    const link = `${window.location.origin}/f/${form.slug}`
    navigator.clipboard.writeText(link)
    toast.success('הקישור הועתק')
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4 me-2" />
              חזרה
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{form.title}</h1>
              {form.status === 'published' && (
                <Badge className="bg-emerald-100 text-emerald-700">פורסם</Badge>
              )}
              {form.status === 'draft' && (
                <Badge variant="secondary">טיוטה</Badge>
              )}
              {form.status === 'closed' && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">סגור</Badge>
              )}
            </div>
            <p className="text-slate-600 mt-1">
              {responses.length === 1 ? 'תשובה אחת' : `${responses.length} תשובות`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/forms/${form.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 me-2" />
                עריכת הטופס
              </Button>
            </Link>
            {form.status === 'published' && (
              <>
                <Button variant="outline" size="sm" onClick={copyFormLink}>
                  <Copy className="w-4 h-4 me-2" />
                  העתקת קישור
                </Button>
                <Link href={`/f/${form.slug}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 me-2" />
                    צפייה בטופס
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Responses section */}
      {responses.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">אין עדיין תשובות</h2>
          <p className="text-slate-600 max-w-sm mx-auto">
            {form.status === 'published'
              ? 'אפשר לשתף את הטופס ולהתחיל לאסוף תשובות'
              : 'יש לפרסם את הטופס כדי להתחיל לאסוף תשובות'
            }
          </p>
          {form.status === 'published' && (
            <Button onClick={copyFormLink} className="mt-6 bg-blue-600 hover:bg-blue-700">
              <Copy className="w-4 h-4 me-2" />
              העתקת קישור לטופס
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש בתשובות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 me-2" />
              ייצוא CSV
            </Button>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] sticky start-0 bg-white z-10 ps-6">נשלח</TableHead>
                    {questions.map((question, index) => (
                      <TableHead key={question.id} className="min-w-[200px]">
                        <span className="text-slate-400 me-2">{index + 1}.</span>
                        {question.title || 'ללא כותרת'}
                        {question.required && <span className="text-red-500 ms-1">*</span>}
                      </TableHead>
                    ))}
                    <TableHead className="w-[60px] sticky end-0 bg-white z-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response) => {
                    const answers = response.answers as Record<string, Json>
                    return (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium sticky start-0 bg-white z-10 ps-6">
                          {formatDate(response.submitted_at)}
                        </TableCell>
                        {questions.map((question) => {
                          const answer = answers[question.id]
                          
                          // Special rendering for file uploads
                          if (isFileUpload(answer)) {
                            const file = asFileUpload(answer)
                            const isImage = file.type?.startsWith('image/')
                            return (
                              <TableCell key={question.id} className="max-w-[300px]">
                                <button
                                  onClick={() => setFilePreview(file)}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-sm group"
                                >
                                  {isImage ? (
                                    <ImageIcon className="w-4 h-4" />
                                  ) : (
                                    <File className="w-4 h-4" />
                                  )}
                                  <span className="truncate max-w-[150px]">{file.name}</span>
                                  <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              </TableCell>
                            )
                          }
                          
                          // Latin-script answers need their own direction inside the RTL table.
                          const isLtrAnswer = LTR_ANSWER_TYPES.has(question.type)

                          return (
                            <TableCell key={question.id} className="max-w-[300px] truncate">
                              {isLtrAnswer ? (
                                <span dir="ltr" className="inline-block">{formatAnswer(answer, question)}</span>
                              ) : (
                                formatAnswer(answer, question)
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="sticky end-0 bg-white z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setResponseToDelete(response.id)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="me-2 h-4 w-4" />
                                מחיקה
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>

          {filteredResponses.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-slate-500">לא נמצאו תשובות שמתאימות לחיפוש</p>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת תשובה</DialogTitle>
            <DialogDescription>
              למחוק את התשובה הזו? אי אפשר לבטל את הפעולה.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'מוחק...' : 'מחיקה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File preview dialog */}
      <Dialog open={!!filePreview} onOpenChange={() => setFilePreview(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {filePreview?.type?.startsWith('image/') ? (
                <ImageIcon className="w-5 h-5 text-blue-600" />
              ) : (
                <File className="w-5 h-5 text-blue-600" />
              )}
              <span className="truncate">{filePreview?.name}</span>
            </DialogTitle>
            <DialogDescription>
              <span dir="ltr" className="inline-block">
                {filePreview?.size ? formatFileSize(filePreview.size) + ' • ' : ''}{filePreview?.type}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-0 mt-4">
            {filePreview?.type?.startsWith('image/') ? (
              // Authenticated object proxy supports private R2 images.
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={getFileUrl(filePreview)} 
                alt={filePreview.name}
                referrerPolicy="no-referrer"
                className="max-w-full h-auto rounded-lg mx-auto"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <File className="w-16 h-16 mb-4 opacity-50" />
                <p>כדי לצפות בקובץ בבטחה יש להוריד אותו</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFilePreview(null)}>
              סגירה
            </Button>
            {filePreview && (
              <a
                href={`${getFileUrl(filePreview)}?download=1`}
                rel="noopener noreferrer"
                download={filePreview.name}
              >
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 me-2" />
                  הורדה
                </Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
