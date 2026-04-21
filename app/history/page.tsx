import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HistoryRedirectPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at')
    .limit(1)

  if (groups?.length) redirect(`/groups/${groups[0].id}/history`)
  redirect('/dashboard')
}
