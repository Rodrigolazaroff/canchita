'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/format'

type Mode = 'login' | 'register'

export function LoginButton() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      // Email confirmation required (Supabase default)
      if (data.user && !data.session) {
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

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex bg-surface border border-border rounded-xl p-1">
        {(['login', 'register'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
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
            <Input
              placeholder="Nombre"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
            <Input
              placeholder="Apellido"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
        )}
        <Input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />
        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </Button>
      </form>

      {mode === 'register' && (
        <p className="text-xs text-text-muted font-body text-center">
          Mínimo 6 caracteres para la contraseña
        </p>
      )}
    </div>
  )
}
