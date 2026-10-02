import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { themeList } from '@/lib/themes'
import { questionTypes } from '@/lib/questions'
import { ArrowRight, Keyboard, Palette, Shield, Smartphone, Download, Zap } from 'lucide-react'

async function getUser() {
  try {
    // Only import and use Supabase if env vars are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return null
    }
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

const features = [
  {
    icon: Zap,
    title: 'One question at a time',
    description: 'A focused, conversational flow that keeps respondents moving instead of scrolling a wall of fields.',
  },
  {
    icon: Keyboard,
    title: 'Keyboard first',
    description: 'Enter to continue, letter keys to pick options, arrows to move around. No mouse required.',
  },
  {
    icon: Palette,
    title: 'Six polished themes',
    description: 'Pick a look in one click and preview it live while you build.',
  },
  {
    icon: Smartphone,
    title: 'Mobile ready',
    description: 'Large tap targets and native inputs make forms just as pleasant on a phone.',
  },
  {
    icon: Download,
    title: 'Your data, exportable',
    description: 'Search responses, preview uploaded files, and export everything to CSV.',
  },
  {
    icon: Shield,
    title: 'Private by default',
    description: 'Row-level security means only you can see the responses to your forms.',
  },
]

export default async function HomePage() {
  const user = await getUser()
  const ctaHref = user ? '/dashboard' : '/login'
  const previewTheme = themeList.find((t) => t.id === 'midnight') ?? themeList[0]

  return (
    <div className="min-h-screen w-full bg-white text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Link href="/dashboard">
                  Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                  <Link href="/login">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 sm:pt-40 pb-16 px-4 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(37, 99, 235, 0.10) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <a
            href="https://github.com/dabit3/openform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs transition-colors hover:border-slate-300 hover:text-slate-900 mb-8"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Free &amp; open source
            <ArrowRight className="w-3 h-3" />
          </a>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05] text-balance mb-6">
            Forms that feel <span className="text-blue-600">human</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto mb-10 leading-relaxed text-pretty">
            Build beautiful, conversational forms people actually enjoy filling out. One question at a time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base bg-blue-600 hover:bg-blue-700 shadow-sm w-full sm:w-auto">
              <Link href={ctaHref}>
                {user ? 'Go to dashboard' : 'Start building for free'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base w-full sm:w-auto">
              <Link href="#features">See features</Link>
            </Button>
          </div>
        </div>

        {/* Product preview */}
        <div className="relative max-w-4xl mx-auto mt-16 sm:mt-20">
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              </div>
              <div className="mx-auto rounded-md bg-slate-100 px-3 py-0.5 text-[11px] font-medium text-slate-500">
                openform.app/f/feedback
              </div>
              <div className="w-10" />
            </div>
            <div
              className="relative py-10 sm:py-0 sm:aspect-video rounded-xl overflow-hidden flex items-center"
              style={{ backgroundColor: previewTheme.backgroundColor, color: previewTheme.textColor, fontFamily: previewTheme.fontFamily }}
            >
              <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: `${previewTheme.primaryColor}25` }}>
                <div className="h-full w-2/5" style={{ backgroundColor: previewTheme.primaryColor }} />
              </div>
              <div className="w-full max-w-lg mx-auto px-6 sm:px-10 text-left">
                <div className="flex gap-3">
                  <span className="pt-1 text-sm font-semibold" style={{ color: previewTheme.primaryColor }}>2 →</span>
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-3xl font-semibold tracking-tight mb-6">
                      How did you hear about us?
                    </h3>
                    <div className="grid gap-2">
                      {['A friend', 'Social media', 'Search engine'].map((option, i) => (
                        <div
                          key={option}
                          className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm sm:text-base"
                          style={{
                            borderColor: i === 1 ? previewTheme.primaryColor : `${previewTheme.textColor}25`,
                            backgroundColor: i === 1 ? `${previewTheme.primaryColor}20` : `${previewTheme.textColor}08`,
                          }}
                        >
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold"
                            style={{
                              borderColor: i === 1 ? previewTheme.primaryColor : `${previewTheme.textColor}40`,
                              backgroundColor: i === 1 ? previewTheme.primaryColor : 'transparent',
                              color: i === 1 ? previewTheme.backgroundColor : previewTheme.textColor,
                            }}
                          >
                            {String.fromCharCode(65 + i)}
                          </span>
                          {option}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4 text-balance">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-lg text-slate-600">
              A small, fast form builder focused on the experience of the person filling it out.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white p-6 sm:p-8">
                <div className="w-10 h-10 rounded-lg bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center mb-5">
                  <feature.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Themes */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">Pick a look in one click</h2>
            <p className="text-lg text-slate-600">Every theme comes with its own palette and typeface.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {themeList.map((theme) => (
              <div
                key={theme.id}
                className="rounded-xl p-5 border border-black/5 shadow-xs"
                style={{ backgroundColor: theme.backgroundColor, color: theme.textColor, fontFamily: theme.fontFamily }}
              >
                <div className="text-xs font-semibold mb-2" style={{ color: theme.primaryColor }}>1 →</div>
                <div className="text-lg font-semibold mb-4">{theme.name}</div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-md px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
                  >
                    OK
                  </span>
                  <span className="text-[11px] opacity-60">press Enter ↵</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Question Types */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
              {questionTypes.length} question types
            </h2>
            <p className="text-lg text-slate-600">From short answers to ratings and file uploads.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {questionTypes.map((qt) => (
              <div key={qt.type} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <qt.icon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700">{qt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto rounded-3xl bg-slate-900 px-6 py-14 sm:p-16 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">Ready to build your first form?</h2>
          <p className="text-slate-400 mb-8 text-lg">It takes about a minute. No credit card, no limits.</p>
          <Button asChild size="lg" className="h-12 px-6 text-base bg-white text-slate-900 hover:bg-slate-100">
            <Link href={ctaHref}>
              {user ? 'Go to dashboard' : 'Get started for free'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} OpenForm. Open source and free forever.</p>
          <a
            href="https://github.com/dabit3/openform"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-900 text-sm transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
