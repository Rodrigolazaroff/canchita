'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils/format'
import { toast } from 'sonner'
import type { MatchType } from '@/lib/types'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const MATCH_TYPES: { value: MatchType; label: string; sub: string; icon: string }[] = [
  { value: 'futbol5', label: 'Fútbol 5', sub: '5 vs 5', icon: '⚽' },
  { value: 'futbol8', label: 'Fútbol 8', sub: '8 vs 8', icon: '🏟️' },
  { value: 'futbol11', label: 'Fútbol 11', sub: '11 vs 11', icon: '🥅' },
]

interface OnboardingWizardProps {
  userId: string
  isNewGroup?: boolean
}

export function OnboardingWizard({ userId, isNewGroup }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [matchType, setMatchType] = useState<MatchType | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || daysOfWeek.length === 0 || !matchType) return
    setLoading(true)
    const supabase = createClient()

    // Ensure profile exists (in case trigger didn't fire)
    await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })

    const { error } = await supabase
      .from('groups')
      .insert({ user_id: userId, name: name.trim(), days_of_week: daysOfWeek, match_type: matchType })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    // Full reload so server re-fetches groups with fresh session
    window.location.href = '/dashboard'
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i <= step ? 'bg-green-primary' : 'bg-border'
            )}
          />
        ))}
      </div>

      {/* Steps */}
      <div className="animate-fade-in">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl text-text-primary mb-1">¿Cómo se llama tu grupo?</h2>
              <p className="text-text-muted font-body text-sm">El nombre con el que lo conocen todos</p>
            </div>
            <Input
              placeholder="Ej: Los Cracks de los Martes"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 30))}
              maxLength={30}
              autoFocus
            />
            <p className="text-text-muted text-xs font-body text-right">{name.length}/30</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl text-text-primary mb-1">¿Qué día juegan?</h2>
              <p className="text-text-muted font-body text-sm">Los días habituales de partido</p>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  onClick={() => setDaysOfWeek(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                  className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-xl font-body text-sm font-semibold transition-all',
                    daysOfWeek.includes(i)
                      ? 'bg-green-primary text-white shadow-lg shadow-green-primary/30'
                      : 'bg-surface border border-border text-text-secondary hover:border-green-primary/50'
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl text-text-primary mb-1">¿Qué tipo de partido?</h2>
              <p className="text-text-muted font-body text-sm">Determina el campo táctico</p>
            </div>
            <div className="flex flex-col gap-3">
              {MATCH_TYPES.map(({ value, label, sub, icon }) => (
                <button
                  key={value}
                  onClick={() => setMatchType(value)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                    matchType === value
                      ? 'border-green-primary bg-green-primary/10'
                      : 'border-border bg-surface hover:border-green-primary/30'
                  )}
                >
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <p className="font-display text-lg text-text-primary">{label}</p>
                    <p className="text-text-muted font-body text-sm">{sub}</p>
                  </div>
                  {matchType === value && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-green-primary flex items-center justify-center">
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
            Atrás
          </Button>
        )}
        {step < 2 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            className="flex-1"
            disabled={
              (step === 0 && !name.trim()) ||
              (step === 1 && daysOfWeek.length === 0)
            }
          >
            Siguiente
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={loading}
            className="flex-1"
            disabled={!matchType}
          >
            {isNewGroup ? 'Crear grupo' : 'Listo, crear grupo'}
          </Button>
        )}
      </div>
    </div>
  )
}
