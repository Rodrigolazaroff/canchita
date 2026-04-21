'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { formatDate, formatTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/format'
import { Calendar, MapPin, ChevronRight } from 'lucide-react'
import type { Match } from '@/lib/types'

type Filter = 'all' | 'played' | 'scheduled'

interface HistoryClientProps {
  matches: Match[]
  groupId: string
}

export function HistoryClient({ matches, groupId }: HistoryClientProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = matches.filter(m =>
    filter === 'all' ? true :
    filter === 'played' ? m.status === 'played' :
    m.status === 'scheduled'
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">Historial</h1>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'played', 'scheduled'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-xl font-body text-sm transition-colors',
              filter === f
                ? 'bg-green-primary text-white'
                : 'bg-surface border border-border text-text-secondary hover:border-green-primary/40'
            )}
          >
            {f === 'all' ? 'Todos' : f === 'played' ? 'Jugados' : 'Pendientes'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {filtered.map(match => (
          <Link key={match.id} href={`/matches/${match.id}`}>
            <Card className="flex items-center gap-3 hover:border-green-primary/30 transition-colors">
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-text-primary font-body text-sm">
                    <Calendar size={14} className="text-text-muted" />
                    <span>{formatDate(match.match_date)} · {formatTime(match.match_time)}</span>
                  </div>
                  <StatusChip status={match.status} />
                </div>
                {(match.venues?.name || match.venue_name_override) && (
                  <div className="flex items-center gap-2 text-text-muted font-body text-sm">
                    <MapPin size={13} />
                    <span>{match.venues?.name ?? match.venue_name_override}</span>
                  </div>
                )}
                {match.status === 'played' && match.score_dark !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-400 font-body">OSC</span>
                    <span className="font-display text-lg text-text-primary">{match.score_dark}</span>
                    <span className="text-text-muted font-body">-</span>
                    <span className="font-display text-lg text-text-primary">{match.score_light}</span>
                    <span className="text-xs text-text-muted font-body">CLR</span>
                  </div>
                )}
                {match.player_count && (
                  <p className="text-xs text-text-muted font-body">{match.player_count} jugadores</p>
                )}
              </div>
              <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
            </Card>
          </Link>
        ))}

        {filtered.length === 0 && (
          <Card className="text-center py-10 text-text-muted font-body">
            No hay partidos {filter !== 'all' && (filter === 'played' ? 'jugados' : 'pendientes')}
          </Card>
        )}
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-[10px] px-2 py-0.5 rounded-full font-body font-semibold',
      status === 'played' ? 'bg-green-primary/20 text-green-light' :
      status === 'cancelled' ? 'bg-red-900/30 text-red-400' :
      'bg-border text-text-muted'
    )}>
      {status === 'played' ? 'Jugado' : status === 'cancelled' ? 'Cancelado' : 'Programado'}
    </span>
  )
}
