import { Json, QuestionConfig } from '@/lib/database.types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+]?\d[\d\s\-().]{2,30}$/

export interface UploadReference {
  questionId: string
  uploadId: string
}

export interface ValidatedResponse {
  answers: Record<string, Json>
  uploadReferences: UploadReference[]
}

function invalid(message: string): never {
  throw new Error(message)
}

function stringAnswer(value: Json, maxLength: number): string {
  if (typeof value !== 'string') invalid('Expected a text answer')
  const normalized = value.trim()
  if (normalized.length > maxLength) invalid(`Answer exceeds ${maxLength} characters`)
  return normalized
}

function numericAnswer(value: Json): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) invalid('Expected a number')
  return number
}

export function validateResponseAnswers(
  questions: QuestionConfig[],
  candidate: unknown
): ValidatedResponse {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    invalid('Answers must be an object')
  }

  const supplied = candidate as Record<string, Json>
  const knownQuestionIds = new Set(questions.map(question => question.id))
  if (Object.keys(supplied).some(questionId => !knownQuestionIds.has(questionId))) {
    invalid('Response contains an unknown question')
  }

  const answers: Record<string, Json> = {}
  const uploadReferences: UploadReference[] = []

  for (const question of questions) {
    const value = supplied[question.id]
    const isEmpty = value === undefined || value === null || value === ''
      || (Array.isArray(value) && value.length === 0)

    if (isEmpty) {
      if (question.required) invalid(`A required answer is missing: ${question.title}`)
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
        if (!EMAIL_PATTERN.test(email)) invalid('Invalid email address')
        answers[question.id] = email
        break
      }
      case 'phone': {
        const phone = stringAnswer(value, 32)
        if (!PHONE_PATTERN.test(phone)) invalid('Invalid phone number')
        answers[question.id] = phone
        break
      }
      case 'url': {
        const urlString = stringAnswer(value, 2048)
        let url: URL
        try {
          url = new URL(urlString)
        } catch {
          invalid('Invalid URL')
        }
        if (!['http:', 'https:'].includes(url.protocol)) invalid('Invalid URL protocol')
        answers[question.id] = url.toString()
        break
      }
      case 'date': {
        const date = stringAnswer(value, 10)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
          invalid('Invalid date')
        }
        answers[question.id] = date
        break
      }
      case 'number': {
        const number = numericAnswer(value)
        if (question.minValue !== undefined && number < question.minValue) invalid('Number is below the minimum')
        if (question.maxValue !== undefined && number > question.maxValue) invalid('Number exceeds the maximum')
        answers[question.id] = number
        break
      }
      case 'dropdown': {
        const option = stringAnswer(value, 1000)
        if (!question.options?.includes(option)) invalid('Invalid selected option')
        answers[question.id] = option
        break
      }
      case 'checkboxes': {
        if (!Array.isArray(value) || value.length > (question.options?.length || 0)) {
          invalid('Invalid checkbox selection')
        }
        const selections = value.map(item => {
          if (typeof item !== 'string' || !question.options?.includes(item)) invalid('Invalid checkbox option')
          return item
        })
        if (new Set(selections).size !== selections.length) invalid('Duplicate checkbox option')
        answers[question.id] = selections
        break
      }
      case 'yes_no':
        if (value !== 'Yes' && value !== 'No') invalid('Invalid Yes/No answer')
        answers[question.id] = value
        break
      case 'rating': {
        const rating = numericAnswer(value)
        const minimum = question.minValue || 1
        const maximum = question.maxValue || 5
        if (!Number.isInteger(rating) || rating < minimum || rating > maximum) invalid('Invalid rating')
        answers[question.id] = rating
        break
      }
      case 'opinion_scale': {
        const scale = numericAnswer(value)
        const minimum = question.minValue || 1
        const maximum = question.maxValue || 10
        if (!Number.isInteger(scale) || scale < minimum || scale > maximum) invalid('Invalid opinion scale')
        answers[question.id] = scale
        break
      }
      case 'file_upload': {
        if (typeof value !== 'object' || Array.isArray(value)) invalid('Invalid upload')
        const uploadId = (value as Record<string, Json | undefined>).uploadId
        if (typeof uploadId !== 'string' || !UUID_PATTERN.test(uploadId)) invalid('Invalid upload ID')
        uploadReferences.push({ questionId: question.id, uploadId })
        answers[question.id] = { uploadId }
        break
      }
    }
  }

  return { answers, uploadReferences }
}
