'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Clock, User, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils/format'
import { useGroupStore } from '@/lib/stores/group'

const navItems = [
  { href: '/dashboard',  label: 'Inicio',  icon: Home },
  { href: '/matches/new', label: 'Crear',  icon: Plus, highlight: true },
  { href: '/stats',      label: 'Stats',   icon: BarChart2 },
  { href: '/history',    label: 'Historial', icon: Clock },
  { href: '/profile',    label: 'Perfil',  icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const activeGroup = useGroupStore(s => s.activeGroup())

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon, highlight }) => {
          const finalHref = href === '/history' && activeGroup
            ? `/groups/${activeGroup.id}/history`
            : href
          const active = pathname === finalHref || pathname.startsWith(finalHref + '/')
          return (
            <Link
              key={href}
              href={finalHref}
              className={cn(
                'flex flex-col items-center gap-1 min-w-[44px] py-1 rounded-xl transition-colors',
                highlight
                  ? 'bg-green-primary text-white rounded-2xl px-4 py-3 -mt-4 shadow-lg shadow-green-primary/30'
                  : active ? 'text-green-light' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <Icon size={highlight ? 22 : 20} />
              {!highlight && <span className="text-[10px] font-body">{label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
