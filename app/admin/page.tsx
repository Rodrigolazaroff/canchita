import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { AdminClient } from './AdminClient'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: venues }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('venues').select('*').eq('is_global', true).is('deleted_at', null).order('name'),
  ])

  if (!profile?.is_admin) redirect('/dashboard')

  // Aggregate stats
  const [totalOrg, totalGroups, matchesThisMonth, newOrg] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_admin', false),
    supabase.from('groups').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('matches').select('id', { count: 'exact', head: true })
      .eq('status', 'played')
      .is('deleted_at', null)
      .gte('match_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('is_admin', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const stats = {
    totalOrganizers: totalOrg.count ?? 0,
    totalGroups: totalGroups.count ?? 0,
    matchesThisMonth: matchesThisMonth.count ?? 0,
    newOrganizersWeek: newOrg.count ?? 0,
  }

  return (
    <AppShell profile={profile} isAdmin>
      <AdminClient stats={stats} venues={venues ?? []} />
    </AppShell>
  )
}
