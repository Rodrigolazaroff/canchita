import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { formatDate, formatTime } from '@/lib/utils/format'
import { Calendar, MapPin, Users, DollarSign } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'

export default async function MatchDetailPage({ params }: { params: { matchId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: match }, { data: matchPlayers }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('matches')
      .select('*, venues(*), payment_aliases(*)')
      .eq('id', params.matchId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('match_players')
      .select('*, players(*)')
      .eq('match_id', params.matchId),
  ])

  if (!match) redirect('/dashboard')

  const venueName = match.venues?.name ?? match.venue_name_override ?? 'Cancha no especificada'
  const darkTeam = (matchPlayers ?? []).filter(mp => mp.team === 'dark')
  const lightTeam = (matchPlayers ?? []).filter(mp => mp.team === 'light')
  const bench = (matchPlayers ?? []).filter(mp => mp.team === 'bench' || !mp.team)

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-text-primary">Detalle del Partido</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-body font-semibold ${
            match.status === 'played' ? 'bg-green-primary/20 text-green-light' :
            match.status === 'cancelled' ? 'bg-red-900/30 text-red-400' :
            'bg-border text-text-muted'
          }`}>
            {match.status === 'played' ? 'Jugado' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'}
          </span>
        </div>

        {/* Score if played */}
        {match.status === 'played' && match.score_dark !== null && (
          <Card className="flex items-center justify-center gap-6 py-6">
            <div className="text-center">
              <p className="text-xs text-blue-400 font-body mb-1">OSCURO</p>
              <p className="font-display text-6xl text-text-primary">{match.score_dark}</p>
            </div>
            <p className="font-display text-3xl text-text-muted">vs</p>
            <div className="text-center">
              <p className="text-xs text-text-muted font-body mb-1">CLARO</p>
              <p className="font-display text-6xl text-text-primary">{match.score_light}</p>
            </div>
          </Card>
        )}

        {/* Info */}
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-text-secondary font-body">
            <Calendar size={16} className="text-text-muted" />
            <span>{formatDate(match.match_date)} · {formatTime(match.match_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary font-body">
            <MapPin size={16} className="text-text-muted" />
            <span>{venueName}</span>
          </div>
          {match.total_price && (
            <div className="flex items-center gap-2 text-text-secondary font-body">
              <DollarSign size={16} className="text-text-muted" />
              <span>
                Total: ${match.total_price.toLocaleString('es-AR')}
                {match.player_count && ` · $${(match.total_price / match.player_count).toFixed(0)} c/u`}
              </span>
            </div>
          )}
          {match.payment_aliases && (
            <div className="flex items-center gap-2 text-text-secondary font-body">
              <Users size={16} className="text-text-muted" />
              <span>Alias: {match.payment_aliases.alias}</span>
            </div>
          )}
        </Card>

        {/* Teams */}
        {(darkTeam.length > 0 || lightTeam.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Equipo Oscuro', team: darkTeam, color: 'text-blue-400' },
              { label: 'Equipo Claro', team: lightTeam, color: 'text-text-muted' },
            ].map(({ label, team, color }) => (
              <Card key={label}>
                <p className={`text-xs font-body font-semibold mb-3 ${color}`}>{label}</p>
                <div className="flex flex-col gap-2">
                  {team.map(mp => (
                    <div key={mp.id} className="flex items-center gap-2">
                      <PlayerAvatar name={mp.players?.name ?? '?'} id={mp.player_id} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-body text-text-primary truncate">{mp.players?.name}</p>
                        {mp.goals > 0 && (
                          <p className="text-[10px] text-yellow-400">⚽ {mp.goals} gol{mp.goals > 1 ? 'es' : ''}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        {match.status === 'scheduled' && (
          <Link href={`/matches/${params.matchId}/result`}>
            <Button className="w-full">Cargar resultado</Button>
          </Link>
        )}
      </div>
    </AppShell>
  )
}
