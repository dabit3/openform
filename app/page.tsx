import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, Sparkles, Zap, Shield, Palette } from 'lucide-react'

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

export default async function HomePage() {
  const user = await getUser()

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Sophisticated Blue Gradient Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 100% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 80%, rgba(14, 165, 233, 0.06) 0%, transparent 50%), linear-gradient(to bottom, #ffffff 0%, #f8faff 100%)",
        }}
      />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232563eb' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Navigation */}
      <nav className="fixed top-0 start-0 end-0 z-50">
        <div 
          className="absolute inset-0 h-28 backdrop-blur-md"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.92) 70%, rgba(255,255,255,0) 100%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo href="/" />
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/30 hover:-translate-y-0.5">
                  לוח הבקרה
                  <ArrowLeft className="ms-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                    התחברות
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/30 hover:-translate-y-0.5">
                    התחל בחינם
                    <ArrowLeft className="ms-2 w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 border border-blue-100">
            <Sparkles className="w-4 h-4" />
            חינם ובקוד פתוח
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">
            טפסים שמרגישים{' '}
            <span className="text-blue-600">
              אנושיים
            </span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            בונים טפסים יפים שאנשים באמת רוצים למלא.
            שאלה אחת בכל פעם, בדיוק כמו שיחה.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/25 transition-all hover:shadow-blue-600/35 hover:-translate-y-0.5">
                יצירת טופס בחינם
                <ArrowLeft className="ms-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-slate-300 hover:border-slate-400 hover:bg-slate-50">
                איך זה עובד
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/10 border border-slate-200/80 bg-white">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              </div>
              <div className="flex-1 flex justify-center">
                <div dir="ltr" className="px-4 py-1 bg-white rounded-md text-xs text-slate-500 font-medium">
                  openform.app/your-form
                </div>
              </div>
            </div>
            <div className="aspect-video bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 flex items-center justify-center relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl"></div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-lg text-center border border-white/20">
                <h3 className="text-3xl font-bold text-white mb-4">איך קוראים לך?</h3>
                <div className="bg-white/20 rounded-lg h-14 flex items-center px-4 border border-white/10">
                  <span className="text-white/60 text-lg">כתוב כאן את התשובה...</span>
                </div>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <span className="text-white/60 text-sm">לחץ על</span>
                  <kbd dir="ltr" className="px-3 py-1 bg-white/20 rounded text-white text-sm font-medium border border-white/10">Enter ↵</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              כל מה שצריך כדי לבנות טפסים מעולים
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              כלים חזקים שהופכים בניית טפסים למשחק ילדים
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100/60 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">שאלה אחת בכל פעם</h3>
              <p className="text-slate-600">
                השאלות מופיעות אחת אחרי השנייה, בלי הסחות דעת. ככה קל יותר להתרכז ולהגיע עד הסוף.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-gradient-to-br from-sky-50 to-white border border-sky-100/60 hover:shadow-lg hover:shadow-sky-100/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
                <Palette className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">ערכות עיצוב מרהיבות</h3>
              <p className="text-slate-600">
                אפשר לבחור מתוך ערכות עיצוב מוכנות שגורמות לטפסים שלך להיראות מקצועיים ומותאמים למותג.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/60 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">פרטיות קודם כל</h3>
              <p className="text-slate-600">
                המידע נשאר שלך. אפשר לייצא את התשובות בכל רגע ולמחוק אותן מתי שתרצה.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Question Types */}
      <section className="relative z-10 py-20 px-6 bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              13 סוגי שאלות לבחירה
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              מטקסט פשוט ועד העלאת קבצים, יש כאן הכול
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              'טקסט קצר', 'טקסט ארוך', 'רשימה נפתחת', 'תיבות סימון',
              'אימייל', 'טלפון', 'מספר', 'תאריך', 'דירוג', 'סולם דעות',
              'כן/לא', 'העלאת קובץ', 'כתובת אתר'
            ].map((type) => (
              <span
                key={type}
                className="px-4 py-2 bg-white rounded-full border border-slate-200 text-slate-700 text-sm font-medium shadow-sm hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-default"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 rounded-3xl p-12 md:p-16 text-white relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4 relative">
              מוכן ליצור את הטופס הראשון שלך?
            </h2>
            <p className="text-lg text-blue-100 mb-8 relative">
              אלפי אנשים כבר אוספים תשובות עם OpenForm.
            </p>
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg bg-white text-blue-600 hover:bg-blue-50 shadow-xl shadow-blue-900/20 relative transition-all hover:-translate-y-0.5">
                התחל בחינם
                <ArrowLeft className="ms-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            © 2026 OpenForm. קוד פתוח, חינם לתמיד.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://github.com" className="text-slate-500 hover:text-slate-700 text-sm transition-colors">
              GitHub
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-700 text-sm transition-colors">
              פרטיות
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-700 text-sm transition-colors">
              תנאי שימוש
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
