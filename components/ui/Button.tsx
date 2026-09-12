'use client'
import { cn } from '@/lib/utils/format'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  /** Texto que anuncia el lector de pantalla mientras `loading` está activo. */
  loadingLabel?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, loadingLabel = 'Cargando', className, children, disabled, ...props },
    ref,
  ) => {
    const base =
      'relative inline-flex items-center justify-center font-body font-semibold rounded-xl ' +
      'transition-colors motion-safe:transition-all motion-safe:active:scale-[0.97] ' +
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

    const variants = {
      // Verde vibrante con tinta oscura: 8.5:1. Con texto blanco daba 2.3:1.
      primary: 'bg-green-primary text-green-ink hover:bg-green-hover active:bg-green-pressed',
      secondary: 'bg-surface border border-border text-text-primary hover:bg-elevated hover:border-border-strong',
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface',
      danger: 'bg-red-950/60 text-red-300 border border-red-800 hover:bg-red-900/60',
    }

    // Todos llegan a 44px de alto: antes `sm` daba 36px y quedaba por debajo
    // del mínimo táctil.
    const sizes = {
      sm: 'min-h-touch px-4 text-sm gap-1.5',
      md: 'min-h-touch px-5 text-base gap-2',
      lg: 'min-h-[3.25rem] px-6 text-lg gap-2',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <>
            <span
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full motion-safe:animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">{loadingLabel}</span>
          </>
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
