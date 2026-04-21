import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { StatsClient } from './StatsClient'

export default async function StatsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: groups }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('groups').select('*').eq('user_id', user.id).is('deleted_at', null).order('created_at'),
  ])

  if (!groups || groups.length === 0) redirect('/onboarding')

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <StatsClient groups={groups} />
    </AppShell>
  )
}
