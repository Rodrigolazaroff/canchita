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
      <Link href={`/matches/${matchId}/edit`}>
        <Button variant="ghost" size="sm" className="text-text-muted hover:text-text-primary h-11 w-11">
          <Pencil size={22} />
        </Button>
      </Link>

      {!showConfirm ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-text-muted hover:text-red-400 h-11 w-11"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 size={22} />
        </Button>
      ) : (
        <div className="flex items-center gap-1 bg-red-500/10 rounded-lg p-1 animate-in fade-in zoom-in duration-200">
          <Button
            variant="ghost"
            className="h-9 px-3 text-xs uppercase tracking-wider font-bold text-red-400 hover:bg-red-500 hover:text-white"
            onClick={handleDelete}
            disabled={loading}
          >
            Confirmar
          </Button>
          <Button
            variant="ghost"
            className="h-9 px-3 text-xs uppercase tracking-wider font-bold text-text-muted"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
          >
            No
          </Button>
        </div>
      )}
    </div>
  )
}
