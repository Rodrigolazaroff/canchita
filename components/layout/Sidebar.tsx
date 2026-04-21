'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Clock, User, Settings, Shield, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils/format'
import { useGroupStore } from '@/lib/stores/group'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/matches/new', label: 'Crear Partido', icon: Plus },
  { href: '/history', label: 'Historial', icon: Clock },
  { href: '/stats', label: 'Estadísticas', icon: BarChart2 },
  { href: '/profile', label: 'Perfil', icon: User },
  { href: '/settings/aliases', label: 'Configuración', icon: Settings },
]

interface SidebarProps {
  isAdmin?: boolean
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const activeGroup = useGroupStore(s => s.activeGroup())

  return (
    <aside className="hidden md:flex flex-col w-56 bg-surface border-r border-border min-h-screen fixed top-0 left-0 z-40 p-4 gap-1">
      <div className="mb-6 px-2">
        <span className="font-display text-2xl text-green-light tracking-wider">CANCHITA</span>
      </div>
      {navItems.map(({ href, label, icon: Icon }) => {
        const finalHref = href === '/history' && activeGroup
          ? `/groups/${activeGroup.id}/history`
          : href
        const active = pathname === finalHref || pathname.startsWith(finalHref + '/')
        return (
          <Link
            key={href}
            href={finalHref}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl font-body transition-colors',
              active
                ? 'bg-green-primary/10 text-green-light'
                : 'text-text-muted hover:text-text-primary hover:bg-border'
            )}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        )
      })}
      {isAdmin && (
        <Link
          href="/admin"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl font-body transition-colors mt-auto',
            pathname.startsWith('/admin')
              ? 'bg-green-primary/10 text-green-light'
              : 'text-text-muted hover:text-text-primary hover:bg-border'
          )}
        >
          <Shield size={18} />
          <span>Admin</span>
        </Link>
      )}
    </aside>
  )
}
