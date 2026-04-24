'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (password.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { toast.error('No se pudo actualizar la contraseña'); return }
    setDone(true)
    // Sign out para que inicie sesión con la nueva clave
    await supabase.auth.signOut()
    setTimeout(() => router.push('/'), 2500)
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display text-3xl text-text-primary">Nueva contraseña</h1>
          <p className="text-text-muted font-body text-sm mt-1">Elegí una contraseña nueva para tu cuenta</p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 bg-green-primary/10 border border-green-primary/20 rounded-xl py-6 px-4">
            <svg className="animate-spin h-8 w-8 text-green-light" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-green-light font-body font-semibold text-center">
              ✅ Contraseña actualizada.<br />
              <span className="text-text-muted text-sm font-normal">Redirigiendo al inicio de sesión...</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
              Guardar nueva contraseña
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
