'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from 'sonner'
import { Minus, Plus } from 'lucide-react'
import type { Match, MatchPlayer } from '@/lib/types'

interface ResultClientProps {
  match: Match
  matchPlayers: (MatchPlayer & { players?: { name: string } | null })[]
}

export function ResultClient({ match, matchPlayers }: ResultClientProps) {
  const router = useRouter()
  const [scoreDark, setScoreDark] = useState(0)
  const [scoreLight, setScoreLight] = useState(0)
  const [goals, setGoals] = useState<Record<string, number>>(
    Object.fromEntries(matchPlayers.map(mp => [mp.id, 0]))
  )
  const [attended, setAttended] = useState<Record<string, boolean>>(
    Object.fromEntries(matchPlayers.map(mp => [mp.id, true]))
  )
  const [saving, setSaving] = useState(false)

  const darkPlayers = matchPlayers.filter(mp => mp.team === 'dark')
  const lightPlayers = matchPlayers.filter(mp => mp.team === 'light')
  const benchPlayers = matchPlayers.filter(mp => mp.team === 'bench' || !mp.team)

  const topGoalscorer = matchPlayers.reduce<{ name: string; goals: number } | null>((best, mp) => {
    const g = goals[mp.id] ?? 0
    if (g > 0 && (!best || g > best.goals)) return { name: mp.players?.name ?? '?', goals: g }
    return best
  }, null)

  function setGoal(id: string, delta: number) {
    setGoals(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    const updates = matchPlayers.map(mp => ({
      id: mp.id,
      goals: goals[mp.id] ?? 0,
      attended: attended[mp.id] ?? true,
    }))

    const [matchErr] = await Promise.all([
      supabase.from('matches').update({
        score_dark: scoreDark,
        score_light: scoreLight,
        status: 'played',
      }).eq('id', match.id).then(r => r.error),
      ...updates.map(u =>
        supabase.from('match_players').update({ goals: u.goals, attended: u.attended }).eq('id', u.id)
      ),
    ])

    if (matchErr) {
      toast.error('Error al guardar resultado')
      setSaving(false)
      return
    }

    if (topGoalscorer) {
      toast.success(`🏆 Goleador: ${topGoalscorer.name} con ${topGoalscorer.goals} gol${topGoalscorer.goals > 1 ? 'es' : ''}!`)
    } else {
      toast.success('¡Resultado guardado!')
    }

    router.push(`/matches/${match.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">Cargar Resultado</h1>

      {/* Score */}
      <Card className="flex items-center justify-center gap-6 py-6">
        <ScoreInput label="Oscuro" value={scoreDark} onChange={setScoreDark} />
        <p className="font-display text-3xl text-text-muted">vs</p>
        <ScoreInput label="Claro" value={scoreLight} onChange={setScoreLight} />
      </Card>

      {/* Goals per player */}
      {[
        { label: 'Equipo Oscuro', players: darkPlayers },
        { label: 'Equipo Claro', players: lightPlayers },
        ...(benchPlayers.length ? [{ label: 'Banca', players: benchPlayers }] : []),
      ].map(({ label, players }) => players.length > 0 && (
        <div key={label}>
          <h3 className="font-body text-sm text-text-muted uppercase tracking-wider mb-2">{label}</h3>
          <div className="flex flex-col gap-2">
            {players.map(mp => (
              <Card key={mp.id} className="flex items-center gap-3">
                <PlayerAvatar name={mp.players?.name ?? '?'} id={mp.player_id} size={40} />
                <span className="flex-1 font-body text-text-primary">{mp.players?.name}</span>
                {/* Attended toggle */}
                <button
                  onClick={() => setAttended(prev => ({ ...prev, [mp.id]: !prev[mp.id] }))}
                  className={`text-xs px-2 py-1 rounded-full font-body ${
                    attended[mp.id] ? 'bg-green-primary/20 text-green-light' : 'bg-border text-text-muted line-through'
                  }`}
                >
                  {attended[mp.id] ? 'Jugó' : 'No jugó'}
                </button>
                {attended[mp.id] && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGoal(mp.id, -1)}
                      className="w-9 h-9 rounded-xl bg-border flex items-center justify-center text-text-secondary hover:bg-green-primary/20 hover:text-green-light transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-display text-xl text-text-primary w-6 text-center">
                      {goals[mp.id] ?? 0}
                    </span>
                    <button
                      onClick={() => setGoal(mp.id, 1)}
                      className="w-9 h-9 rounded-xl bg-border flex items-center justify-center text-text-secondary hover:bg-green-primary/20 hover:text-green-light transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Button onClick={handleSave} loading={saving} size="lg" className="w-full">
        Guardar resultado
      </Button>
    </div>
  )
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-text-muted font-body uppercase">{label}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-11 h-11 rounded-2xl bg-border text-text-secondary hover:bg-green-primary/20 hover:text-green-light transition-colors flex items-center justify-center"
        >
          <Minus size={18} />
        </button>
        <span className="font-display text-5xl text-text-primary w-12 text-center">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-11 h-11 rounded-2xl bg-border text-text-secondary hover:bg-green-primary/20 hover:text-green-light transition-colors flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}
