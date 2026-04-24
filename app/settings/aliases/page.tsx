import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { AliasesClient } from './AliasesClient'

export default async function AliasesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: aliases }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('payment_aliases').select('*').eq('user_id', user.id).is('deleted_at', null).order('label'),
  ])

  return (
    <AppShell profile={profile} isAdmin={profile?.is_admin}>
      <AliasesClient aliases={aliases ?? []} userId={user.id} />
    </AppShell>
  )
}
