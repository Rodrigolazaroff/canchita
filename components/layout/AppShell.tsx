import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

interface AppShellProps {
  profile: Profile | null
  children: React.ReactNode
  isAdmin?: boolean
  displayName?: string
}

export async function AppShell({ profile, children, isAdmin, displayName }: AppShellProps) {
  // Si no se pasó displayName, lo resolvemos desde auth (JWT local, sin query extra)
  let resolvedName = displayName || profile?.full_name || ''
  if (!resolvedName) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      resolvedName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'U'
    } catch {}
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header profile={profile} displayName={resolvedName} />
      {/* Sidebar solo en desktop */}
      <Sidebar isAdmin={isAdmin} />
      {/* En desktop corremos el contenido a la derecha del sidebar (w-56) */}
      <main className="md:ml-56 md:max-w-none max-w-2xl px-4 py-6 pb-24 md:pb-6 md:px-8">
        {children}
      </main>
      {/* BottomNav solo en mobile */}
      <BottomNav />
    </div>
  )
}
