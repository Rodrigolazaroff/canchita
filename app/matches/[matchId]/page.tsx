import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { formatDate, formatTime, cn } from '@/lib/utils/format'
import { Calendar, MapPin, Users, DollarSign, Image as ImageIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { MatchShareButton } from '@/components/match/MatchShareButton'

export default async function MatchDetailPage({ params }: { params: { matchId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: match }, { data: matchPlayers }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('matches')
      .select('*, venues(*), payment_aliases(*), groups(name)')
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
  const darkTeam  = (matchPlayers ?? []).filter(mp => mp.team === 'dark' && mp.position_x !== null)
  const lightTeam = (matchPlayers ?? []).filter(mp => mp.team === 'light' && mp.position_x !== null)
  const bench     = (matchPlayers ?? []).filter(mp => mp.team === 'bench' || !mp.team || mp.position_x === null)

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-text-primary">Detalle del Partido</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-body font-semibold ${
            match.status === 'played'    ? 'bg-green-primary/20 text-green-light' :
            match.status === 'cancelled' ? 'bg-red-900/30 text-red-400' :
            'bg-border text-text-muted'
          }`}>
            {match.status === 'played' ? 'Jugado' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'}
          </span>
        </div>

        {/* Score */}
        {match.status === 'played' && match.score_dark !== null && (
          <Card className="flex items-center justify-center gap-8 py-8">
            <div className="text-center">
              <p className="text-xs text-blue-400 font-body mb-1 uppercase tracking-wider">Oscuro</p>
              <p className="font-display text-6xl text-text-primary">{match.score_dark}</p>
            </div>
            <p className="font-display text-3xl text-text-muted">vs</p>
            <div className="text-center">
              <p className="text-xs text-text-muted font-body mb-1 uppercase tracking-wider">Claro</p>
              <p className="font-display text-6xl text-text-primary">{match.score_light}</p>
            </div>
          </Card>
        )}

        {/* Info */}
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-text-secondary font-body">
            <Calendar size={16} className="text-text-muted flex-shrink-0" />
            <span>{formatDate(match.match_date)} · {formatTime(match.match_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary font-body">
            <MapPin size={16} className="text-text-muted flex-shrink-0" />
            <span>{venueName}</span>
          </div>
          {match.total_price && (
            <div className="flex items-center gap-2 text-text-secondary font-body">
              <DollarSign size={16} className="text-text-muted flex-shrink-0" />
              <span>
                Total: ${match.total_price.toLocaleString('es-AR')}
                {match.player_count ? ` · $${(match.total_price / match.player_count).toFixed(0)} c/u` : ''}
              </span>
            </div>
          )}
          {match.payment_aliases && (
            <div className="flex items-center gap-2 text-text-secondary font-body">
              <Users size={16} className="text-text-muted flex-shrink-0" />
              <span>Alias: {match.payment_aliases.alias}</span>
            </div>
          )}
        </Card>

        {/* Equipos */}
        {darkTeam.length > 0 && (
          <TeamSection label="Equipo Oscuro" labelColor="text-blue-400" players={darkTeam} />
        )}
        {lightTeam.length > 0 && (
          <TeamSection label="Equipo Claro" labelColor="text-slate-300" players={lightTeam} />
        )}

        {/* Suplentes */}
        {bench.length > 0 && (
          <Card>
            <p className="text-xs font-body font-semibold mb-3 text-yellow-400 uppercase tracking-wider">Suplentes</p>
            <div className="flex flex-col gap-3">
              {bench.map(mp => (
                <div key={mp.id} className="flex items-center gap-3">
                  <PlayerAvatar name={mp.players?.name ?? '?'} id={mp.player_id} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-text-primary truncate">{mp.players?.name}</p>
                    {(mp.goals ?? 0) > 0 && (
                      <p className="text-xs text-yellow-400 font-body">
                        ⚽ {mp.goals} gol{mp.goals > 1 ? 'es' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Compartir formación */}
        {match.share_image_url && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-text-secondary font-body">
              <ImageIcon size={16} className="text-text-muted flex-shrink-0" />
              <span className="text-sm font-semibold">Formación del partido</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={match.share_image_url}
              alt="Formación"
              className="w-full rounded-xl border border-border"
            />
            <MatchShareButton
              shareImageUrl={match.share_image_url}
              groupName={(match as any).groups?.name ?? ''}
            />
          </Card>
        )}

        {/* Acciones */}
        {match.status === 'scheduled' && (
          <Link 
            href={`/matches/${params.matchId}/result`}
            className="inline-flex items-center justify-center font-body font-semibold rounded-xl transition-all active:scale-95 bg-green-primary text-white hover:bg-green-600 h-11 px-5 text-base gap-2 w-full"
          >
            Cargar resultado
          </Link>
        )}
      </div>
    </AppShell>
  )
}

// ── Sub-componente equipo ─────────────────────────────────────────────────────
function TeamSection({
  label, labelColor, players,
}: {
  label: string
  labelColor: string
  players: { id: string; player_id: string; goals: number; players?: { name: string } | null }[]
}) {
  return (
    <Card>
      <p className={`text-xs font-body font-semibold mb-3 uppercase tracking-wider ${labelColor}`}>{label}</p>
      <div className="flex flex-col gap-3">
        {players.map(mp => (
          <div key={mp.id} className="flex items-center gap-3">
            <PlayerAvatar name={mp.players?.name ?? '?'} id={mp.player_id} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body text-text-primary truncate">{mp.players?.name}</p>
              {(mp.goals ?? 0) > 0 && (
                <p className="text-xs text-yellow-400 font-body">
                  ⚽ {mp.goals} gol{mp.goals > 1 ? 'es' : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
