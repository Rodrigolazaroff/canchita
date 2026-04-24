import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { HistoryClient } from './HistoryClient'

export default async function HistoryPage({ params }: { params: { groupId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: matches }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('matches')
      .select('*, venues(*)')
      .eq('group_id', params.groupId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('match_date', { ascending: false })
      .limit(50),
  ])

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <HistoryClient matches={matches ?? []} groupId={params.groupId} />
    </AppShell>
  )
}
