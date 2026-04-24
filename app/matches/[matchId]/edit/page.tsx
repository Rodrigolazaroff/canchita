import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { MatchWizard } from '@/components/match/MatchWizard'

export default async function EditMatchPage({ params }: { params: { matchId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: match }, { data: matchPlayers }, { data: groups }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('matches').select('*, venues(*)').eq('id', params.matchId).eq('user_id', user.id).single(),
    supabase.from('match_players').select('*').eq('match_id', params.matchId),
    supabase.from('groups').select('*').eq('user_id', user.id).is('deleted_at', null).order('name'),
  ])

  if (!match || !groups) redirect('/dashboard')

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <MatchWizard 
        groups={groups} 
        userId={user.id} 
        initialMatch={match} 
        initialPlayers={matchPlayers || []} 
      />
    </AppShell>
  )
}
