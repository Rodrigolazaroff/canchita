'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Clock, User, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils/format'
import { useGroupStore } from '@/lib/stores/group'

const navItems = [
  { href: '/dashboard',  label: 'Inicio',    icon: Home },
  { href: '/stats',      label: 'Stats',     icon: BarChart2 },
  { href: '/matches/new', label: 'Crear',   icon: Plus, highlight: true },
  { href: '/history',    label: 'Historial', icon: Clock },
  { href: '/profile',    label: 'Perfil',    icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const activeGroup = useGroupStore(s => s.activeGroup())
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border md:hidden h-16 pb-safe"
      />
    )
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border md:hidden pb-safe"
    >
      <div className="flex items-center justify-around h-[4.5rem] px-2 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon, highlight }) => {
          const finalHref = href === '/history' && activeGroup
            ? `/groups/${activeGroup.id}/history`
            : href
          const active = pathname === finalHref || pathname.startsWith(finalHref + '/')
          return (
            <Link
              key={href}
              href={finalHref}
              // El item activo se distinguía solo por color: se le suma el punto
              // y aria-current para que no dependa de ver el verde.
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 min-w-touch min-h-touch px-2 rounded-xl transition-colors',
                highlight
                  ? 'bg-green-primary text-green-ink rounded-2xl px-5 -mt-4 shadow-lg shadow-green-primary/30'
                  : active ? 'text-green-light' : 'text-text-muted hover:text-text-primary',
              )}
            >
              <Icon size={highlight ? 24 : 20} aria-hidden="true" />
              {/* El CTA no tenía texto ni aria-label: para un lector de pantalla
                  era un link sin nombre. */}
              {highlight ? (
                <span className="sr-only">{label}</span>
              ) : (
                <span className="text-[11px] leading-none font-body">{label}</span>
              )}
              {active && !highlight && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-green-light"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
