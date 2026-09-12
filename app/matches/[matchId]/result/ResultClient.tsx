'use client'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from 'sonner'
import { Minus, Plus } from 'lucide-react'
import type { Match, MatchPlayer } from '@/lib/types'
import { trackStatsRecorded } from '@/lib/analytics'
import { ResultShareModal, type ResultScorer } from '@/components/match/ResultShareModal'

interface ResultClientProps {
  match: Match
  matchPlayers: (MatchPlayer & { players?: { name: string } | null })[]
  groupName?: string
  venueName?: string
}

export function ResultClient({ match, matchPlayers, groupName = '', venueName = '' }: ResultClientProps) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = useState(false)
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
    if (!(attended[mp.id] ?? true)) return best
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

    const updates = matchPlayers.map(mp => {
      const didAttend = attended[mp.id] ?? true
      return {
        id: mp.id,
        // Si no jugó, no puede tener goles (el contador queda oculto pero el
        // valor persistía en el estado).
        goals: didAttend ? (goals[mp.id] ?? 0) : 0,
        attended: didAttend,
      }
    })

    const winner = scoreDark > scoreLight ? 'dark' : scoreLight > scoreDark ? 'light' : 'draw'

    const [matchErr] = await Promise.all([
      supabase.from('matches').update({
        score_dark: scoreDark,
        score_light: scoreLight,
        winner,
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

    const totalGoals = scoreDark + scoreLight
    trackStatsRecorded({ match_id: match.id, goals_count: totalGoals })

    if (topGoalscorer) {
      toast.success(`🏆 Goleador: ${topGoalscorer.name} con ${topGoalscorer.goals} gol${topGoalscorer.goals > 1 ? 'es' : ''}!`)
    } else {
      toast.success('¡Resultado guardado!')
    }

    setSaving(false)
    setShareOpen(true)
  }

  function buildScorers(players: typeof matchPlayers): ResultScorer[] {
    return players
      .filter(mp => attended[mp.id] ?? true)
      .map(mp => ({ name: mp.players?.name ?? '?', goals: goals[mp.id] ?? 0 }))
      .filter(s => s.goals > 0)
      .sort((a, b) => b.goals - a.goals)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">Cargar Resultado</h1>

      {/* Score */}
      <Card className="flex items-center justify-center gap-3 sm:gap-6 py-6">
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
                  type="button"
                  onClick={() => setAttended(prev => ({ ...prev, [mp.id]: !prev[mp.id] }))}
                  aria-pressed={!!attended[mp.id]}
                  aria-label={`${mp.players?.name ?? 'Jugador'}: ${attended[mp.id] ? 'jugó' : 'no jugó'}. Tocar para cambiar`}
                  className={`text-xs px-3 min-h-touch rounded-full font-body transition-colors ${
                    attended[mp.id]
                      ? 'bg-green-primary/20 text-green-light'
                      : 'bg-surface border border-border text-text-muted line-through'
                  }`}
                >
                  {attended[mp.id] ? 'Jugó' : 'No jugó'}
                </button>
                {attended[mp.id] && (
                  <div
                    role="group"
                    aria-label={`Goles de ${mp.players?.name ?? 'jugador'}`}
                    className="flex items-center gap-1"
                  >
                    <button
                      type="button"
                      onClick={() => setGoal(mp.id, -1)}
                      aria-label={`Restar un gol a ${mp.players?.name ?? 'jugador'}`}
                      className="w-touch h-touch rounded-xl bg-surface border border-border flex items-center justify-center text-text-secondary hover:bg-green-primary/20 hover:text-green-light hover:border-green-primary/40 transition-colors"
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <span aria-live="polite" className="font-display text-xl text-text-primary w-7 text-center">
                      {goals[mp.id] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGoal(mp.id, 1)}
                      aria-label={`Sumar un gol a ${mp.players?.name ?? 'jugador'}`}
                      className="w-touch h-touch rounded-xl bg-surface border border-border flex items-center justify-center text-text-secondary hover:bg-green-primary/20 hover:text-green-light hover:border-green-primary/40 transition-colors"
                    >
                      <Plus size={16} aria-hidden="true" />
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

      <ResultShareModal
        open={shareOpen}
        onClose={() => router.push(`/matches/${match.id}`)}
        matchId={match.id}
        groupName={groupName}
        venueName={venueName}
        matchDate={match.match_date}
        matchTime={match.match_time}
        scoreDark={scoreDark}
        scoreLight={scoreLight}
        scorersDark={buildScorers(darkPlayers)}
        scorersLight={buildScorers(lightPlayers)}
      />
    </div>
  )
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: Dispatch<SetStateAction<number>>
}) {
  const btn =
    'w-touch h-touch shrink-0 rounded-xl bg-surface border border-border text-text-secondary ' +
    'hover:bg-green-primary/20 hover:text-green-light hover:border-green-primary/40 transition-colors ' +
    'flex items-center justify-center'

  return (
    <div role="group" aria-label={`Goles del equipo ${label}`} className="flex flex-col items-center gap-2">
      <p className="text-xs text-text-muted font-body uppercase">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          // Antes calculaba desde `value` capturado: dos toques rápidos en el
          // mismo tick sumaban uno solo. Con updater funcional no se pierde nada.
          onClick={() => onChange(v => Math.max(0, v - 1))}
          aria-label={`Restar un gol a ${label}`}
          className={btn}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <span aria-live="polite" className="font-display text-4xl text-text-primary w-10 text-center">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(v => v + 1)}
          aria-label={`Sumar un gol a ${label}`}
          className={btn}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
