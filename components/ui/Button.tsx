'use client'
import { cn } from '@/lib/utils/format'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-body font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-green-primary text-white hover:bg-green-600',
      secondary: 'bg-surface border border-border text-text-primary hover:bg-border',
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface',
      danger: 'bg-red-900/30 text-red-400 border border-red-900 hover:bg-red-900/50',
    }
    const sizes = {
      sm: 'h-9 px-4 text-sm gap-1.5',
      md: 'h-11 px-5 text-base gap-2',
      lg: 'h-14 px-6 text-lg gap-2',
    }
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
