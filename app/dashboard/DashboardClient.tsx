'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGroupStore } from '@/lib/stores/group'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { MatchCardSkeleton } from '@/components/ui/Skeleton'
import { formatDate, formatTime, formatDayOfWeek, closestUpcomingDay, pricePerPlayer, cn } from '@/lib/utils/format'
import Link from 'next/link'
import { Calendar, MapPin, Users, Plus, ChevronRight } from 'lucide-react'
import { MatchShareModalButton } from '@/components/match/MatchShareModalButton'
import type { Group, Match, PlayerStats, Profile } from '@/lib/types'

interface DashboardClientProps {
  groups: Group[]
  profile: Profile | null
}

export function DashboardClient({ groups, profile }: DashboardClientProps) {
  const { setGroups, activeGroupId, setActiveGroup, activeGroup } = useGroupStore()
  const [nextMatch, setNextMatch] = useState<Match | null | undefined>(undefined)
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setGroups(groups)
    if (!activeGroupId || !groups.find(g => g.id === activeGroupId)) {
      setActiveGroup(groups[0].id)
    }
  }, [groups])

  const group = activeGroup()

  useEffect(() => {
    if (!group) return
    setLoading(true)
    const supabase = createClient()
    Promise.all([
      supabase
        .from('matches')
        .select('*, venues(*), payment_aliases(*)')
        .eq('group_id', group.id)
        .eq('status', 'scheduled')
        .is('deleted_at', null)
        .gte('match_date', new Date().toISOString().split('T')[0])
        .order('match_date')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('player_stats')
        .select('*')
        .eq('group_id', group.id)
        .order('total_goals', { ascending: false })
        .limit(3),
    ]).then(([matchRes, statsRes]) => {
      setNextMatch(matchRes.data)
      setTopPlayers(statsRes.data ?? [])
      setLoading(false)
    })
  }, [group?.id])

  if (!mounted || !group) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-8">
      <div className="flex flex-col gap-6">
        {/* Próximo partido */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-text-primary">Próximo partido</h2>
            <Link href={`/groups/${group.id}/history`} className="text-sm text-green-light font-body">
              Ver todos
            </Link>
          </div>
          {loading ? (
            <MatchCardSkeleton />
          ) : nextMatch ? (
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs bg-green-primary/20 text-green-light px-2 py-0.5 rounded-full font-body font-semibold">
                  Programado
                </span>
                <span suppressHydrationWarning className="text-text-muted text-sm font-body">
                  {formatDayOfWeek(new Date(nextMatch.match_date + 'T00:00:00').getDay())}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-text-primary font-body">
                  <Calendar size={15} className="text-text-muted" />
                  <span suppressHydrationWarning>{formatDate(nextMatch.match_date)} · {formatTime(nextMatch.match_time)}</span>
                </div>
                {(nextMatch.venues?.name || nextMatch.venue_name_override) && (
                  <div className="flex items-center gap-2 text-text-secondary font-body">
                    <MapPin size={15} className="text-text-muted" />
                    <span>{nextMatch.venues?.name ?? nextMatch.venue_name_override}</span>
                  </div>
                )}
                {nextMatch.total_price && nextMatch.player_count && (
                  <div className="flex items-center gap-2 text-text-secondary font-body">
                    <Users size={15} className="text-text-muted" />
                    <span>
                      {nextMatch.player_count} jugadores · {pricePerPlayer(nextMatch.total_price, nextMatch.player_count)} c/u
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/matches/${nextMatch.id}`}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center font-body font-semibold rounded-xl transition-all active:scale-95",
                    "bg-surface border border-border text-text-primary hover:bg-border h-9 px-4 text-sm gap-1.5"
                  )}
                >
                  Ver detalle <ChevronRight size={14} />
                </Link>
                {((nextMatch as any).share_image_url || (nextMatch as any).formation_data) && (
                  <MatchShareModalButton
                    matchId={nextMatch.id}
                    shareImageUrl={(nextMatch as any).share_image_url ?? null}
                    formationData={(nextMatch as any).formation_data ?? null}
                    matchDate={nextMatch.match_date}
                    matchTime={nextMatch.match_time}
                    venueName={nextMatch.venues?.name ?? (nextMatch as any).venue_name_override ?? ''}
                    groupName={group.name}
                    pricePerPlayer={nextMatch.total_price && nextMatch.player_count ? `$${Math.ceil(nextMatch.total_price / nextMatch.player_count).toLocaleString('es-AR')}` : ''}
                    aliasText={(nextMatch as any).payment_aliases?.alias ?? ''}
                    compact
                  />
                )}
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center">
                <Calendar size={28} className="text-text-muted" />
              </div>
              <div className="text-center">
                <p className="font-body text-text-secondary">No hay partido programado</p>
                <p suppressHydrationWarning className="text-sm text-text-muted font-body mt-1">¿Organizamos el de este {(group.days_of_week && group.days_of_week.length > 0) ? formatDayOfWeek(closestUpcomingDay(group.days_of_week)) : 'fin de semana'}?</p>
              </div>
              <Link 
                href="/matches/new"
                className={cn(
                  "inline-flex items-center justify-center font-body font-semibold rounded-xl transition-all active:scale-95",
                  "bg-green-primary text-white hover:bg-green-600 h-11 px-5 text-base gap-2"
                )}
              >
                <Plus size={16} /> Crear partido
              </Link>
            </Card>
          )}
        </section>

        {/* Acceso rápido */}
        <section>
          <h2 className="font-display text-xl text-text-primary mb-3">Acceso rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/matches/new">
              <Card className="flex flex-col items-center gap-2 py-5 hover:border-green-primary/40 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-green-primary/15 flex items-center justify-center">
                  <Plus size={22} className="text-green-light" />
                </div>
                <span className="font-body font-semibold text-text-primary text-sm">Crear Partido</span>
              </Card>
            </Link>
            <Link href={`/groups/${group.id}/players`}>
              <Card className="flex flex-col items-center gap-2 py-5 hover:border-green-primary/40 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-green-primary/15 flex items-center justify-center">
                  <Users size={22} className="text-green-light" />
                </div>
                <span className="font-body font-semibold text-text-primary text-sm">Jugadores</span>
              </Card>
            </Link>
          </div>
        </section>
      </div>

      {/* Sidebar de jugadores en desktop */}
      <div className="flex flex-col gap-6">
        {/* Top jugadores */}
        {topPlayers.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-text-primary mb-3">Top goleadores</h2>
            <div className="flex flex-col gap-2">
              {topPlayers.map((p, i) => (
                <Link key={p.player_id} href={`/players/${p.player_id}/stats`}>
                  <Card className="flex items-center gap-3 hover:border-green-primary/30 transition-colors p-3">
                    <span className="font-display text-2xl text-text-muted w-6 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </span>
                    <PlayerAvatar name={p.name} id={p.player_id} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-semibold text-text-primary truncate text-sm">{p.name}</p>
                      <p className="text-text-muted text-[10px] font-body uppercase tracking-wider">{p.matches_played} PJ</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl text-green-light">{p.total_goals}</p>
                      <p className="text-text-muted text-[10px] font-body">goles</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <Link href="/stats" className="inline-block mt-4 text-xs text-text-muted hover:text-green-light transition-colors font-body uppercase tracking-widest">
              Ver estadísticas completas →
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}

