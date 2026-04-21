import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoginButton } from './LoginButton'

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      {/* Field texture overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg, transparent, transparent 40px, #16a34a 40px, #16a34a 41px
          ), repeating-linear-gradient(
            90deg, transparent, transparent 40px, #16a34a 40px, #16a34a 41px
          )`,
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 bg-green-primary rounded-3xl flex items-center justify-center shadow-xl shadow-green-primary/30">
            <svg viewBox="0 0 40 40" className="w-12 h-12" fill="none">
              <circle cx="20" cy="20" r="18" stroke="white" strokeWidth="2"/>
              <path d="M20 8 L26 14 L24 22 L20 24 L16 22 L14 14 Z" fill="white" opacity="0.9"/>
              <path d="M8 18 L14 14 L16 22 L10 26 Z" fill="white" opacity="0.7"/>
              <path d="M32 18 L26 14 L24 22 L30 26 Z" fill="white" opacity="0.7"/>
              <path d="M10 26 L16 22 L20 24 L24 22 L30 26 L28 32 L20 34 L12 32 Z" fill="white" opacity="0.8"/>
            </svg>
          </div>
          <h1 className="font-display text-5xl text-text-primary tracking-wider">CANCHITA</h1>
          <p className="text-text-secondary font-body text-lg">Organizá tu fútbol en minutos</p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-3 w-full text-left">
          {[
            ['⚡', 'Creá el partido en 2 minutos'],
            ['📱', 'Compartí la formación por WhatsApp'],
            ['📊', 'Historial y estadísticas de tus jugadores'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 text-text-secondary font-body">
              <span className="text-xl">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <LoginButton />
      </div>
    </main>
  )
}
