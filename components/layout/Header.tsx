'use client'
import { useGroupStore } from '@/lib/stores/group'
import { ChevronDown, Plus, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { cn } from '@/lib/utils/format'
import Link from 'next/link'
import { GroupSettingsModal } from '@/components/group/GroupSettingsModal'
import type { Profile, Group } from '@/lib/types'

interface HeaderProps {
  profile: Profile | null
}

export function Header({ profile }: HeaderProps) {
  const { groups, activeGroupId, setActiveGroup, activeGroup, setGroups } = useGroupStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const current = activeGroup()

  // El store persiste en localStorage, que el servidor no puede leer.
  // Hasta que el componente esté montado en el browser, groups=[] y current=null,
  // lo que causa mismatch de hidratación si renderizamos elementos condicionales.
  // Solución: diferir todo el contenido dinámico hasta después del montaje.
  useEffect(() => { setMounted(true) }, [])

  function handleUpdated(updated: Group) {
    // Actualizar el grupo en el store
    const newGroups = groups.map(g => g.id === updated.id ? updated : g)
    setGroups(newGroups)
  }

  function handleDeleted(groupId: string) {
    const remaining = groups.filter(g => g.id !== groupId)
    setGroups(remaining)
    if (remaining.length > 0) {
      setActiveGroup(remaining[0].id)
    } else {
      // Sin grupos → redirigir al onboarding
      window.location.href = '/onboarding'
    }
  }

  return (
    <>
      <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-30 md:ml-56">

        {/* Selector de grupo — se renderiza vacío en el servidor, con datos en el cliente */}
        <div className="relative flex items-center gap-2 min-w-0">
          {!mounted ? (
            /* Placeholder idéntico en servidor y cliente: evita el mismatch */
            <div className="h-6 w-32 rounded-lg bg-border/50 animate-pulse" />
          ) : (
            <>
              <button
                onClick={() => groups.length > 1 && setDropdownOpen(o => !o)}
                className="flex items-center gap-1.5 text-text-primary font-body min-w-0"
              >
                <span className="font-display text-lg truncate max-w-[180px]">
                  {current?.name ?? 'Sin grupo'}
                </span>
                {groups.length > 1 && (
                  <ChevronDown
                    size={16}
                    className={cn('flex-shrink-0 transition-transform', dropdownOpen && 'rotate-180')}
                  />
                )}
              </button>

              {/* Botón de configuración del grupo activo */}
              {current && (
                <button
                  onClick={() => { setDropdownOpen(false); setSettingsOpen(true) }}
                  className="flex-shrink-0 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                  title="Configurar grupo"
                >
                  <Settings size={15} />
                </button>
              )}

              {/* Dropdown de grupos */}
              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-xl shadow-xl min-w-[200px] py-1 z-50">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setActiveGroup(g.id); setDropdownOpen(false) }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 font-body text-sm hover:bg-border transition-colors',
                        g.id === activeGroupId ? 'text-green-light' : 'text-text-primary'
                      )}
                    >
                      {g.name}
                    </button>
                  ))}
                  <Link
                    href="/onboarding?new=true"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 font-body text-sm text-text-muted hover:bg-border border-t border-border mt-1"
                  >
                    <Plus size={14} /> Nuevo grupo
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Avatar del usuario */}
        {profile && (
          <Link href="/profile">
            <PlayerAvatar
              name={profile.full_name ?? 'U'}
              id={profile.id}
              photoUrl={profile.avatar_url}
              size={36}
            />
          </Link>
        )}
      </header>

      {/* Modal de configuración */}
      {current && (
        <GroupSettingsModal
          group={current}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}
