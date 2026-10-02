'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Form, QuestionConfig, Json } from '@/lib/database.types'
import { getTheme, getThemeCSSVariables } from '@/lib/themes'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronUp, ChevronDown, Check, ArrowRight, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { QuestionRenderer } from './question-renderer'
import { toast } from 'sonner'

const ERROR_COLOR = '#EF4444'
const AUTO_ADVANCE_DELAY = 350

type Answers = Record<string, Json>

interface FormPlayerProps {
  form: Pick<Form, 'id' | 'title' | 'description' | 'questions' | 'theme' | 'thank_you_message'>
  /** Preview mode never writes a response and offers a restart on the thank-you screen. */
  preview?: boolean
}

function isEmptyAnswer(answer: Json | undefined) {
  if (answer === undefined || answer === null) return true
  if (typeof answer === 'string') return answer.trim() === ''
  if (Array.isArray(answer)) return answer.length === 0
  return false
}

function validateAnswer(question: QuestionConfig, answer: Json | undefined): string | null {
  if (isEmptyAnswer(answer)) {
    if (!question.required) return null
    return question.type === 'checkboxes' ? 'Please select at least one option' : 'Please fill this in'
  }

  const text = typeof answer === 'string' ? answer.trim() : ''

  switch (question.type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? null : 'Hmm, that email doesn’t look right'
    case 'url':
      try {
        const url = new URL(/^[a-z][a-z\d+\-.]*:\/\//i.test(text) ? text : `https://${text}`)
        return url.hostname.includes('.') ? null : 'Please enter a valid URL'
      } catch {
        return 'Please enter a valid URL'
      }
    case 'phone':
      return /^[+]?[\d\s\-().]{6,}$/.test(text) ? null : 'Please enter a valid phone number'
    case 'number':
      return Number.isFinite(Number(text)) ? null : 'Please enter a number'
    default:
      return null
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function FormPlayer({ form, preview = false }: FormPlayerProps) {
  const questions = useMemo(() => (form.questions as QuestionConfig[]) || [], [form.questions])
  const theme = getTheme(form.theme)
  const themeStyles = getThemeCSSVariables(theme)
  const reduceMotion = useReducedMotion()

  const [hasStarted, setHasStarted] = useState(!form.description)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState(1)

  // Refs keep keyboard/wheel handlers and delayed auto-advance in sync with the latest state.
  const answersRef = useRef<Answers>({})
  const indexRef = useRef(0)
  const busyRef = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const answeredCount = questions.filter((q) => !isEmptyAnswer(answers[q.id])).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
  }, [])

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, questions.length - 1))
    if (clamped === indexRef.current) return
    setDirection(clamped > indexRef.current ? 1 : -1)
    indexRef.current = clamped
    setCurrentIndex(clamped)
    setError(null)
  }, [questions.length])

  const submit = useCallback(async () => {
    const firstInvalid = questions.findIndex((q) => validateAnswer(q, answersRef.current[q.id]))
    if (firstInvalid !== -1) {
      goTo(firstInvalid)
      setError(validateAnswer(questions[firstInvalid], answersRef.current[questions[firstInvalid].id]))
      return
    }

    if (preview) {
      setIsSubmitted(true)
      return
    }

    busyRef.current = true
    setIsSubmitting(true)
    const { error: insertError } = await createClient()
      .from('responses')
      .insert({ form_id: form.id, answers: answersRef.current } as never)
    busyRef.current = false
    setIsSubmitting(false)

    if (insertError) {
      toast.error('Couldn’t submit your response. Please try again.')
    } else {
      setIsSubmitted(true)
    }
  }, [form.id, goTo, preview, questions])

  const goNext = useCallback(() => {
    if (busyRef.current) return
    const question = questions[indexRef.current]
    if (!question) return

    const validationError = validateAnswer(question, answersRef.current[question.id])
    if (validationError) {
      setError(validationError)
      return
    }

    if (indexRef.current === questions.length - 1) {
      submit()
    } else {
      goTo(indexRef.current + 1)
    }
  }, [goTo, questions, submit])

  const goPrevious = useCallback(() => {
    if (busyRef.current) return
    goTo(indexRef.current - 1)
  }, [goTo])

  const updateAnswer = useCallback((questionId: string, value: Json) => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    answersRef.current = { ...answersRef.current, [questionId]: value }
    setAnswers(answersRef.current)
    setError(null)
  }, [])

  const selectAndAdvance = useCallback((questionId: string, value: Json) => {
    updateAnswer(questionId, value)
    advanceTimerRef.current = setTimeout(goNext, AUTO_ADVANCE_DELAY)
  }, [goNext, updateAnswer])

  const start = useCallback(() => setHasStarted(true), [])

  const restart = () => {
    answersRef.current = {}
    indexRef.current = 0
    setAnswers({})
    setCurrentIndex(0)
    setError(null)
    setIsSubmitted(false)
    setHasStarted(!form.description)
  }

  // Keyboard navigation
  useEffect(() => {
    if (isSubmitted) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey) return

      if (!hasStarted) {
        if (e.key === 'Enter') {
          e.preventDefault()
          start()
        }
        return
      }

      const question = questions[indexRef.current]
      if (!question) return
      const typing = isTypingTarget(e.target)

      if (e.key === 'Enter') {
        // Shift+Enter inserts a line break in long text answers
        if (e.shiftKey && question.type === 'long_text') return
        // Let focused buttons and links handle Enter natively
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return
        e.preventDefault()
        goNext()
        return
      }

      if (typing || e.metaKey || e.ctrlKey) return

      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goPrevious()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        goNext()
        return
      }

      // Letter/number shortcuts for choice questions
      const key = e.key.toUpperCase()
      const options = question.options || []
      const currentAnswer = answersRef.current[question.id]

      if (question.type === 'dropdown' || question.type === 'checkboxes') {
        const optionIndex = key.length === 1 ? key.charCodeAt(0) - 65 : -1
        const option = options[optionIndex]
        if (option === undefined) return
        e.preventDefault()
        if (question.type === 'dropdown') {
          selectAndAdvance(question.id, option)
        } else {
          const selected = Array.isArray(currentAnswer) ? currentAnswer : []
          updateAnswer(
            question.id,
            selected.includes(option) ? selected.filter((v) => v !== option) : [...selected, option]
          )
        }
      } else if (question.type === 'yes_no' && (key === 'Y' || key === 'N')) {
        e.preventDefault()
        selectAndAdvance(question.id, key === 'Y' ? 'Yes' : 'No')
      } else if (question.type === 'rating' || question.type === 'opinion_scale') {
        if (!/^\d$/.test(key)) return
        const num = Number(key)
        const min = question.type === 'rating' ? 1 : (question.minValue ?? 1)
        const max = question.maxValue ?? (question.type === 'rating' ? 5 : 10)
        if (num < min || num > max) return
        e.preventDefault()
        selectAndAdvance(question.id, num)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrevious, hasStarted, isSubmitted, questions, selectAndAdvance, start, updateAnswer])

  // Wheel navigation
  useEffect(() => {
    if (isSubmitted || !hasStarted) return
    let lastScrollTime = 0

    const handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return
      const now = Date.now()
      if (now - lastScrollTime < 700 || Math.abs(e.deltaY) < 40) return
      lastScrollTime = now
      if (e.deltaY > 0) goNext()
      else goPrevious()
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [goNext, goPrevious, hasStarted, isSubmitted])

  const rootStyle = {
    ...themeStyles,
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
  }

  const primaryButtonStyle = {
    backgroundColor: theme.primaryColor,
    color: theme.backgroundColor,
    ['--tw-ring-color' as string]: theme.primaryColor,
    ['--tw-ring-offset-color' as string]: theme.backgroundColor,
  }
  const primaryButtonClass =
    'inline-flex items-center gap-2 h-12 px-6 rounded-xl text-base font-semibold shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

  const branding = (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-opacity opacity-60 hover:opacity-100"
      style={{ backgroundColor: `${theme.textColor}0D`, color: theme.textColor }}
    >
      Made with <span className="font-semibold">OpenForm</span>
    </a>
  )

  const previewBadge = preview && (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
      style={{ backgroundColor: `${theme.textColor}14`, color: theme.textColor }}
    >
      Preview
    </div>
  )

  // Thank-you screen
  if (isSubmitted) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6" style={rootStyle}>
        {previewBadge}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-lg"
        >
          <motion.div
            initial={{ scale: reduceMotion ? 1 : 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 15 }}
            className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${theme.primaryColor}20` }}
          >
            <Check className="w-10 h-10" strokeWidth={2.5} style={{ color: theme.primaryColor }} />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-balance">
            {form.thank_you_message || 'Thank you for your response!'}
          </h1>
          <p className="text-lg opacity-70">
            {preview ? 'This is a preview, so no response was recorded.' : 'Your response has been recorded.'}
          </p>
          {preview && (
            <button type="button" onClick={restart} className={`${primaryButtonClass} mt-8`} style={primaryButtonStyle}>
              <RotateCcw className="w-4 h-4" />
              Restart preview
            </button>
          )}
        </motion.div>
        <div className="fixed bottom-5">{branding}</div>
      </div>
    )
  }

  // Empty form
  if (questions.length === 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6" style={rootStyle}>
        {previewBadge}
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{form.title}</h1>
          <p className="opacity-60">This form doesn’t have any questions yet.</p>
        </div>
      </div>
    )
  }

  // Welcome screen (shown when the form has a description)
  if (!hasStarted) {
    const minutes = Math.max(1, Math.round(questions.length * 0.25))
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6" style={rootStyle}>
        {previewBadge}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-balance mb-4">{form.title}</h1>
          <p className="text-lg md:text-xl opacity-70 whitespace-pre-line mb-10">{form.description}</p>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={start} className={primaryButtonClass} style={primaryButtonStyle} autoFocus>
              Start
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-sm opacity-60 hidden sm:inline">
              press <kbd className="font-semibold font-[inherit]">Enter ↵</kbd>
            </span>
          </div>
          <p className="mt-6 text-sm opacity-50">
            {questions.length} question{questions.length === 1 ? '' : 's'} · Takes about {minutes} min
          </p>
        </motion.div>
        <div className="fixed bottom-5">{branding}</div>
      </div>
    )
  }

  const offset = reduceMotion ? 0 : 48
  const slideVariants = {
    enter: (dir: number) => ({ y: dir > 0 ? offset : -offset, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (dir: number) => ({ y: dir > 0 ? -offset : offset, opacity: 0 }),
  }

  const hint =
    currentQuestion.type === 'long_text' ? (
      <>
        <kbd className="font-semibold font-[inherit]">Shift ⇧ + Enter ↵</kbd> for a new line
      </>
    ) : (
      <>
        press <kbd className="font-semibold font-[inherit]">Enter ↵</kbd>
      </>
    )

  return (
    <div className="min-h-dvh flex flex-col" style={rootStyle}>
      {/* Progress bar */}
      <div
        className="fixed top-0 inset-x-0 z-50 h-1"
        style={{ backgroundColor: `${theme.primaryColor}20` }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form progress"
      >
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: theme.primaryColor }}
        />
      </div>
      {previewBadge}

      <main className="flex-1 flex items-center justify-center px-6 pt-16 pb-28">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex gap-3 md:gap-4">
                <div
                  className="flex self-start items-center gap-1 pt-1.5 md:pt-2.5 shrink-0 text-sm md:text-base font-semibold"
                  style={{ color: theme.primaryColor }}
                  aria-hidden
                >
                  {currentIndex + 1}
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug text-balance">
                    {currentQuestion.title || 'Untitled question'}
                    {currentQuestion.required && (
                      <span style={{ color: theme.primaryColor }} className="ml-1" aria-label="required">*</span>
                    )}
                  </h2>

                  {currentQuestion.description && (
                    <p className="mt-2 text-base md:text-lg opacity-65 whitespace-pre-line">
                      {currentQuestion.description}
                    </p>
                  )}

                  <div className="mt-8">
                    <QuestionRenderer
                      question={currentQuestion}
                      value={answers[currentQuestion.id]}
                      onChange={(value) => updateAnswer(currentQuestion.id, value)}
                      onSelect={(value) => selectAndAdvance(currentQuestion.id, value)}
                      theme={theme}
                      error={error ?? undefined}
                    />
                  </div>

                  <div className="min-h-[2.5rem]">
                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          role="alert"
                          className="mt-4 inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md"
                          style={{ color: ERROR_COLOR, backgroundColor: `${ERROR_COLOR}14` }}
                        >
                          <AlertCircle className="w-4 h-4" />
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={isSubmitting}
                      className={primaryButtonClass}
                      style={primaryButtonStyle}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting
                        </>
                      ) : isLastQuestion ? (
                        <>
                          Submit
                          <Check className="w-4 h-4" strokeWidth={3} />
                        </>
                      ) : (
                        <>
                          OK
                          <Check className="w-4 h-4" strokeWidth={3} />
                        </>
                      )}
                    </button>
                    <span className="text-sm opacity-55 hidden sm:inline">{hint}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="fixed bottom-0 inset-x-0 px-4 py-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">{branding}</div>
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="text-xs font-medium opacity-60 tabular-nums">
            {currentIndex + 1} / {questions.length}
          </span>
          <div className="flex rounded-lg overflow-hidden shadow-sm" style={{ backgroundColor: theme.primaryColor }}>
            <button
              type="button"
              onClick={goPrevious}
              disabled={currentIndex === 0 || isSubmitting}
              aria-label="Previous question"
              className="h-9 w-10 flex items-center justify-center transition-opacity hover:brightness-110 disabled:opacity-40"
              style={{ color: theme.backgroundColor }}
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-px" style={{ backgroundColor: `${theme.backgroundColor}40` }} />
            <button
              type="button"
              onClick={goNext}
              disabled={isSubmitting}
              aria-label="Next question"
              className="h-9 w-10 flex items-center justify-center transition-opacity hover:brightness-110 disabled:opacity-40"
              style={{ color: theme.backgroundColor }}
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
