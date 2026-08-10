'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Form, QuestionConfig, ThemePreset, FormStatus } from '@/lib/database.types'
import { questionTypes, createDefaultQuestion, getQuestionTypeInfo } from '@/lib/questions'
import { themes, themeList } from '@/lib/themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  ArrowRight,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Save,
  Globe,
  X,
  ExternalLink,
  Copy,
  Settings,
  Palette,
  FileText,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { QuestionEditor } from './question-editor'
import { FormPreview } from './form-preview'

interface FormBuilderProps {
  form: Form
}

// Must be non-empty (DB column is NOT NULL UNIQUE); an empty slug makes /f/ a
// dead route and squats the unique index for everyone else.
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/
const INVALID_SLUG_MESSAGE = 'כתובת הטופס חייבת לכלול 3–64 תווים (אותיות באנגלית, ספרות ומקפים) ולהתחיל באות או בספרה'
// update() returns zero rows (data:[], error:null) when RLS no longer matches
// — e.g. the form was deleted elsewhere or the session expired. Treat as failure.
const STALE_FORM_MESSAGE = 'לא ניתן לשמור - הטופס כבר לא קיים או שתוקף ההתחברות פג. יש להעתיק את השינויים לפני רענון הדף.'

export function FormBuilder({ form: initialForm }: FormBuilderProps) {
  const supabase = useMemo(() => createClient(), [])
  
  const [form, setForm] = useState(initialForm)
  const [questions, setQuestions] = useState<QuestionConfig[]>(
    (initialForm.questions as QuestionConfig[]) || []
  )
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [activeTab, setActiveTab] = useState('questions')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId)

  const handleSave = useCallback(async () => {
    if (!SLUG_PATTERN.test(form.slug)) {
      toast.error(INVALID_SLUG_MESSAGE)
      return
    }
    setIsSaving(true)
    const updateData = {
      title: form.title,
      description: form.description,
      slug: form.slug,
      theme: form.theme,
      questions: questions,
      thank_you_message: form.thank_you_message,
    }
    const { data, error } = await supabase
      .from('forms')
      .update(updateData as never)
      .eq('id', form.id)
      .select('id')

    if (error) {
      toast.error(error.code === '23505' ? 'כתובת הטופס הזו כבר תפוסה' : 'שמירת הטופס נכשלה')
    } else if (!data || data.length === 0) {
      toast.error(STALE_FORM_MESSAGE)
    } else {
      toast.success('הטופס נשמר')
      setHasUnsavedChanges(false)
    }
    setIsSaving(false)
  }, [supabase, form, questions])

  const handlePublish = async () => {
    if (questions.length === 0) {
      toast.error('צריך להוסיף לפחות שאלה אחת לפני הפרסום')
      return
    }
    if (!SLUG_PATTERN.test(form.slug)) {
      toast.error(INVALID_SLUG_MESSAGE)
      return
    }

    setIsSaving(true)
    const newStatus: FormStatus = form.status === 'published' ? 'closed' : 'published'

    const updateData = {
      status: newStatus,
      questions: questions,
      title: form.title,
      description: form.description,
      slug: form.slug,
      theme: form.theme,
      thank_you_message: form.thank_you_message,
    }
    const { data, error } = await supabase
      .from('forms')
      .update(updateData as never)
      .eq('id', form.id)
      .select('id')

    if (error) {
      toast.error(error.code === '23505' ? 'כתובת הטופס הזו כבר תפוסה' : 'עדכון סטטוס הטופס נכשל')
    } else if (!data || data.length === 0) {
      toast.error(STALE_FORM_MESSAGE)
    } else {
      setForm({ ...form, status: newStatus })
      toast.success(newStatus === 'published' ? 'הטופס פורסם!' : 'פרסום הטופס בוטל')
      setShowPublishDialog(false)
      setHasUnsavedChanges(false)
    }
    setIsSaving(false)
  }

  const addQuestion = (type: QuestionConfig['type']) => {
    const newQuestion = createDefaultQuestion(type)
    setQuestions([...questions, newQuestion])
    setSelectedQuestionId(newQuestion.id)
    setShowAddQuestion(false)
    setHasUnsavedChanges(true)
  }

  const updateQuestion = (id: string, updates: Partial<QuestionConfig>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ))
    setHasUnsavedChanges(true)
  }

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
    if (selectedQuestionId === id) {
      setSelectedQuestionId(null)
    }
    setHasUnsavedChanges(true)
  }

  const handleReorder = (newOrder: QuestionConfig[]) => {
    setQuestions(newOrder)
    setHasUnsavedChanges(true)
  }

  const copyFormLink = () => {
    const link = `${window.location.origin}/f/${form.slug}`
    navigator.clipboard.writeText(link)
    toast.success('הקישור הועתק')
  }

  const currentTheme = themes[form.theme as ThemePreset] || themes.minimal

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4 me-2" />
              חזרה
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="group relative flex items-center">
            <Input
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value })
                setHasUnsavedChanges(true)
              }}
              className="text-lg font-semibold border-0 border-b-2 border-transparent bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-blue-500 hover:border-slate-300 px-1 pe-7 max-w-xs transition-colors"
              placeholder="טופס ללא שם"
            />
            <Pencil className="w-3.5 h-3.5 text-slate-400 absolute end-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity pointer-events-none" />
          </div>
          {form.status === 'published' && (
            <Badge className="bg-emerald-100 text-emerald-700">פורסם</Badge>
          )}
          {form.status === 'draft' && (
            <Badge variant="secondary">טיוטה</Badge>
          )}
          {form.status === 'closed' && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">סגור</Badge>
          )}
          {hasUnsavedChanges && (
            <span className="text-sm text-slate-500">יש שינויים שלא נשמרו</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {form.status === 'published' && (
            <>
              <Button variant="outline" size="sm" onClick={copyFormLink}>
                <Copy className="w-4 h-4 me-2" />
                העתקת קישור
              </Button>
              <Link href={`/f/${form.slug}`} target="_blank">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 me-2" />
                  צפייה
                </Button>
              </Link>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 me-2" />
            שמירה
          </Button>
          <Button
            size="sm"
            onClick={() => setShowPublishDialog(true)}
            className={form.status === 'published' 
              ? 'bg-amber-500 hover:bg-amber-600' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
            }
          >
            <Globe className="w-4 h-4 me-2" />
            {form.status === 'published' ? 'ביטול פרסום' : 'פרסום'}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-e border-slate-200 flex flex-col shrink-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col overflow-hidden">
            <div className="shrink-0 p-2 border-b border-slate-100">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="questions" className="text-xs">
                  <FileText className="w-3 h-3 me-1" />
                  שאלות
                </TabsTrigger>
                <TabsTrigger value="design" className="text-xs">
                  <Palette className="w-3 h-3 me-1" />
                  עיצוב
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  <Settings className="w-3 h-3 me-1" />
                  הגדרות
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="questions" className="flex-1 flex flex-col mt-0 overflow-hidden data-[state=inactive]:hidden">
              <div className="shrink-0 p-4 border-b border-slate-100">
                <Button 
                  onClick={() => setShowAddQuestion(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4 me-2" />
                  הוספת שאלה
                </Button>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {questions.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">עדיין אין שאלות</p>
                      <p className="text-xs text-slate-400 mt-1">אפשר להתחיל בהוספת השאלה הראשונה</p>
                    </div>
                  ) : (
                    <Reorder.Group axis="y" values={questions} onReorder={handleReorder}>
                      <AnimatePresence>
                        {questions.map((question, index) => (
                          <Reorder.Item key={question.id} value={question}>
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={`
                                group p-3 rounded-lg cursor-pointer mb-2 border transition-all
                                ${selectedQuestionId === question.id 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-white border-slate-100 hover:border-slate-200'
                                }
                              `}
                              onClick={() => setSelectedQuestionId(question.id)}
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-1 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-slate-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-slate-400">
                                      {index + 1}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {getQuestionTypeInfo(question.type)?.label}
                                    </span>
                                    {question.required && (
                                      <span className="text-xs text-red-500">*</span>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {question.title || 'שאלה ללא כותרת'}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteQuestion(question.id)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                </Button>
                              </div>
                            </motion.div>
                          </Reorder.Item>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="design" className="flex-1 mt-0 overflow-auto data-[state=inactive]:hidden">
              <div className="p-4 space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">ערכת עיצוב</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {themeList.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setForm({ ...form, theme: theme.id })
                          setHasUnsavedChanges(true)
                        }}
                        className={`
                          p-3 rounded-lg border-2 transition-all text-start
                          ${form.theme === theme.id 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-slate-200 hover:border-slate-300'
                          }
                        `}
                      >
                        <div 
                          className="w-full h-8 rounded mb-2"
                          style={{ backgroundColor: theme.backgroundColor }}
                        >
                          <div 
                            className="w-1/2 h-full rounded-s flex items-center justify-center"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 mt-0 overflow-auto data-[state=inactive]:hidden">
              <div className="p-4 space-y-6">
                <div>
                  <Label htmlFor="slug" className="text-sm font-medium">כתובת הטופס</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-slate-500">/f/</span>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        setForm({ ...form, slug })
                        setHasUnsavedChanges(true)
                      }}
                      className="flex-1"
                      placeholder="my-form"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">תיאור</Label>
                  <Textarea
                    id="description"
                    value={form.description || ''}
                    onChange={(e) => {
                      setForm({ ...form, description: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    className="mt-2"
                    placeholder="תיאור קצר לטופס (לא חובה)..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="thank_you" className="text-sm font-medium">הודעת סיום</Label>
                  <Textarea
                    id="thank_you"
                    value={form.thank_you_message}
                    onChange={(e) => {
                      setForm({ ...form, thank_you_message: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    className="mt-2"
                    placeholder="תודה על התשובה!"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Preview / Editor area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Question Editor */}
          {selectedQuestion && (
            <div className="w-96 bg-white border-e border-slate-200 overflow-auto">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-medium">עריכת שאלה</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedQuestionId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <QuestionEditor
                question={selectedQuestion}
                onUpdate={(updates) => updateQuestion(selectedQuestion.id, updates)}
                onDelete={() => deleteQuestion(selectedQuestion.id)}
              />
            </div>
          )}

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-slate-100 p-8">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">תצוגה מקדימה</span>
                </div>
                <div 
                  className="min-h-[500px]"
                  style={{ 
                    backgroundColor: currentTheme.backgroundColor,
                    fontFamily: currentTheme.fontFamily 
                  }}
                >
                  <FormPreview 
                    questions={questions}
                    theme={currentTheme}
                    selectedQuestionId={selectedQuestionId}
                    onSelectQuestion={setSelectedQuestionId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Question Dialog */}
      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוספת שאלה</DialogTitle>
            <DialogDescription>
              איזה סוג שאלה להוסיף לטופס?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            {questionTypes.map((qt) => (
              <button
                key={qt.type}
                onClick={() => addQuestion(qt.type)}
                className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-start group"
              >
                <qt.icon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-2" />
                <p className="font-medium text-sm text-slate-900">{qt.label}</p>
                <p className="text-xs text-slate-500 mt-1">{qt.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.status === 'published' ? 'לבטל את פרסום הטופס?' : 'לפרסם את הטופס?'}
            </DialogTitle>
            <DialogDescription>
              {form.status === 'published'
                ? 'הטופס לא יהיה זמין יותר למשיבים. התשובות שכבר התקבלו יישמרו.'
                : 'הטופס יהיה זמין בכתובת:'
              }
            </DialogDescription>
          </DialogHeader>
          {form.status !== 'published' && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <code dir="ltr" className="text-sm text-blue-600 inline-block text-start">
                {typeof window !== 'undefined' ? window.location.origin : ''}/f/{form.slug}
              </code>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handlePublish}
              disabled={isSaving}
              className={form.status === 'published' 
                ? 'bg-amber-500 hover:bg-amber-600' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
              }
            >
              {isSaving ? 'שומר...' : form.status === 'published' ? 'ביטול פרסום' : 'פרסום'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
