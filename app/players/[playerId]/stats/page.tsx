import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils/format'

export default async function PlayerStatsPage({ params }: { params: { playerId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: player }, { data: stats }, { data: recentMatches }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('players').select('*').eq('id', params.playerId).single(),
    supabase.from('player_stats').select('*').eq('player_id', params.playerId).single(),
    supabase
      .from('match_players')
      .select('*, matches(match_date, score_dark, score_light, status)')
      .eq('player_id', params.playerId)
      .eq('attended', true)
      .order('matches(match_date)', { ascending: false })
      .limit(6),
  ])

  if (!player) redirect('/dashboard')

  const statCards = [
    { label: 'Partidos', value: stats?.matches_played ?? 0 },
    { label: 'Goles', value: stats?.total_goals ?? 0 },
    { label: 'Asistencias', value: stats?.total_assists ?? 0 },
    { label: 'Victorias', value: stats?.wins ?? 0 },
  ]

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 py-4">
          <PlayerAvatar name={player.name} id={player.id} photoUrl={player.photo_url} size={80} />
          <h1 className="font-display text-3xl text-text-primary">{player.name}</h1>
          {player.is_guest && <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded-full font-body">Invitado</span>}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ label, value }) => (
            <Card key={label} className="flex flex-col items-center py-5 gap-1">
              <p className="font-display text-4xl text-green-light">{value}</p>
              <p className="text-sm text-text-muted font-body">{label}</p>
            </Card>
          ))}
        </div>

        {/* Recent matches bar chart */}
        {recentMatches && recentMatches.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-text-primary mb-3">Últimos partidos</h2>
            <div className="flex flex-col gap-2">
              {recentMatches.map(mp => {
                const m = mp.matches as { match_date: string; score_dark: number | null; score_light: number | null; status: string } | null
                if (!m) return null
                return (
                  <Card key={mp.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-body text-sm text-text-primary">{formatDate(m.match_date)}</p>
                      {m.status === 'played' && m.score_dark !== null && (
                        <p className="text-xs text-text-muted font-body">
                          {m.score_dark} - {m.score_light}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl text-yellow-400">{mp.goals}</p>
                      <p className="text-[10px] text-text-muted font-body">goles</p>
                    </div>
                    {/* Mini bar */}
                    <div className="w-20 h-8 flex items-end gap-0.5 bg-surface rounded-lg p-1">
                      {Array.from({ length: Math.max(mp.goals, 1) }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-green-primary rounded-sm"
                          style={{ height: i < mp.goals ? '100%' : '20%', opacity: i < mp.goals ? 1 : 0.2 }}
                        />
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}
