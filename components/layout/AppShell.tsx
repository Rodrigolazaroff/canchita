import { BottomNav } from './BottomNav'
import { Header } from './Header'
import type { Profile } from '@/lib/types'

interface AppShellProps {
  profile: Profile | null
  children: React.ReactNode
  isAdmin?: boolean
}

export function AppShell({ profile, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg">
      <Header profile={profile} />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
