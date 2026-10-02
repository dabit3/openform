'use client'

import { useState, useRef, useCallback } from 'react'
import { QuestionConfig, ThemeConfig, Json } from '@/lib/database.types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import { Star, Upload, Check, X, FileText, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react'

const ERROR_COLOR = '#EF4444'
const SERVER_MAX_FILE_MB = 10

interface FileUploadValue {
  [key: string]: Json | undefined
  name: string
  url: string
  type: string
  size?: number
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

interface FileUploadQuestionProps {
  question: QuestionConfig
  value: FileUploadValue | null
  onChange: (value: FileUploadValue | null) => void
  theme: ThemeConfig
}

function FileUploadQuestion({ question, value, onChange, theme }: FileUploadQuestionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const maxFileSize = Math.min(question.maxFileSize || SERVER_MAX_FILE_MB, SERVER_MAX_FILE_MB)

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null)

    const isAllowedType = file.type.startsWith('image/') || file.type === 'application/pdf'
    if (!isAllowedType) {
      setUploadError('Only images and PDFs are supported')
      return
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size is ${maxFileSize}MB`)
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await response.json()

      if (!response.ok) {
        // R2 not configured: fall back to base64 for local/demo usage
        if (response.status === 503 && !result.configured) {
          const url = await readAsDataURL(file)
          onChange({ name: file.name, type: file.type, size: file.size, url })
          return
        }
        throw new Error(result.error || 'Upload failed')
      }

      onChange({
        name: result.file.name,
        type: result.file.type,
        size: result.file.size,
        url: result.url,
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [maxFileSize, onChange])

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ''
        }}
      />

      {value ? (
        <div
          className="p-4 rounded-xl border-2 flex items-center gap-4"
          style={{ borderColor: theme.primaryColor, backgroundColor: `${theme.primaryColor}0D` }}
        >
          {value.type?.startsWith('image/') && value.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${theme.primaryColor}20` }}
            >
              {value.type?.startsWith('image/') ? (
                <ImageIcon className="w-6 h-6" style={{ color: theme.primaryColor }} />
              ) : (
                <FileText className="w-6 h-6" style={{ color: theme.primaryColor }} />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" style={{ color: theme.textColor }}>
              {value.name}
            </p>
            {value.size ? (
              <p className="text-sm opacity-60" style={{ color: theme.textColor }}>
                {formatFileSize(value.size)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove file"
            className="p-2 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: theme.textColor }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : isUploading ? (
        <div
          className="w-full p-10 rounded-xl border-2 border-dashed flex flex-col items-center gap-3"
          style={{ borderColor: theme.primaryColor, color: theme.textColor }}
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.primaryColor }} />
          <p className="font-medium">Uploading...</p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleFileSelect(file)
            }}
            className="w-full p-10 rounded-xl border-2 border-dashed flex flex-col items-center gap-3 transition-all hover:opacity-90"
            style={{
              borderColor: uploadError ? ERROR_COLOR : isDragging ? theme.primaryColor : `${theme.textColor}30`,
              backgroundColor: isDragging ? `${theme.primaryColor}10` : 'transparent',
              color: theme.textColor,
            }}
          >
            <Upload className="w-8 h-8" style={{ color: theme.primaryColor }} />
            <div className="text-center">
              <p className="font-medium">
                {isDragging ? 'Drop to upload' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm opacity-60 mt-1">
                Images & PDFs up to {maxFileSize}MB
              </p>
            </div>
          </button>
          {uploadError && (
            <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: ERROR_COLOR }}>
              <AlertCircle className="w-4 h-4" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ChoiceButtonProps {
  label: string
  hotkey: string
  selected: boolean
  shape: 'round' | 'square'
  theme: ThemeConfig
  onClick: () => void
  className?: string
}

function ChoiceButton({ label, hotkey, selected, shape, theme, onClick, className = '' }: ChoiceButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      animate={selected ? { scale: [1, 1.015, 1] } : { scale: 1 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      aria-pressed={selected}
      className={`group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
      style={{
        borderColor: selected ? theme.primaryColor : `${theme.textColor}20`,
        backgroundColor: selected ? `${theme.primaryColor}14` : `${theme.textColor}05`,
        color: theme.textColor,
        ['--tw-ring-color' as string]: theme.primaryColor,
        ['--tw-ring-offset-color' as string]: theme.backgroundColor,
      }}
    >
      <span
        className={`w-7 h-7 border flex items-center justify-center shrink-0 text-xs font-semibold transition-colors ${
          shape === 'round' ? 'rounded-full' : 'rounded-md'
        }`}
        style={{
          borderColor: selected ? theme.primaryColor : `${theme.textColor}35`,
          backgroundColor: selected ? theme.primaryColor : 'transparent',
          color: selected ? theme.backgroundColor : theme.textColor,
        }}
      >
        {selected ? <Check className="w-4 h-4" strokeWidth={3} /> : hotkey}
      </span>
      <span className="text-lg leading-snug">{label}</span>
    </motion.button>
  )
}

interface QuestionRendererProps {
  question: QuestionConfig
  value: Json | undefined
  onChange: (value: Json) => void
  /** Records the answer and advances to the next question (used by single-select questions). */
  onSelect: (value: Json) => void
  theme: ThemeConfig
  error?: string
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  onSelect,
  theme,
  error,
}: QuestionRendererProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)

  const inputStyles = {
    borderColor: error ? ERROR_COLOR : isFocused ? theme.primaryColor : `${theme.textColor}30`,
    color: theme.textColor,
    backgroundColor: 'transparent',
    caretColor: theme.primaryColor,
  }

  const focusHandlers = {
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  }

  switch (question.type) {
    case 'short_text':
    case 'email':
    case 'phone':
    case 'url':
    case 'number': {
      const inputType = {
        short_text: 'text',
        email: 'email',
        phone: 'tel',
        url: 'url',
        number: 'number',
      }[question.type]
      const autoComplete = {
        short_text: 'off',
        email: 'email',
        phone: 'tel',
        url: 'url',
        number: 'off',
      }[question.type]
      return (
        <Input
          type={inputType}
          inputMode={question.type === 'number' ? 'decimal' : undefined}
          autoComplete={autoComplete}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          {...focusHandlers}
          placeholder={question.placeholder || 'Type your answer here...'}
          aria-invalid={!!error}
          className="text-xl md:text-3xl h-auto py-3 px-0 border-0 border-b-2 rounded-none shadow-none bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:opacity-35 [&::-webkit-inner-spin-button]:appearance-none"
          style={inputStyles}
          autoFocus
        />
      )
    }

    case 'long_text':
      return (
        <Textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          {...focusHandlers}
          placeholder={question.placeholder || 'Type your answer here...'}
          aria-invalid={!!error}
          className="text-lg md:text-2xl min-h-[140px] max-h-[45vh] px-0 py-3 border-0 border-b-2 rounded-none shadow-none bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:opacity-35 resize-none"
          style={inputStyles}
          autoFocus
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          {...focusHandlers}
          aria-invalid={!!error}
          className="text-xl md:text-3xl h-auto py-3 px-0 border-0 border-b-2 rounded-none shadow-none bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 max-w-sm"
          style={{ ...inputStyles, colorScheme: isDarkColor(theme.backgroundColor) ? 'dark' : 'light' }}
          autoFocus
        />
      )

    case 'dropdown':
      return (
        <div className="grid gap-2.5 max-w-xl">
          {(question.options || []).map((option, index) => (
            <ChoiceButton
              key={index}
              label={option}
              hotkey={String.fromCharCode(65 + index)}
              selected={value === option}
              shape="round"
              theme={theme}
              onClick={() => onSelect(option)}
            />
          ))}
        </div>
      )

    case 'checkboxes': {
      const selectedValues = Array.isArray(value) ? value : []
      return (
        <div className="max-w-xl">
          <p className="text-sm opacity-60 mb-3" style={{ color: theme.textColor }}>
            Choose as many as you like
          </p>
          <div className="grid gap-2.5">
            {(question.options || []).map((option, index) => {
              const isSelected = selectedValues.includes(option)
              return (
                <ChoiceButton
                  key={index}
                  label={option}
                  hotkey={String.fromCharCode(65 + index)}
                  selected={isSelected}
                  shape="square"
                  theme={theme}
                  onClick={() =>
                    onChange(
                      isSelected
                        ? selectedValues.filter((v) => v !== option)
                        : [...selectedValues, option]
                    )
                  }
                />
              )
            })}
          </div>
        </div>
      )
    }

    case 'yes_no':
      return (
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {['Yes', 'No'].map((option) => (
            <ChoiceButton
              key={option}
              label={option}
              hotkey={option[0]}
              selected={value === option}
              shape="square"
              theme={theme}
              onClick={() => onSelect(option)}
            />
          ))}
        </div>
      )

    case 'rating': {
      const maxRating = question.maxValue || 5
      const currentRating = typeof value === 'number' ? value : 0
      const displayRating = hoverRating || currentRating
      return (
        <div
          className="flex flex-wrap gap-1 md:gap-2"
          role="radiogroup"
          aria-label={question.title}
          onMouseLeave={() => setHoverRating(0)}
        >
          {Array.from({ length: maxRating }).map((_, index) => {
            const starValue = index + 1
            const isActive = starValue <= displayRating
            return (
              <motion.button
                key={index}
                type="button"
                role="radio"
                aria-checked={currentRating === starValue}
                aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onMouseEnter={() => setHoverRating(starValue)}
                onClick={() => onSelect(starValue)}
                className="p-1 rounded-lg outline-none focus-visible:ring-2"
                style={{ ['--tw-ring-color' as string]: theme.primaryColor }}
              >
                <Star
                  className="w-10 h-10 md:w-12 md:h-12 transition-colors"
                  fill={isActive ? theme.primaryColor : 'transparent'}
                  strokeWidth={1.5}
                  style={{ color: isActive ? theme.primaryColor : `${theme.textColor}35` }}
                />
              </motion.button>
            )
          })}
        </div>
      )
    }

    case 'opinion_scale': {
      const minScale = question.minValue ?? 1
      const maxScale = question.maxValue ?? 10
      const scaleValue = typeof value === 'number' ? value : null
      const count = Math.max(maxScale - minScale + 1, 1)
      return (
        <div className="max-w-2xl">
          <div
            className="grid gap-1.5 md:gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.min(count, 11)}, minmax(0, 1fr))` }}
            role="radiogroup"
            aria-label={question.title}
          >
            {Array.from({ length: count }).map((_, index) => {
              const num = minScale + index
              const isSelected = scaleValue === num
              return (
                <motion.button
                  key={num}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelect(num)}
                  className="h-12 md:h-14 rounded-lg border-2 flex items-center justify-center text-base md:text-lg font-medium transition-colors outline-none focus-visible:ring-2"
                  style={{
                    borderColor: isSelected ? theme.primaryColor : `${theme.textColor}20`,
                    backgroundColor: isSelected ? theme.primaryColor : `${theme.textColor}05`,
                    color: isSelected ? theme.backgroundColor : theme.textColor,
                    ['--tw-ring-color' as string]: theme.primaryColor,
                  }}
                >
                  {num}
                </motion.button>
              )
            })}
          </div>
        </div>
      )
    }

    case 'file_upload':
      return (
        <FileUploadQuestion
          question={question}
          value={(value as FileUploadValue | null | undefined) ?? null}
          onChange={onChange}
          theme={theme}
        />
      )

    default:
      return (
        <p style={{ color: theme.textColor }} className="opacity-50">
          Unsupported question type: {question.type}
        </p>
      )
  }
}

function isDarkColor(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return false
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}
