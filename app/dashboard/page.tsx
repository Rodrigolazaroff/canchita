import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: groups }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('groups').select('*').eq('user_id', user.id).is('deleted_at', null).order('created_at'),
  ])

  if (!groups || groups.length === 0) redirect('/onboarding')

  // Sincronizar nombre del perfil con los metadatos de Auth (solo si está vacío)
  const authName = user.user_metadata?.full_name || user.user_metadata?.name || ''
  if (authName && !profile?.full_name) {
    await supabase.from('profiles').update({ full_name: authName }).eq('id', user.id)
    if (profile) profile.full_name = authName
  }
  const displayName = profile?.full_name || authName || user.email?.split('@')[0] || 'U'

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin} displayName={displayName}>
      <DashboardClient groups={groups} profile={profile} />
    </AppShell>
  )
}
