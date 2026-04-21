import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { Profile } from '@/lib/types'

interface AppShellProps {
  profile: Profile | null
  children: React.ReactNode
  isAdmin?: boolean
}

export function AppShell({ profile, children, isAdmin }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar isAdmin={isAdmin} />
      <div className="md:ml-56">
        <Header profile={profile} />
        <main className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
