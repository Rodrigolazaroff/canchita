'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/format'

type Mode = 'login' | 'register' | 'forgot'

export function LoginButton() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    if (mode === 'register') {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) {
        toast.error(error.message === 'User already registered' ? 'Ya existe una cuenta con ese email' : error.message)
        setLoading(false)
        return
      }
      // Enviar email de confirmación via Resend
      if (data.user) {
        await fetch('/api/emails/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, firstName: firstName.trim() }),
        })
        toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
        setLoading(false)
        setMode('login')
        return
      }
      toast.success('¡Cuenta creada!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message)
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/emails/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setForgotSent(true)
    } catch {
      toast.error('No se pudo enviar el email. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Pantalla: olvidé mi contraseña ───────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="text-center">
          <h2 className="font-display text-xl text-text-primary">Recuperar contraseña</h2>
          <p className="text-sm text-text-muted font-body mt-1">Te enviamos un link a tu email</p>
        </div>
        {forgotSent ? (
          <div className="flex flex-col gap-4">
            <p className="text-center text-green-light font-body text-sm bg-green-primary/10 border border-green-primary/20 rounded-xl py-4 px-3">
              ✅ Email enviado a <strong>{email}</strong>.<br />Revisá tu bandeja (y spam).
            </p>
            <button onClick={() => { setMode('login'); setForgotSent(false) }} className="text-sm text-text-muted font-body underline text-center">
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
              Enviar link de recuperación
            </Button>
            <button type="button" onClick={() => setMode('login')} className="text-sm text-text-muted font-body underline text-center">
              Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    )
  }

  // ── Pantalla: login / registro ────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex bg-surface border border-border rounded-xl p-1">
        {(['login', 'register'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m as Mode)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-body font-semibold transition-all',
              mode === m ? 'bg-green-primary text-white' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Nombre" value={firstName} onChange={e => setFirstName(e.target.value)} required autoComplete="given-name" />
            <Input placeholder="Apellido" value={lastName} onChange={e => setLastName(e.target.value)} required autoComplete="family-name" />
          </div>
        )}
        <Input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        <Input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </Button>
      </form>

      {mode === 'login' && (
        <button type="button" onClick={() => setMode('forgot')} className="text-sm text-text-muted font-body underline text-center">
          ¿Olvidaste tu contraseña?
        </button>
      )}
      {mode === 'register' && (
        <p className="text-xs text-text-muted font-body text-center">Mínimo 6 caracteres para la contraseña</p>
      )}
    </div>
  )
}
