'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Form, QuestionConfig, Json } from '@/lib/database.types'
import { getTheme, getThemeCSSVariables } from '@/lib/themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, Check, ArrowRight } from 'lucide-react'
import { QuestionRenderer } from './question-renderer'
import { toast } from 'sonner'

interface FormPlayerProps {
  form: Form
  uploadTokens: Record<string, string>
}

export function FormPlayer({ form, uploadTokens }: FormPlayerProps) {
  const questions = (form.questions as QuestionConfig[]) || []
  const theme = getTheme(form.theme)
  const themeStyles = getThemeCSSVariables(theme)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Json>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [direction, setDirection] = useState(0)
  
  const isSubmittingRef = useRef(false)

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const isFirstQuestion = currentIndex === 0
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  const validateCurrentQuestion = useCallback((candidateAnswers: Record<string, Json> = answers) => {
    if (!currentQuestion) return true
    
    const answer = candidateAnswers[currentQuestion.id]
    
    if (currentQuestion.required) {
      if (answer === undefined || answer === null || answer === '') {
        setErrors(previous => ({ ...previous, [currentQuestion.id]: 'This field is required' }))
        return false
      }
      
      if (Array.isArray(answer) && answer.length === 0) {
        setErrors(previous => ({ ...previous, [currentQuestion.id]: 'Please select at least one option' }))
        return false
      }
    }

    // Type-specific validation
    if (answer && currentQuestion.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(answer))) {
        setErrors(previous => ({ ...previous, [currentQuestion.id]: 'Please enter a valid email address' }))
        return false
      }
    }

    if (answer && currentQuestion.type === 'url') {
      try {
        new URL(String(answer))
      } catch {
        setErrors(previous => ({ ...previous, [currentQuestion.id]: 'Please enter a valid URL' }))
        return false
      }
    }

    if (answer && currentQuestion.type === 'phone') {
      const phoneRegex = /^[+]?[\d\s\-().]+$/
      if (!phoneRegex.test(String(answer))) {
        setErrors(previous => ({ ...previous, [currentQuestion.id]: 'Please enter a valid phone number' }))
        return false
      }
    }

    // Clear error if valid
    setErrors(previous => {
      const nextErrors = { ...previous }
      delete nextErrors[currentQuestion.id]
      return nextErrors
    })
    return true
  }, [currentQuestion, answers])

  const handleSubmit = useCallback(async (submittedAnswers: Record<string, Json>) => {
    if (isSubmittingRef.current) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    
    const response = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: form.id, answers: submittedAnswers }),
    })

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: 'Failed to submit response' }))
      toast.error(result.error || 'Failed to submit response')
      isSubmittingRef.current = false
      setIsSubmitting(false)
    } else {
      setIsSubmitted(true)
    }
  }, [form.id])

  const goToNext = useCallback((selectedValue?: Json) => {
    const nextAnswers = selectedValue !== undefined && currentQuestion
      ? { ...answers, [currentQuestion.id]: selectedValue }
      : answers

    if (selectedValue !== undefined && currentQuestion) {
      setAnswers(nextAnswers)
    }

    if (!validateCurrentQuestion(nextAnswers)) return

    if (isLastQuestion) {
      void handleSubmit(nextAnswers)
    } else {
      setDirection(1)
      setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1))
    }
  }, [answers, currentQuestion, handleSubmit, isLastQuestion, questions.length, validateCurrentQuestion])

  const goToPrevious = useCallback(() => {
    setDirection(-1)
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const updateAnswer = (questionId: string, value: Json) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    // Clear error when user starts typing
    setErrors(previous => {
      if (!previous[questionId]) return previous
      const nextErrors = { ...previous }
      delete nextErrors[questionId]
      return nextErrors
    })
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted || isSubmitting) return
      
      if (e.key === 'Enter' && !e.shiftKey) {
        // Don't submit on enter for textarea
        if (currentQuestion?.type === 'long_text') {
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            goToNext()
          }
          return
        }
        e.preventDefault()
        goToNext()
      }
      
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault()
        goToPrevious()
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, goToNext, goToPrevious, isSubmitted, isSubmitting])

  // Scroll/wheel navigation
  useEffect(() => {
    let lastScrollTime = 0
    const scrollThreshold = 500 // ms between scroll navigations
    const deltaThreshold = 50 // minimum scroll delta to trigger navigation

    const handleWheel = (e: WheelEvent) => {
      if (isSubmitted || isSubmitting) return
      
      // Don't interfere with scrollable inputs like textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA') return
      
      const now = Date.now()
      if (now - lastScrollTime < scrollThreshold) return
      
      // Check if scroll delta is significant enough
      if (Math.abs(e.deltaY) < deltaThreshold) return
      
      if (e.deltaY > 0) {
        // Scrolling down - go to next question
        goToNext()
      } else {
        // Scrolling up - go to previous question
        goToPrevious()
      }
      
      lastScrollTime = now
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [goToNext, goToPrevious, isSubmitted, isSubmitting])

  // Thank you screen
  if (isSubmitted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-6"
        style={{ 
          ...themeStyles,
          backgroundColor: theme.backgroundColor,
          fontFamily: theme.fontFamily,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${theme.primaryColor}20` }}
          >
            <Check className="w-10 h-10" style={{ color: theme.primaryColor }} />
          </motion.div>
          <h1 
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: theme.textColor }}
          >
            {form.thank_you_message}
          </h1>
          <p 
            className="text-lg opacity-70"
            style={{ color: theme.textColor }}
          >
            Your response has been recorded.
          </p>
          
          {/* OpenForm branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <a 
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm opacity-50 hover:opacity-70 transition-opacity"
              style={{ color: theme.textColor }}
            >
              <span>Made with</span>
              <span className="font-semibold">OpenForm</span>
            </a>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // Empty form
  if (questions.length === 0) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-6"
        style={{ 
          backgroundColor: theme.backgroundColor,
          fontFamily: theme.fontFamily,
        }}
      >
        <p style={{ color: theme.textColor }} className="opacity-50">
          This form has no questions yet.
        </p>
      </div>
    )
  }

  const slideVariants = {
    enter: (direction: number) => ({
      y: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      y: direction > 0 ? -100 : 100,
      opacity: 0,
    }),
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        ...themeStyles,
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress 
          value={progress} 
          className="h-1 rounded-none"
          style={{ 
            backgroundColor: `${theme.primaryColor}20`,
          }}
          indicatorStyle={{
            backgroundColor: theme.primaryColor,
          }}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6 pt-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* Question number */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 flex items-center gap-2"
              >
                <span 
                  className="text-base font-medium"
                  style={{ color: theme.primaryColor }}
                >
                  {currentIndex + 1}
                </span>
                <ArrowRight className="w-4 h-4" style={{ color: theme.primaryColor }} />
              </motion.div>

              {/* Question */}
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3"
                style={{ color: theme.textColor }}
              >
                {currentQuestion.title || 'Untitled question'}
                {currentQuestion.required && (
                  <span style={{ color: theme.primaryColor }} className="ml-1">*</span>
                )}
              </motion.h2>

              {currentQuestion.description && (
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg md:text-xl opacity-70 mb-8"
                  style={{ color: theme.textColor }}
                >
                  {currentQuestion.description}
                </motion.p>
              )}

              {/* Answer input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-8"
              >
                <QuestionRenderer
                  question={currentQuestion}
                  uploadToken={uploadTokens[currentQuestion.id]}
                  value={answers[currentQuestion.id]}
                  onChange={(value) => updateAnswer(currentQuestion.id, value)}
                  theme={theme}
                  error={errors[currentQuestion.id]}
                  onSubmit={goToNext}
                />
              </motion.div>

              {/* Error message */}
              <AnimatePresence>
                {errors[currentQuestion.id] && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 text-sm font-medium"
                    style={{ color: '#EF4444' }}
                  >
                    {errors[currentQuestion.id]}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 flex items-center gap-4"
              >
                <Button
                  onClick={() => goToNext()}
                  disabled={isSubmitting}
                  className="h-12 px-6 text-base font-medium"
                  style={{ 
                    backgroundColor: theme.primaryColor,
                    color: theme.backgroundColor,
                  }}
                >
                  {isSubmitting ? (
                    'Submitting...'
                  ) : isLastQuestion ? (
                    <>
                      Submit
                      <Check className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      OK
                      <Check className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <span 
                  className="text-sm opacity-50"
                  style={{ color: theme.textColor }}
                >
                  press <kbd className="font-mono font-medium">Enter ↵</kbd>
                </span>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            disabled={isFirstQuestion}
            className="h-10 w-10 p-0"
            style={{ color: theme.textColor }}
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToNext()}
            disabled={isSubmitting}
            className="h-10 w-10 p-0"
            style={{ color: theme.textColor }}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>

        {/* OpenForm branding */}
        <a 
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm opacity-50 hover:opacity-70 transition-opacity"
          style={{ color: theme.textColor }}
        >
          Powered by <span className="font-semibold">OpenForm</span>
        </a>
      </footer>
    </div>
  )
}
