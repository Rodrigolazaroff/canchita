import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import type { Profile } from '@/lib/types'

interface AppShellProps {
  profile: Profile | null
  children: React.ReactNode
  isAdmin?: boolean
}

export function AppShell({ profile, children, isAdmin }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg">
      <Header profile={profile} />
      {/* Sidebar solo en desktop */}
      <Sidebar isAdmin={isAdmin} />
      {/* En desktop corremos el contenido a la derecha del sidebar (w-56) */}
      <main className="md:ml-56 max-w-2xl md:mx-0 px-4 py-6 pb-24 md:px-8">
        {children}
      </main>
      {/* BottomNav solo en mobile */}
      <BottomNav />
    </div>
  )
}
