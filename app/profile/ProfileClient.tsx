'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LogOut, Settings, Users, ChevronRight } from 'lucide-react'
import { formatDayOfWeek } from '@/lib/utils/format'
import Link from 'next/link'
import type { Profile, Group } from '@/lib/types'

interface ProfileClientProps {
  profile: Profile | null
  groups: Group[]
}

export function ProfileClient({ profile, groups }: ProfileClientProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const MATCH_TYPE_LABEL: Record<string, string> = {
    futbol5: 'Fútbol 5',
    futbol8: 'Fútbol 8',
    futbol11: 'Fútbol 11',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 py-4">
        <PlayerAvatar
          name={profile?.full_name ?? 'U'}
          id={profile?.id ?? '0'}
          photoUrl={profile?.avatar_url}
          size={80}
        />
        <div className="text-center">
          <h1 className="font-display text-2xl text-text-primary">{profile?.full_name ?? 'Organizador'}</h1>
          <p className="text-text-muted font-body text-sm">Organizador</p>
        </div>
      </div>

      {/* Groups */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-text-primary">Mis grupos</h2>
          <Link href="/onboarding?new=true" className="text-sm text-green-light font-body">+ Nuevo</Link>
        </div>
        <div className="flex flex-col gap-2">
          {groups.map(g => (
            <Link key={g.id} href={`/groups/${g.id}/players`}>
              <Card className="flex items-center gap-3 hover:border-green-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-green-primary/15 flex items-center justify-center">
                  <Users size={18} className="text-green-light" />
                </div>
                <div className="flex-1">
                  <p className="font-body font-semibold text-text-primary">{g.name}</p>
                  <p className="text-xs text-text-muted font-body">
                    {g.day_of_week !== null && formatDayOfWeek(g.day_of_week)}
                    {g.match_type && ` · ${MATCH_TYPE_LABEL[g.match_type]}`}
                  </p>
                </div>
                <ChevronRight size={16} className="text-text-muted" />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Settings */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-text-primary mb-1">Configuración</h2>
        <Link href="/settings/aliases">
          <Card className="flex items-center gap-3 hover:border-green-primary/30 transition-colors">
            <Settings size={18} className="text-text-muted" />
            <span className="flex-1 font-body text-text-primary">Aliases de pago</span>
            <ChevronRight size={16} className="text-text-muted" />
          </Card>
        </Link>
      </section>

      <Button variant="danger" onClick={handleLogout} className="w-full">
        <LogOut size={16} /> Cerrar sesión
      </Button>
    </div>
  )
}
