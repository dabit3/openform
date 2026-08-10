import { Json, QuestionConfig } from '@/lib/database.types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Allow a leading '+' , digit, or '(' so common formats like (0)3-1234567 pass.
// Exported so the client player validates with the exact same rule (no dead-ends).
export const PHONE_PATTERN = /^[+]?[(\d][\d\s\-().]{2,30}$/

// Thrown for respondent-facing validation failures. The API route returns its
// message as a 400; anything else is an internal 500 (never leaked verbatim).
export class ResponseValidationError extends Error {}

export interface UploadReference {
  questionId: string
  uploadId: string
}

export interface ValidatedResponse {
  answers: Record<string, Json>
  uploadReferences: UploadReference[]
}

function invalid(message: string): never {
  throw new ResponseValidationError(message)
}

function stringAnswer(value: Json, maxLength: number): string {
  if (typeof value !== 'string') invalid('נדרשת תשובת טקסט')
  const normalized = value.trim()
  if (normalized.length > maxLength) invalid(`התשובה ארוכה מדי, עד ${maxLength} תווים`)
  return normalized
}

function numericAnswer(value: Json): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) invalid('נדרש מספר')
  return number
}

export function validateResponseAnswers(
  questions: QuestionConfig[],
  candidate: unknown
): ValidatedResponse {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    invalid('מבנה התשובות לא תקין')
  }

  const supplied = candidate as Record<string, Json>
  const knownQuestionIds = new Set(questions.map(question => question.id))
  if (Object.keys(supplied).some(questionId => !knownQuestionIds.has(questionId))) {
    invalid('התשובה מכילה שאלה שלא קיימת בטופס')
  }

  const answers: Record<string, Json> = {}
  const uploadReferences: UploadReference[] = []

  for (const question of questions) {
    const value = supplied[question.id]
    const isEmpty = value === undefined || value === null || value === ''
      || (Array.isArray(value) && value.length === 0)

    if (isEmpty) {
      if (question.required) invalid(`חסרה תשובה לשאלת חובה: ${question.title}`)
      continue
    }

    switch (question.type) {
      case 'short_text':
        answers[question.id] = stringAnswer(value, 1000)
        break
      case 'long_text':
        answers[question.id] = stringAnswer(value, 10000)
        break
      case 'email': {
        const email = stringAnswer(value, 320)
        if (!EMAIL_PATTERN.test(email)) invalid('כתובת האימייל לא תקינה')
        answers[question.id] = email
        break
      }
      case 'phone': {
        const phone = stringAnswer(value, 32)
        if (!PHONE_PATTERN.test(phone)) invalid('מספר הטלפון לא תקין')
        answers[question.id] = phone
        break
      }
      case 'url': {
        const urlString = stringAnswer(value, 2048)
        let url: URL
        try {
          url = new URL(urlString)
        } catch {
          invalid('כתובת האתר לא תקינה')
        }
        if (!['http:', 'https:'].includes(url.protocol)) invalid('הכתובת חייבת להתחיל ב-http או ב-https')
        answers[question.id] = url.toString()
        break
      }
      case 'date': {
        const date = stringAnswer(value, 10)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
          invalid('התאריך לא תקין')
        }
        answers[question.id] = date
        break
      }
      case 'number': {
        const number = numericAnswer(value)
        if (question.minValue !== undefined && number < question.minValue) invalid('המספר קטן מהערך המזערי')
        if (question.maxValue !== undefined && number > question.maxValue) invalid('המספר גדול מהערך המרבי')
        answers[question.id] = number
        break
      }
      case 'dropdown': {
        const option = stringAnswer(value, 1000)
        if (!question.options?.includes(option)) invalid('האפשרות שנבחרה לא תקינה')
        answers[question.id] = option
        break
      }
      case 'checkboxes': {
        if (!Array.isArray(value) || value.length > (question.options?.length || 0)) {
          invalid('הבחירה לא תקינה')
        }
        const selections = value.map(item => {
          if (typeof item !== 'string' || !question.options?.includes(item)) invalid('אחת האפשרויות שנבחרו לא תקינה')
          return item
        })
        if (new Set(selections).size !== selections.length) invalid('נבחרה אותה אפשרות יותר מפעם אחת')
        answers[question.id] = selections
        break
      }
      case 'yes_no':
        if (value !== 'Yes' && value !== 'No') invalid('תשובת כן/לא לא תקינה')
        answers[question.id] = value
        break
      case 'rating': {
        const rating = numericAnswer(value)
        const minimum = question.minValue || 1
        const maximum = question.maxValue || 5
        if (!Number.isInteger(rating) || rating < minimum || rating > maximum) invalid('הדירוג לא תקין')
        answers[question.id] = rating
        break
      }
      case 'opinion_scale': {
        const scale = numericAnswer(value)
        const minimum = question.minValue || 1
        const maximum = question.maxValue || 10
        if (!Number.isInteger(scale) || scale < minimum || scale > maximum) invalid('הערך בסולם לא תקין')
        answers[question.id] = scale
        break
      }
      case 'file_upload': {
        if (typeof value !== 'object' || Array.isArray(value)) invalid('הקובץ שהועלה לא תקין')
        const uploadId = (value as Record<string, Json | undefined>).uploadId
        if (typeof uploadId !== 'string' || !UUID_PATTERN.test(uploadId)) invalid('מזהה הקובץ לא תקין')
        uploadReferences.push({ questionId: question.id, uploadId })
        answers[question.id] = { uploadId }
        break
      }
    }
  }

  return { answers, uploadReferences }
}
