'use client'
import { cn } from '@/lib/utils/format'
import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full sm:max-w-md bg-surface border border-border rounded-t-3xl sm:rounded-2xl',
        'animate-slide-up sm:animate-fade-in p-6 pb-8 sm:pb-6 max-h-[90vh] overflow-y-auto',
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="font-display text-xl text-text-primary">{title}</h2>}
          <button onClick={onClose} className="ml-auto p-1 text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
