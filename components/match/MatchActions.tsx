'use client'
import { useState } from 'react'
import { Pencil, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface MatchActionsProps {
  matchId: string
}

export function MatchActions({ matchId }: MatchActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('matches')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', matchId)

    if (error) {
      toast.error('Error al eliminar el partido')
      setLoading(false)
    } else {
      toast.success('Partido eliminado')
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/matches/${matchId}/edit`}
        aria-label="Editar partido"
        className="grid place-items-center w-touch h-touch rounded-xl text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
      >
        <Pencil size={20} aria-hidden="true" />
      </Link>

      {!showConfirm ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Eliminar partido"
          className="text-text-muted hover:text-red-300 w-touch px-0"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 size={20} aria-hidden="true" />
        </Button>
      ) : (
        <div
          role="alertdialog"
          aria-label="Confirmar eliminación del partido"
          className="flex items-center gap-1 bg-red-500/10 rounded-lg p-1 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in duration-200"
        >
          <Button
            variant="ghost"
            className="px-3 text-xs uppercase tracking-wider font-bold text-red-300 hover:bg-red-600 hover:text-white"
            onClick={handleDelete}
            loading={loading}
            loadingLabel="Eliminando el partido"
          >
            Confirmar
          </Button>
          <Button
            variant="ghost"
            className="px-3 text-xs uppercase tracking-wider font-bold text-text-muted"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            aria-label="Cancelar la eliminación"
          >
            No
          </Button>
        </div>
      )}
    </div>
  )
}
