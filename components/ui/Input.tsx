'use client'
import { cn } from '@/lib/utils/format'
import { forwardRef, InputHTMLAttributes, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, className, id, ...props }, ref) => {
    // El label venía suelto: sin htmlFor no enfocaba al tocarlo ni lo asociaba
    // ningún lector de pantalla.
    const autoId = useId()
    const inputId = id ?? autoId
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-secondary font-body">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-body pointer-events-none"
              aria-hidden="true"
            >
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(
              'w-full min-h-touch h-12 bg-surface border border-border-strong rounded-xl px-4 text-text-primary font-body',
              'placeholder:text-text-muted transition-colors',
              // Sin `outline-none` pelado: el anillo global de :focus-visible
              // sigue vivo y además el borde vira a verde.
              'focus:border-green-light',
              prefix && 'pl-8',
              error && 'border-red-400',
              className,
            )}
            {...props}
          />
        </div>
        {hint && !error && (
          <p id={hintId} className="text-sm text-text-muted font-body">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-300 font-body">
            {error}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
