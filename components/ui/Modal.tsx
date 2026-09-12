'use client'
import { cn } from '@/lib/utils/format'
import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  disableBackdropClose?: boolean
  /** Nombre accesible cuando el modal no lleva `title` visible. */
  ariaLabel?: string
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  disableBackdropClose,
  ariaLabel,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Escape cerraba nada: había que tocar la X o el backdrop sí o sí.
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableBackdropClose) {
        e.stopPropagation()
        onClose()
        return
      }
      // Sin trampa de foco el tabulador se escapaba al contenido de atrás.
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => el.offsetParent !== null,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [disableBackdropClose, onClose],
  )

  useEffect(() => {
    if (!open) return

    restoreRef.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown, true)

    // El foco arranca dentro del panel; antes quedaba en <body>.
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panelRef.current)?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = prevOverflow
      // Y vuelve al control que lo abrió al cerrar.
      restoreRef.current?.focus?.()
    }
  }, [open, onKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={disableBackdropClose ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={cn(
          'relative w-full sm:max-w-md bg-elevated border border-border rounded-t-3xl sm:rounded-2xl',
          'motion-safe:animate-slide-up sm:motion-safe:animate-fade-in',
          'p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-6 max-h-[90vh] overflow-y-auto',
          className,
        )}
      >
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 id={titleId} className="font-display text-xl text-text-primary">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto -mr-2 -mt-2 grid place-items-center w-touch h-touch rounded-xl text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
