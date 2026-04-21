import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: groups }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('groups').select('*').eq('user_id', user.id).is('deleted_at', null),
  ])

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <ProfileClient profile={profile} groups={groups ?? []} />
    </AppShell>
  )
}
