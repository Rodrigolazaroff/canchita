'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGroupStore } from '@/lib/stores/group'
import { Card } from '@/components/ui/Card'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { cn } from '@/lib/utils/format'
import { Trophy, Users, Target, BarChart2, Shield } from 'lucide-react'
import type { Group } from '@/lib/types'

// ─── Tipos que devuelven las vistas de Supabase ────────────────────────────────

interface PlayerStatRow {
  player_id: string
  name: string
  group_id: string
  matches_played: number
  total_goals: number
  total_assists: number
  wins: number
  losses: number
  draws: number
  win_pct: number
  goal_avg: number
}

interface TeamMetricsRow {
  group_id: string
  total_played: number
  light_wins: number
  light_losses: number
  light_draws: number
  dark_wins: number
  dark_losses: number
  dark_draws: number
  light_win_pct: number
  dark_win_pct: number
}

type Tab = 'jugadores' | 'rankings' | 'equipos'
type RankingType = 'goles' | 'victorias'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function luckLabel(pct: number): { label: string; color: string } {
  if (pct >= 70) return { label: '🍀 Muy suertudo',  color: 'text-green-light' }
  if (pct >= 50) return { label: '😊 Con suerte',    color: 'text-green-light' }
  if (pct >= 30) return { label: '😐 Normal',        color: 'text-text-muted'  }
  return              { label: '😬 Sin suerte',      color: 'text-red-400'     }
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function StatsClient({ groups }: { groups: Group[] }) {
  const { setGroups, activeGroupId, setActiveGroup, activeGroup } = useGroupStore()
  const [tab, setTab]           = useState<Tab>('jugadores')
  const [rankType, setRankType] = useState<RankingType>('goles')
  const [players, setPlayers]   = useState<PlayerStatRow[]>([])
  const [teamMetrics, setTeamMetrics] = useState<TeamMetricsRow | null>(null)
  const [loading, setLoading]   = useState(true)

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
      // player_stats ya devuelve todo calculado desde la DB
      supabase
        .from('player_stats')
        .select('*')
        .eq('group_id', group.id)
        .order('total_goals', { ascending: false }),

      // team_metrics_by_group devuelve victorias/derrotas/% por equipo
      supabase
        .from('team_metrics_by_group')
        .select('*')
        .eq('group_id', group.id)
        .single(),
    ]).then(([playersRes, teamRes]) => {
      setPlayers((playersRes.data ?? []) as PlayerStatRow[])
      setTeamMetrics(teamRes.data as TeamMetricsRow | null)
      setLoading(false)
    })
  }, [group?.id])

  if (!group) return null

  const totalGoals  = players.reduce((s, p) => s + p.total_goals, 0)
  const totalPlayed = teamMetrics?.total_played ?? 0

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h1 className="font-display text-2xl text-text-primary">Estadísticas</h1>
        <p className="text-sm text-text-muted font-body">{group.name}</p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryChip icon={<Trophy size={16} />} label="Partidos"  value={totalPlayed} />
        <SummaryChip icon={<Target  size={16} />} label="Goles"    value={totalGoals}  />
        <SummaryChip icon={<Users   size={16} />} label="Jugadores" value={players.length} />
      </div>

      {/* Tabs */}
      <div className="flex bg-surface border border-border rounded-xl p-1 gap-1">
        {([
          { key: 'jugadores', label: 'Jugadores', icon: <Users size={14} />     },
          { key: 'rankings',  label: 'Rankings',  icon: <BarChart2 size={14} /> },
          { key: 'equipos',   label: 'Equipos',   icon: <Shield size={14} />    },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-body font-semibold transition-all',
              tab === key ? 'bg-green-primary text-white' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Jugadores ───────────────────────────────────────────────────── */}
      {tab === 'jugadores' && (
        <div className="flex flex-col gap-3">
          {loading && [1,2,3,4].map(i => (
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

      {/* ── Tab: Rankings ────────────────────────────────────────────────────── */}
      {tab === 'rankings' && (
        <div className="flex flex-col gap-4">
          <div className="flex bg-surface border border-border rounded-xl p-1">
            {([
              { key: 'goles',     label: '⚽ Goles'  },
              { key: 'victorias', label: '🍀 Suerte' },
            ] as { key: RankingType; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRankType(key)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-body font-semibold transition-all',
                  rankType === key ? 'bg-green-primary text-white' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {loading && [1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
            {!loading && [...players]
              .sort((a, b) =>
                rankType === 'goles'
                  ? b.total_goals - a.total_goals || b.matches_played - a.matches_played
                  : b.win_pct     - a.win_pct     || b.matches_played - a.matches_played
              )
              .map((p, i) => (
                <RankingRow key={p.player_id} player={p} rank={i + 1} type={rankType} />
              ))}
          </div>
        </div>
      )}

      {/* ── Tab: Equipos ─────────────────────────────────────────────────────── */}
      {tab === 'equipos' && (
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="h-48 bg-surface border border-border rounded-2xl animate-pulse" />
          ) : !teamMetrics || teamMetrics.total_played === 0 ? (
            <Card className="py-10 text-center text-text-muted font-body">
              Todavía no hay partidos jugados con resultado cargado.
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <TeamCard
                  name="Equipo Claro"
                  wins={teamMetrics.light_wins}
                  draws={teamMetrics.light_draws}
                  losses={teamMetrics.light_losses}
                  win_pct={teamMetrics.light_win_pct}
                  color="light"
                />
                <TeamCard
                  name="Equipo Oscuro"
                  wins={teamMetrics.dark_wins}
                  draws={teamMetrics.dark_draws}
                  losses={teamMetrics.dark_losses}
                  win_pct={teamMetrics.dark_win_pct}
                  color="dark"
                />
              </div>

              {/* Barra de dominio */}
              <Card className="flex flex-col gap-2">
                <p className="text-sm text-text-muted font-body text-center">Dominio de la temporada</p>
                <div className="flex rounded-full overflow-hidden h-5">
                  <div className="bg-blue-300 transition-all" style={{ width: `${teamMetrics.light_win_pct}%` }} />
                  <div className="bg-border transition-all"   style={{ width: `${teamMetrics.light_draws / teamMetrics.total_played * 100}%` }} />
                  <div className="bg-slate-600 transition-all flex-1" />
                </div>
                <div className="flex justify-between text-xs font-body text-text-muted">
                  <span className="text-blue-300">Claro {teamMetrics.light_win_pct}%</span>
                  <span>{teamMetrics.light_draws} empates</span>
                  <span className="text-slate-400">Oscuro {teamMetrics.dark_win_pct}%</span>
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

function PlayerCard({ player, rank }: { player: PlayerStatRow; rank: number }) {
  const luck = luckLabel(player.win_pct)
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="font-display text-xl w-7 text-center flex-shrink-0 text-text-muted">
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
        </span>
        <PlayerAvatar name={player.name} id={player.player_id} size={44} />
        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-text-primary truncate">{player.name}</p>
          <p className={cn('text-xs font-body', luck.color)}>{luck.label}</p>
        </div>
      </div>
      <div className="flex gap-2 pl-10">
        <StatChip value={player.matches_played}        label="PJ"  />
        <StatChip value={player.total_goals}           label="⚽"  color="text-green-light" />
        <StatChip value={Number(player.goal_avg).toFixed(2)} label="G/P" />
        <StatChip value={`${player.win_pct}%`}         label="V"   />
      </div>
    </Card>
  )
}

function StatChip({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center bg-border/40 rounded-xl py-2 px-1">
      <span className={cn('font-display text-base leading-tight', color ?? 'text-text-primary')}>{value}</span>
      <span className="text-[10px] text-text-muted font-body uppercase tracking-wide">{label}</span>
    </div>
  )
}

function RankingRow({ player, rank, type }: { player: PlayerStatRow; rank: number; type: RankingType }) {
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

function TeamCard({
  name, wins, draws, losses, win_pct, color,
}: {
  name: string; wins: number; draws: number; losses: number; win_pct: number; color: 'light' | 'dark'
}) {
  const isLight = color === 'light'
  return (
    <Card className={cn(
      'flex flex-col items-center gap-3 py-5',
      isLight ? 'border-blue-800/50' : 'border-slate-700/50'
    )}>
      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl',
        isLight ? 'bg-blue-900/40' : 'bg-slate-700/60'
      )}>
        {isLight ? '⬜' : '⬛'}
      </div>
      <div className="text-center">
        <p className="font-body font-semibold text-text-primary text-sm">{name}</p>
        <p className={cn('font-display text-3xl mt-1', isLight ? 'text-blue-300' : 'text-slate-300')}>
          {win_pct}%
        </p>
        <p className="text-xs text-text-muted font-body">victorias</p>
      </div>
      <div className="flex gap-3 text-center">
        <div>
          <p className="font-display text-lg text-green-light">{wins}</p>
          <p className="text-[10px] text-text-muted font-body uppercase">G</p>
        </div>
        <div>
          <p className="font-display text-lg text-text-secondary">{draws}</p>
          <p className="text-[10px] text-text-muted font-body uppercase">E</p>
        </div>
        <div>
          <p className="font-display text-lg text-red-400">{losses}</p>
          <p className="text-[10px] text-text-muted font-body uppercase">P</p>
        </div>
      </div>
    </Card>
  )
}
