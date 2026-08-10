'use client'

import { useState, useRef, useCallback } from 'react'
import { QuestionConfig, ThemeConfig, Json } from '@/lib/database.types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import { Star, Upload, Check, X, FileText, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react'

interface FileUploadValue {
  uploadId: string
  name: string
  type: string
  size?: number
}

interface FileUploadQuestionProps {
  uploadToken?: string
  question: QuestionConfig
  value: FileUploadValue | null
  onChange: (value: Json) => void
  theme: ThemeConfig
}

function FileUploadQuestion({ uploadToken, question, value, onChange, theme }: FileUploadQuestionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null)

    if (!uploadToken) {
      setUploadError('העלאת קבצים לא זמינה בשאלה הזו')
      return
    }

    const maxFileSize = question.maxFileSize || 10
    if (file.size > maxFileSize * 1024 * 1024) {
      setUploadError(`הקובץ גדול מדי. הגודל המרבי הוא ${maxFileSize}MB`)
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'X-Upload-Token': uploadToken },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'ההעלאה נכשלה')
      }

      // Success - store the R2 URL
      onChange({
        uploadId: result.file.uploadId,
        name: result.file.name,
        type: result.file.type,
        size: result.file.size,
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'ההעלאה נכשלה')
    } finally {
      setIsUploading(false)
    }
  }, [onChange, question.maxFileSize, uploadToken])

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileSelect(file)
          }
          // Reset input so same file can be selected again
          e.target.value = ''
        }}
      />
      
      {value ? (
        <div 
          className="p-4 rounded-xl border-2 flex items-center gap-4"
          style={{ borderColor: theme.primaryColor }}
        >
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${theme.primaryColor}20` }}
          >
            {value.type?.startsWith('image/') ? (
              <ImageIcon className="w-6 h-6" style={{ color: theme.primaryColor }} />
            ) : (
              <FileText className="w-6 h-6" style={{ color: theme.primaryColor }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" style={{ color: theme.textColor }}>
              {value.name}
            </p>
            {value.size && (
              <p className="text-sm opacity-50" style={{ color: theme.textColor }}>
                <span dir="ltr">{(value.size / 1024).toFixed(1)} KB</span>
              </p>
            )}
          </div>
          <button
            onClick={() => onChange(null)}
            className="p-2 rounded-lg transition-colors hover:opacity-70"
            style={{ color: theme.textColor }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : isUploading ? (
        <div 
          className="w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-3"
          style={{ 
            borderColor: theme.primaryColor,
            color: theme.textColor,
          }}
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.primaryColor }} />
          <p className="font-medium">מעלה...</p>
        </div>
      ) : (
        <div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-3 transition-colors"
            style={{ 
              borderColor: uploadError ? '#EF4444' : `${theme.textColor}30`,
              color: theme.textColor,
            }}
          >
            <Upload className="w-8 h-8 opacity-50" />
            <div className="text-center">
              <p className="font-medium">העלאת קובץ</p>
              <p className="text-sm opacity-50 mt-1">
                תמונות וקובצי PDF עד {question.maxFileSize || 10}MB
              </p>
            </div>
          </motion.button>
          {uploadError && (
            <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#EF4444' }}>
              <AlertCircle className="w-4 h-4" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface QuestionRendererProps {
  uploadToken?: string
  question: QuestionConfig
  value: Json
  onChange: (value: Json) => void
  theme: ThemeConfig
  error?: string
  onSubmit: (selectedValue?: Json) => void
}

export function QuestionRenderer({ 
  uploadToken,
  question, 
  value, 
  onChange, 
  theme,
  error,
  onSubmit
}: QuestionRendererProps) {
  const [isFocused, setIsFocused] = useState(false)

  const inputStyles = {
    borderColor: error ? '#EF4444' : isFocused ? theme.primaryColor : `${theme.textColor}30`,
    color: theme.textColor,
    backgroundColor: 'transparent',
  }

  switch (question.type) {
    case 'short_text':
    case 'email':
    case 'phone':
    case 'url':
    case 'number':
      return (
        <Input
          type={question.type === 'number' ? 'number' : question.type === 'email' ? 'email' : 'text'}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={question.placeholder || 'כאן כותבים את התשובה...'}
          className="text-xl md:text-2xl h-auto py-3 px-0 border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:opacity-40"
          style={inputStyles}
          autoFocus
        />
      )

    case 'long_text':
      return (
        <Textarea
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={question.placeholder || 'כאן כותבים את התשובה...'}
          className="text-lg md:text-xl min-h-[150px] p-4 border-2 rounded-xl bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:opacity-40 resize-none"
          style={inputStyles}
          autoFocus
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="text-xl md:text-2xl h-auto py-3 px-0 border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          style={inputStyles}
          autoFocus
        />
      )

    case 'dropdown':
      return (
        <div className="space-y-3">
          {(question.options || []).map((option, index) => {
            const isSelected = value === option
            return (
              <motion.button
                key={index}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSubmit(option)
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-start transition-all"
                style={{
                  borderColor: isSelected ? theme.primaryColor : `${theme.textColor}20`,
                  backgroundColor: isSelected ? `${theme.primaryColor}10` : 'transparent',
                  color: theme.textColor,
                }}
              >
                <div 
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{ 
                    borderColor: isSelected ? theme.primaryColor : `${theme.textColor}40`,
                    backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                  }}
                >
                  {isSelected ? (
                    <Check className="w-4 h-4" style={{ color: theme.backgroundColor }} />
                  ) : (
                    <span className="text-sm font-medium" style={{ color: theme.textColor }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                  )}
                </div>
                <span className="text-lg">{option}</span>
              </motion.button>
            )
          })}
        </div>
      )

    case 'checkboxes':
      const selectedValues = Array.isArray(value) ? value : []
      return (
        <div className="space-y-3">
          {(question.options || []).map((option, index) => {
            const isSelected = selectedValues.includes(option)
            return (
              <motion.button
                key={index}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  const newValues = isSelected
                    ? selectedValues.filter(v => v !== option)
                    : [...selectedValues, option]
                  onChange(newValues)
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-start transition-all"
                style={{
                  borderColor: isSelected ? theme.primaryColor : `${theme.textColor}20`,
                  backgroundColor: isSelected ? `${theme.primaryColor}10` : 'transparent',
                  color: theme.textColor,
                }}
              >
                <div 
                  className="w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{ 
                    borderColor: isSelected ? theme.primaryColor : `${theme.textColor}40`,
                    backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                  }}
                >
                  {isSelected ? (
                    <Check className="w-4 h-4" style={{ color: theme.backgroundColor }} />
                  ) : (
                    <span className="text-sm font-medium" style={{ color: theme.textColor }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                  )}
                </div>
                <span className="text-lg">{option}</span>
              </motion.button>
            )
          })}
          <p className="text-sm opacity-50 mt-2" style={{ color: theme.textColor }}>
            אפשר לבחור יותר מאפשרות אחת
          </p>
        </div>
      )

    case 'yes_no':
      // 'Yes'/'No' are the stored answer values the API validates; only the label is translated.
      const yesNoLabels: Record<string, string> = { Yes: 'כן', No: 'לא' }
      return (
        <div className="flex gap-4">
          {['Yes', 'No'].map((option) => {
            const isSelected = value === option
            return (
              <motion.button
                key={option}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSubmit(option)
                }}
                className="flex-1 flex items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all"
                style={{
                  borderColor: isSelected ? theme.primaryColor : `${theme.textColor}20`,
                  backgroundColor: isSelected ? `${theme.primaryColor}10` : 'transparent',
                  color: theme.textColor,
                }}
              >
                <div 
                  className="w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{ 
                    borderColor: isSelected ? theme.primaryColor : `${theme.textColor}40`,
                    backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                  }}
                >
                  {isSelected ? (
                    <Check className="w-4 h-4" style={{ color: theme.backgroundColor }} />
                  ) : (
                    <span className="text-sm font-medium" style={{ color: theme.textColor }}>
                      {yesNoLabels[option][0]}
                    </span>
                  )}
                </div>
                <span className="text-xl font-medium">{yesNoLabels[option]}</span>
              </motion.button>
            )
          })}
        </div>
      )

    case 'rating':
      // Render the configured range; the server rejects ratings below minValue,
      // so 1-based stars would let respondents pick an unsubmittable value.
      const minRating = question.minValue || 1
      const maxRating = question.maxValue || 5
      const currentRating = typeof value === 'number' ? value : 0
      return (
        <div className="flex gap-2">
          {Array.from({ length: maxRating - minRating + 1 }).map((_, index) => {
            const starValue = minRating + index
            const isActive = starValue <= currentRating
            return (
              <motion.button
                key={starValue}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onChange(starValue)}
                className="p-1"
              >
                <Star
                  className="w-10 h-10 md:w-12 md:h-12 transition-colors"
                  fill={isActive ? theme.primaryColor : 'transparent'}
                  style={{ 
                    color: isActive ? theme.primaryColor : `${theme.textColor}30`,
                  }}
                />
              </motion.button>
            )
          })}
        </div>
      )

    case 'opinion_scale':
      const minScale = question.minValue || 1
      const maxScale = question.maxValue || 10
      const scaleValue = typeof value === 'number' ? value : null
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxScale - minScale + 1 }).map((_, index) => {
            const num = minScale + index
            const isSelected = scaleValue === num
            return (
              <motion.button
                key={num}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSubmit(num)
                }}
                className="w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 flex items-center justify-center text-lg font-medium transition-all"
                style={{
                  borderColor: isSelected ? theme.primaryColor : `${theme.textColor}30`,
                  backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                  color: isSelected ? theme.backgroundColor : theme.textColor,
                }}
              >
                {num}
              </motion.button>
            )
          })}
        </div>
      )

    case 'file_upload':
      return (
        <FileUploadQuestion
          uploadToken={uploadToken}
          question={question}
          value={value as FileUploadValue | null}
          onChange={onChange}
          theme={theme}
        />
      )

    default:
      return (
        <p style={{ color: theme.textColor }} className="opacity-50">
          סוג שאלה שאינו נתמך: {question.type}
        </p>
      )
  }
}
