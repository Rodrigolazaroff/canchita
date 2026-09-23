import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { ResultClient } from './ResultClient'

export default async function ResultPage({ params }: { params: { matchId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: match }, { data: matchPlayers }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('matches').select('*, groups(name), venues(name)').eq('id', params.matchId).eq('user_id', user.id).single(),
    supabase
      .from('match_players')
      .select('*, players(*)')
      .eq('match_id', params.matchId),
  ])

  if (!match || match.status === 'played') redirect(`/matches/${params.matchId}`)

  const groupName = (match as { groups?: { name?: string } }).groups?.name ?? ''
  const venueName =
    match.venue_name_override ||
    (match as { venues?: { name?: string } }).venues?.name ||
    ''

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <ResultClient
        match={match}
        matchPlayers={matchPlayers ?? []}
        groupName={groupName}
        venueName={venueName}
      />
    </AppShell>
  )
}
