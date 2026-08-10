'use client'

import { QuestionConfig } from '@/lib/database.types'
import { getQuestionTypeInfo } from '@/lib/questions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Trash2, Plus, GripVertical, X } from 'lucide-react'

interface QuestionEditorProps {
  question: QuestionConfig
  onUpdate: (updates: Partial<QuestionConfig>) => void
  onDelete: () => void
}

export function QuestionEditor({ question, onUpdate, onDelete }: QuestionEditorProps) {
  const typeInfo = getQuestionTypeInfo(question.type)

  const addOption = () => {
    const options = question.options || []
    onUpdate({ options: [...options, `אפשרות ${options.length + 1}`] })
  }

  const updateOption = (index: number, value: string) => {
    const options = [...(question.options || [])]
    options[index] = value
    onUpdate({ options })
  }

  const deleteOption = (index: number) => {
    const options = (question.options || []).filter((_, i) => i !== index)
    onUpdate({ options })
  }

  return (
    <div className="p-4 space-y-6">
      {/* Question Type Badge */}
      <div className="flex items-center gap-2">
        {typeInfo && <typeInfo.icon className="w-4 h-4 text-blue-600" />}
        <span className="text-sm font-medium text-slate-600">{typeInfo?.label}</span>
      </div>

      {/* Question Title */}
      <div>
        <Label htmlFor="title" className="text-sm font-medium">שאלה</Label>
        <Textarea
          id="title"
          value={question.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="כאן כותבים את השאלה..."
          className="mt-2 resize-none"
          rows={2}
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          תיאור <span className="text-slate-400 font-normal">(לא חובה)</span>
        </Label>
        <Textarea
          id="description"
          value={question.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="אפשר להוסיף תיאור..."
          className="mt-2 resize-none"
          rows={2}
        />
      </div>

      <Separator />

      {/* Type-specific settings */}
      {(question.type === 'dropdown' || question.type === 'checkboxes') && (
        <div>
          <Label className="text-sm font-medium mb-3 block">אפשרויות</Label>
          <div className="space-y-2">
            {(question.options || []).map((option, index) => (
              <div
                key={index}
                className="flex items-center gap-2"
              >
                <div className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-slate-300" />
                </div>
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`אפשרות ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteOption(index)}
                  className="h-8 w-8 p-0"
                  disabled={(question.options?.length || 0) <= 1}
                >
                  <X className="w-4 h-4 text-slate-400" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            className="mt-3 w-full"
          >
            <Plus className="w-4 h-4 me-2" />
            הוספת אפשרות
          </Button>
        </div>
      )}

      {(question.type === 'short_text' || question.type === 'long_text' || 
        question.type === 'email' || question.type === 'phone' || 
        question.type === 'url' || question.type === 'number') && (
        <div>
          <Label htmlFor="placeholder" className="text-sm font-medium">טקסט מציין מקום</Label>
          <Input
            id="placeholder"
            value={question.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            placeholder="הטקסט שיוצג בשדה הריק..."
            className="mt-2"
          />
        </div>
      )}

      {question.type === 'rating' && (
        <div>
          <Label className="text-sm font-medium mb-3 block">סולם הדירוג</Label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="minValue" className="text-xs text-slate-500">מינימום</Label>
              <Input
                id="minValue"
                type="number"
                value={question.minValue || 1}
                onChange={(e) => onUpdate({ minValue: parseInt(e.target.value) || 1 })}
                min={1}
                max={4}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="maxValue" className="text-xs text-slate-500">מקסימום</Label>
              <Input
                id="maxValue"
                type="number"
                value={question.maxValue || 5}
                onChange={(e) => onUpdate({ maxValue: parseInt(e.target.value) || 5 })}
                min={2}
                max={10}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {question.type === 'opinion_scale' && (
        <div>
          <Label className="text-sm font-medium mb-3 block">טווח הסולם</Label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="minValue" className="text-xs text-slate-500">מינימום</Label>
              <Input
                id="minValue"
                type="number"
                value={question.minValue || 1}
                onChange={(e) => onUpdate({ minValue: parseInt(e.target.value) || 1 })}
                min={0}
                max={1}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="maxValue" className="text-xs text-slate-500">מקסימום</Label>
              <Input
                id="maxValue"
                type="number"
                value={question.maxValue || 10}
                onChange={(e) => onUpdate({ maxValue: parseInt(e.target.value) || 10 })}
                min={5}
                max={10}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {question.type === 'file_upload' && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">סוגי קבצים מותרים</Label>
            <p className="text-sm text-slate-500">אפשר להעלות תמונות וקובצי PDF</p>
          </div>
          <div>
            <Label htmlFor="maxFileSize" className="text-sm font-medium">גודל קובץ מרבי (MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={question.maxFileSize || 10}
              onChange={(e) => onUpdate({ maxFileSize: parseInt(e.target.value) || 10 })}
              min={1}
              max={25}
              className="mt-2"
            />
          </div>
        </div>
      )}

      <Separator />

      {/* Required toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">שדה חובה</Label>
          <p className="text-xs text-slate-500">חובה לענות על השאלה הזו כדי להמשיך</p>
        </div>
        <Switch
          checked={question.required}
          onCheckedChange={(checked) => onUpdate({ required: checked })}
        />
      </div>

      <Separator />

      {/* Delete button */}
      <Button
        variant="outline"
        onClick={onDelete}
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4 me-2" />
        מחיקת השאלה
      </Button>
    </div>
  )
}
