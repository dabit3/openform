'use client'

import { QuestionConfig } from '@/lib/database.types'
import { ThemeConfig } from '@/lib/database.types'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

interface FormPreviewProps {
  questions: QuestionConfig[]
  theme: ThemeConfig
  selectedQuestionId: string | null
  onSelectQuestion: (id: string) => void
}

export function FormPreview({ 
  questions, 
  theme, 
  selectedQuestionId, 
  onSelectQuestion 
}: FormPreviewProps) {
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <p style={{ color: theme.textColor }} className="opacity-50">
            Add questions to see a preview
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {questions.map((question, index) => (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`
            p-6 rounded-xl cursor-pointer transition-all
            ${selectedQuestionId === question.id 
              ? 'ring-2 ring-offset-2' 
              : 'hover:opacity-80'
            }
          `}
          style={{ 
            backgroundColor: `${theme.primaryColor}10`,
            '--tw-ring-color': theme.primaryColor,
          } as React.CSSProperties}
          onClick={() => onSelectQuestion(question.id)}
        >
          <div className="mb-4">
            <span 
              className="text-sm font-medium opacity-60"
              style={{ color: theme.textColor }}
            >
              {index + 1} →
            </span>
          </div>
          
          <h3 
            className="text-xl font-semibold mb-2"
            style={{ color: theme.textColor }}
          >
            {question.title || 'Untitled question'}
            {question.required && (
              <span style={{ color: theme.primaryColor }} className="ml-1">*</span>
            )}
          </h3>
          
          {question.description && (
            <p 
              className="text-sm opacity-70 mb-4"
              style={{ color: theme.textColor }}
            >
              {question.description}
            </p>
          )}

          {/* Preview of input types */}
          <div className="mt-4">
            {(question.type === 'short_text' || question.type === 'email' || 
              question.type === 'phone' || question.type === 'url' || 
              question.type === 'number') && (
              <div 
                className="border-b-2 py-2 text-lg opacity-50"
                style={{ 
                  borderColor: theme.primaryColor,
                  color: theme.textColor 
                }}
              >
                {question.placeholder || 'Type your answer here...'}
              </div>
            )}

            {question.type === 'long_text' && (
              <div 
                className="border-2 rounded-lg p-3 opacity-50 min-h-[80px]"
                style={{ 
                  borderColor: `${theme.primaryColor}40`,
                  color: theme.textColor 
                }}
              >
                {question.placeholder || 'Type your answer here...'}
              </div>
            )}

            {question.type === 'date' && (
              <div 
                className="border-b-2 py-2 text-lg opacity-50"
                style={{ 
                  borderColor: theme.primaryColor,
                  color: theme.textColor 
                }}
              >
                MM / DD / YYYY
              </div>
            )}

            {(question.type === 'dropdown' || question.type === 'checkboxes') && (
              <div className="space-y-2">
                {(question.options || []).map((option, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 transition-colors hover:border-opacity-100"
                    style={{ 
                      borderColor: `${theme.primaryColor}40`,
                      color: theme.textColor 
                    }}
                  >
                    <div 
                      className={`w-6 h-6 rounded-${question.type === 'dropdown' ? 'full' : 'md'} border-2 flex items-center justify-center`}
                      style={{ borderColor: theme.primaryColor }}
                    >
                      <span className="text-xs font-medium" style={{ color: theme.primaryColor }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                    </div>
                    <span>{option}</span>
                  </div>
                ))}
              </div>
            )}

            {question.type === 'yes_no' && (
              <div className="flex gap-3">
                {['Yes', 'No'].map((option, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 flex-1 justify-center transition-colors"
                    style={{ 
                      borderColor: `${theme.primaryColor}40`,
                      color: theme.textColor 
                    }}
                  >
                    <div 
                      className="w-6 h-6 rounded-md border-2 flex items-center justify-center"
                      style={{ borderColor: theme.primaryColor }}
                    >
                      <span className="text-xs font-medium" style={{ color: theme.primaryColor }}>
                        {option[0]}
                      </span>
                    </div>
                    <span>{option}</span>
                  </div>
                ))}
              </div>
            )}

            {question.type === 'rating' && (
              <div className="flex gap-2">
                {Array.from({ length: question.maxValue || 5 }).map((_, i) => (
                  <Star 
                    key={i}
                    className="w-8 h-8"
                    style={{ color: `${theme.primaryColor}40` }}
                  />
                ))}
              </div>
            )}

            {question.type === 'opinion_scale' && (
              <div className="flex gap-2">
                {Array.from({ length: (question.maxValue || 10) - (question.minValue || 1) + 1 }).map((_, i) => (
                  <div 
                    key={i}
                    className="w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-medium"
                    style={{ 
                      borderColor: `${theme.primaryColor}40`,
                      color: theme.textColor 
                    }}
                  >
                    {(question.minValue || 1) + i}
                  </div>
                ))}
              </div>
            )}

            {question.type === 'file_upload' && (
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center opacity-70"
                style={{ 
                  borderColor: `${theme.primaryColor}40`,
                  color: theme.textColor 
                }}
              >
                <p className="text-sm">Drop files here or click to upload</p>
                <p className="text-xs opacity-60 mt-1">
                  Images & PDFs up to {question.maxFileSize || 10}MB
                </p>
              </div>
            )}
          </div>

          {/* Keyboard hint */}
          <div className="mt-6 flex items-center gap-2 opacity-50">
            <span className="text-xs" style={{ color: theme.textColor }}>Press</span>
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ 
                backgroundColor: `${theme.primaryColor}20`,
                color: theme.textColor 
              }}
            >
              Enter ↵
            </kbd>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

