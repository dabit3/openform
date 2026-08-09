import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedPath = searchParams.get('next')
  const candidatePath = requestedPath?.startsWith('/')
    && !requestedPath.startsWith('//')
    && !requestedPath.includes('\\')
    ? requestedPath
    : '/dashboard'
  const candidateUrl = new URL(candidatePath, origin)
  const redirectUrl = candidateUrl.origin === origin ? candidateUrl : new URL('/dashboard', origin)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
