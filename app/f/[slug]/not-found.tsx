import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function FormNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37, 99, 235, 0.08) 0%, transparent 50%), linear-gradient(to bottom, #f8faff 0%, #ffffff 100%)",
        }}
      />
      <div className="text-center max-w-md relative z-10">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
          <FileQuestion className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">הטופס לא נמצא</h1>
        <p className="text-slate-600 mb-8">
          הטופס הזה לא קיים או שהוא כבר לא זמין.
        </p>
        <Link href="/">
          <Button className="bg-blue-600 hover:bg-blue-700">חזרה לדף הבית</Button>
        </Link>
      </div>
    </div>
  )
}
