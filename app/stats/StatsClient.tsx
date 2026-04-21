'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGroupStore } from '@/lib/stores/group'
import { Card } from '@/components/ui/Card'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { cn } from '@/lib/utils/format'
import { Trophy, Zap, Users, TrendingUp, Target, BarChart2, Shield } from 'lucide-react'
import type { Group, PlayerStats } from '@/lib/types'

// ─── Tipos locales ─────────────────────────────────────────────────────────────

interface PlayerRow extends PlayerStats {
  win_pct: number
  goal_avg: number
}

interface TeamRecord {
  wins: number
  draws: number
  losses: number
  total: number
  win_pct: number
}

type Tab = 'jugadores' | 'rankings' | 'equipos'
type RankingType = 'goles' | 'victorias'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function luckLabel(pct: number): { label: string; color: string } {
  if (pct >= 70) return { label: '🍀 Muy suertudo', color: 'text-green-light' }
  if (pct >= 50) return { label: '😊 Con suerte', color: 'text-green-light' }
  if (pct >= 30) return { label: '😐 Normal', color: 'text-text-muted' }
  return { label: '😬 Sin suerte', color: 'text-red-400' }
}

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 100)
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function StatsClient({ groups }: { groups: Group[] }) {
  const { setGroups, activeGroupId, setActiveGroup, activeGroup } = useGroupStore()
  const [tab, setTab] = useState<Tab>('jugadores')
  const [rankType, setRankType] = useState<RankingType>('goles')
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [teamLight, setTeamLight] = useState<TeamRecord>({ wins: 0, draws: 0, losses: 0, total: 0, win_pct: 0 })
  const [teamDark, setTeamDark] = useState<TeamRecord>({ wins: 0, draws: 0, losses: 0, total: 0, win_pct: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setGroups(groups)
    if (!activeGroupId || !groups.find(g => g.id === activeGroupId)) {
      setActiveGroup(groups[0].id)
    }
  }, [])

  const group = activeGroup()

  useEffect(() => {
    if (!group) return
    setLoading(true)
    const supabase = createClient()

    Promise.all([
      supabase
        .from('player_stats')
        .select('*')
        .eq('group_id', group.id)
        .order('total_goals', { ascending: false }),
      supabase
        .from('matches')
        .select('score_light, score_dark')
        .eq('group_id', group.id)
        .eq('status', 'played')
        .not('score_light', 'is', null),
    ]).then(([statsRes, matchesRes]) => {
      // Enriquecer stats con win_pct y goal_avg calculados
      const enriched: PlayerRow[] = (statsRes.data ?? []).map(p => ({
        ...p,
        win_pct: pct(p.wins, p.matches_played),
        goal_avg: p.matches_played > 0
          ? Math.round((p.total_goals / p.matches_played) * 100) / 100
          : 0,
      }))
      setPlayers(enriched)

      // Calcular métricas de equipo
      const matches = matchesRes.data ?? []
      const light: TeamRecord = { wins: 0, draws: 0, losses: 0, total: matches.length, win_pct: 0 }
      const dark: TeamRecord  = { wins: 0, draws: 0, losses: 0, total: matches.length, win_pct: 0 }

      for (const m of matches) {
        if ((m.score_light ?? 0) > (m.score_dark ?? 0)) {
          light.wins++; dark.losses++
        } else if ((m.score_dark ?? 0) > (m.score_light ?? 0)) {
          dark.wins++; light.losses++
        } else {
          light.draws++; dark.draws++
        }
      }
      light.win_pct = pct(light.wins, light.total)
      dark.win_pct  = pct(dark.wins,  dark.total)
      setTeamLight(light)
      setTeamDark(dark)
      setLoading(false)
    })
  }, [group?.id])

  if (!group) return null

  // Totales para el encabezado
  const totalGoals  = players.reduce((s, p) => s + p.total_goals, 0)
  const totalPlayed = teamLight.total

  return (
    <div className="flex flex-col gap-6">

      {/* Título */}
      <div>
        <h1 className="font-display text-2xl text-text-primary">Estadísticas</h1>
        <p className="text-sm text-text-muted font-body">{group.name}</p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryChip icon={<Trophy size={16} />} label="Partidos" value={totalPlayed} />
        <SummaryChip icon={<Target size={16} />} label="Goles" value={totalGoals} />
        <SummaryChip icon={<Users size={16} />} label="Jugadores" value={players.length} />
      </div>

      {/* Tabs */}
      <div className="flex bg-surface border border-border rounded-xl p-1 gap-1">
        {([
          { key: 'jugadores', label: 'Jugadores', icon: <Users size={14} /> },
          { key: 'rankings',  label: 'Rankings',  icon: <BarChart2 size={14} /> },
          { key: 'equipos',   label: 'Equipos',   icon: <Shield size={14} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-body font-semibold transition-all',
              tab === key
                ? 'bg-green-primary text-white'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Jugadores ─────────────────────────────────────────────────── */}
      {tab === 'jugadores' && (
        <div className="flex flex-col gap-3">
          {loading && [1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
          {!loading && players.length === 0 && (
            <Card className="py-10 text-center text-text-muted font-body">
              Todavía no hay estadísticas. ¡Cargá el primer partido!
            </Card>
          )}
          {!loading && players.map((p, i) => (
            <PlayerCard key={p.player_id} player={p} rank={i + 1} />
          ))}
        </div>
      )}

      {/* ── Tab: Rankings ──────────────────────────────────────────────────── */}
      {tab === 'rankings' && (
        <div className="flex flex-col gap-4">
          {/* Toggle tipo de ranking */}
          <div className="flex bg-surface border border-border rounded-xl p-1">
            {([
              { key: 'goles',     label: '⚽ Goles'     },
              { key: 'victorias', label: '🍀 Suerte'    },
            ] as { key: RankingType; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRankType(key)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-body font-semibold transition-all',
                  rankType === key
                    ? 'bg-green-primary text-white'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lista de ranking */}
          <div className="flex flex-col gap-2">
            {loading && [1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
            {!loading && [...players]
              .sort((a, b) =>
                rankType === 'goles'
                  ? b.total_goals - a.total_goals || b.matches_played - a.matches_played
                  : b.win_pct - a.win_pct || b.matches_played - a.matches_played
              )
              .map((p, i) => (
                <RankingRow
                  key={p.player_id}
                  player={p}
                  rank={i + 1}
                  type={rankType}
                />
              ))}
          </div>
        </div>
      )}

      {/* ── Tab: Equipos ───────────────────────────────────────────────────── */}
      {tab === 'equipos' && (
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="h-48 bg-surface border border-border rounded-2xl animate-pulse" />
          ) : teamLight.total === 0 ? (
            <Card className="py-10 text-center text-text-muted font-body">
              Todavía no hay partidos jugados con resultado cargado.
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <TeamCard name="Equipo Claro" record={teamLight} color="light" />
                <TeamCard name="Equipo Oscuro" record={teamDark} color="dark" />
              </div>

              {/* Barra de dominio */}
              <Card className="flex flex-col gap-2">
                <p className="text-sm text-text-muted font-body text-center">Dominio de la temporada</p>
                <div className="flex rounded-full overflow-hidden h-5">
                  <div
                    className="bg-blue-300 transition-all"
                    style={{ width: `${pct(teamLight.wins, teamLight.total)}%` }}
                  />
                  <div
                    className="bg-border transition-all"
                    style={{ width: `${pct(teamLight.draws, teamLight.total)}%` }}
                  />
                  <div
                    className="bg-slate-600 transition-all flex-1"
                  />
                </div>
                <div className="flex justify-between text-xs font-body text-text-muted">
                  <span className="text-blue-300">Claro {teamLight.win_pct}%</span>
                  <span>{teamLight.draws} empates</span>
                  <span className="text-slate-400">Oscuro {teamDark.win_pct}%</span>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function SummaryChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex flex-col items-center gap-1 py-4">
      <span className="text-green-light">{icon}</span>
      <span className="font-display text-2xl text-text-primary">{value}</span>
      <span className="text-xs text-text-muted font-body">{label}</span>
    </Card>
  )
}

function PlayerCard({ player, rank }: { player: PlayerRow; rank: number }) {
  const luck = luckLabel(player.win_pct)
  return (
    <Card className="flex items-center gap-4">
      {/* Rank */}
      <span className="font-display text-xl w-7 text-center flex-shrink-0 text-text-muted">
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
      </span>

      {/* Avatar */}
      <PlayerAvatar name={player.name} id={player.player_id} size={48} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-text-primary truncate">{player.name}</p>
        <p className={cn('text-xs font-body', luck.color)}>{luck.label}</p>
      </div>

      {/* Stats compactos */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-body">{player.matches_played}🎮</span>
          <span className="font-display text-lg text-green-light">{player.total_goals}</span>
          <span className="text-xs text-text-muted font-body">⚽</span>
        </div>
        <span className="text-xs text-text-muted font-body">{player.win_pct}% victorias</span>
      </div>
    </Card>
  )
}

function RankingRow({ player, rank, type }: { player: PlayerRow; rank: number; type: RankingType }) {
  const value = type === 'goles' ? player.total_goals : player.win_pct
  const unit  = type === 'goles' ? 'goles' : '% vic.'
  const sub   = type === 'goles'
    ? `${player.matches_played} partidos`
    : `${player.wins} victorias de ${player.matches_played}`

  return (
    <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
      <span className="font-display text-lg w-8 text-center flex-shrink-0 text-text-muted">
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
      </span>
      <PlayerAvatar name={player.name} id={player.player_id} size={38} />
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-text-primary truncate">{player.name}</p>
        <p className="text-xs text-text-muted font-body">{sub}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-xl text-green-light">{value}</p>
        <p className="text-xs text-text-muted font-body">{unit}</p>
      </div>
    </div>
  )
}

function TeamCard({ name, record, color }: { name: string; record: TeamRecord; color: 'light' | 'dark' }) {
  const isLight = color === 'light'
  return (
    <Card className={cn(
      'flex flex-col items-center gap-3 py-5',
      isLight ? 'border-blue-800/50' : 'border-slate-700/50'
    )}>
      {/* Icono de camiseta */}
      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl',
        isLight ? 'bg-blue-900/40' : 'bg-slate-700/60'
      )}>
        {isLight ? '⬜' : '⬛'}
      </div>

      <div className="text-center">
        <p className="font-body font-semibold text-text-primary text-sm">{name}</p>
        <p className={cn('font-display text-3xl mt-1', isLight ? 'text-blue-300' : 'text-slate-300')}>
          {record.win_pct}%
        </p>
        <p className="text-xs text-text-muted font-body">victorias</p>
      </div>

      {/* W/D/L */}
      <div className="flex gap-3 text-center">
        <div>
          <p className="font-display text-lg text-green-light">{record.wins}</p>
          <p className="text-[10px] text-text-muted font-body uppercase">G</p>
        </div>
        <div>
          <p className="font-display text-lg text-text-secondary">{record.draws}</p>
          <p className="text-[10px] text-text-muted font-body uppercase">E</p>
        </div>
        <div>
          <p className="font-display text-lg text-red-400">{record.losses}</p>
          <p className="text-[10px] text-text-muted font-body uppercase">P</p>
        </div>
      </div>
    </Card>
  )
}
