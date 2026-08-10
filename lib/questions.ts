import { QuestionType, QuestionConfig } from './database.types'
import { 
  Type, 
  AlignLeft, 
  List, 
  CheckSquare, 
  Mail, 
  Phone, 
  Hash, 
  Calendar, 
  Star, 
  Gauge, 
  ThumbsUp, 
  Upload, 
  Link,
  LucideIcon
} from 'lucide-react'

export interface QuestionTypeInfo {
  type: QuestionType
  label: string
  description: string
  icon: LucideIcon
  defaultConfig: Partial<QuestionConfig>
}

export const questionTypes: QuestionTypeInfo[] = [
  {
    type: 'short_text',
    label: 'טקסט קצר',
    description: 'שדה טקסט בשורה אחת',
    icon: Type,
    defaultConfig: {
      placeholder: 'התשובה שלך כאן...',
    },
  },
  {
    type: 'long_text',
    label: 'טקסט ארוך',
    description: 'שדה טקסט מרובה שורות',
    icon: AlignLeft,
    defaultConfig: {
      placeholder: 'התשובה שלך כאן...',
    },
  },
  {
    type: 'dropdown',
    label: 'בחירה מרשימה',
    description: 'בחירה של אפשרות אחת מתוך רשימה',
    icon: List,
    defaultConfig: {
      options: ['אפשרות 1', 'אפשרות 2', 'אפשרות 3'],
    },
  },
  {
    type: 'checkboxes',
    label: 'בחירה מרובה',
    description: 'בחירה של כמה אפשרויות מתוך רשימה',
    icon: CheckSquare,
    defaultConfig: {
      options: ['אפשרות 1', 'אפשרות 2', 'אפשרות 3'],
    },
  },
  {
    type: 'email',
    label: 'אימייל',
    description: 'שדה לכתובת אימייל',
    icon: Mail,
    defaultConfig: {
      placeholder: 'name@example.com',
    },
  },
  {
    type: 'phone',
    label: 'טלפון',
    description: 'שדה למספר טלפון',
    icon: Phone,
    defaultConfig: {
      placeholder: '050-000-0000',
    },
  },
  {
    type: 'number',
    label: 'מספר',
    description: 'שדה למספר',
    icon: Hash,
    defaultConfig: {
      placeholder: '0',
    },
  },
  {
    type: 'date',
    label: 'תאריך',
    description: 'בחירת תאריך מלוח שנה',
    icon: Calendar,
    defaultConfig: {},
  },
  {
    type: 'rating',
    label: 'דירוג',
    description: 'דירוג בכוכבים (1-5)',
    icon: Star,
    defaultConfig: {
      minValue: 1,
      maxValue: 5,
    },
  },
  {
    type: 'opinion_scale',
    label: 'סולם דעה',
    description: 'סולם מספרי (1-10)',
    icon: Gauge,
    defaultConfig: {
      minValue: 1,
      maxValue: 10,
    },
  },
  {
    type: 'yes_no',
    label: 'כן / לא',
    description: 'בחירה פשוטה בין כן ללא',
    icon: ThumbsUp,
    defaultConfig: {},
  },
  {
    type: 'file_upload',
    label: 'העלאת קובץ',
    description: 'העלאת תמונות או קובצי PDF',
    icon: Upload,
    defaultConfig: {
      allowedFileTypes: ['image/*', 'application/pdf'],
      maxFileSize: 10, // MB
    },
  },
  {
    type: 'url',
    label: 'קישור',
    description: 'שדה לכתובת URL',
    icon: Link,
    defaultConfig: {
      placeholder: 'https://example.com',
    },
  },
]

export function getQuestionTypeInfo(type: QuestionType): QuestionTypeInfo | undefined {
  return questionTypes.find(qt => qt.type === type)
}

export function createDefaultQuestion(type: QuestionType): QuestionConfig {
  const typeInfo = getQuestionTypeInfo(type)
  const id = crypto.randomUUID()
  
  return {
    id,
    type,
    title: '',
    description: '',
    required: false,
    ...typeInfo?.defaultConfig,
  }
}

