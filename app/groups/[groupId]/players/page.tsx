import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PlayersClient } from './PlayersClient'

export default async function PlayersPage({ params }: { params: { groupId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: players }, { data: group }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('players')
      .select('*')
      .eq('group_id', params.groupId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name'),
    supabase.from('groups').select('*').eq('id', params.groupId).eq('user_id', user.id).single(),
  ])

  if (!group) redirect('/dashboard')

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <PlayersClient players={players ?? []} groupId={params.groupId} userId={user.id} />
    </AppShell>
  )
}
