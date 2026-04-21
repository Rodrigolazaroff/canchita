'use client'
import { cn } from '@/lib/utils/format'
import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-text-secondary font-body">{label}</label>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-body">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-12 bg-surface border border-border rounded-xl px-4 text-text-primary font-body',
            'placeholder:text-text-muted focus:outline-none focus:border-green-primary transition-colors',
            prefix && 'pl-8',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-sm text-red-400 font-body">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
