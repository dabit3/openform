'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Logo } from '@/components/ui/logo'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loadingMethod, setLoadingMethod] = useState<'google' | 'email' | null>(null)
  const isLoading = loadingMethod !== null
  const [emailSent, setEmailSent] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoadingMethod('google')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error('Failed to sign in with Google')
      setLoadingMethod(null)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email')
      return
    }
    
    setLoadingMethod('email')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error('Failed to send magic link')
    } else {
      setEmailSent(true)
    }
    setLoadingMethod(null)
  }

  if (emailSent) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm"
        >
          <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-600 mb-6">
            We&apos;ve sent a magic link to <strong className="text-slate-900">{email}</strong>
          </p>
          <p className="text-sm text-slate-500">
            Click the link in your email to sign in. You can close this tab.
          </p>
          <button
            onClick={() => setEmailSent(false)}
            className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Use a different email
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <Logo href="/" size="lg" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-slate-900">Sign in to OpenForm</h1>
          <p className="mt-1 text-sm text-slate-500">New here? An account is created automatically.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            variant="outline"
            className="w-full h-11 text-sm font-medium border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            {loadingMethod === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
              or
            </span>
          </div>

          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11 border-slate-200"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {loadingMethod === 'email' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                'Continue with email'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          We&apos;ll email you a magic link for a password-free sign in.
        </p>
      </motion.div>
    </div>
  )
}
