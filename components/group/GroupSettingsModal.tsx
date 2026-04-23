'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils/format'
import { toast } from 'sonner'
import { Trash2, AlertTriangle } from 'lucide-react'
import type { Group, MatchType } from '@/lib/types'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const MATCH_TYPES: { value: MatchType; label: string }[] = [
  { value: 'futbol5',  label: 'Fútbol 5'  },
  { value: 'futbol8',  label: 'Fútbol 8'  },
  { value: 'futbol11', label: 'Fútbol 11' },
]

type Tab = 'edit' | 'delete'

interface GroupSettingsModalProps {
  group: Group
  open: boolean
  onClose: () => void
  /** Se llama después de guardar cambios o eliminar para que el padre refresque. */
  onUpdated: (updatedGroup: Group) => void
  onDeleted: (groupId: string) => void
}

export function GroupSettingsModal({
  group,
  open,
  onClose,
  onUpdated,
  onDeleted,
}: GroupSettingsModalProps) {
  const [tab, setTab] = useState<Tab>('edit')

  // — Campos de edición —
  const [name, setName]           = useState(group.name)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(group.days_of_week || [])
  const [matchType, setMatchType] = useState<MatchType | null>(group.match_type)
  const [saving, setSaving]       = useState(false)

  // — Confirmación de borrado —
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting]           = useState(false)

  const canSave  = name.trim().length > 0 && daysOfWeek.length > 0 && matchType !== null
  const canDelete = deleteConfirm.trim().toLowerCase() === group.name.trim().toLowerCase()

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('groups')
      .update({ name: name.trim(), days_of_week: daysOfWeek, match_type: matchType })
      .eq('id', group.id)
      .select()
      .single()

    setSaving(false)
    if (error) { toast.error(error.message); return }

    toast.success('Grupo actualizado')
    onUpdated(data as Group)
    onClose()
  }

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    const supabase = createClient()

    // Soft-delete: pone deleted_at en lugar de borrar la fila
    const { error } = await supabase
      .from('groups')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', group.id)

    setDeleting(false)
    if (error) { toast.error(error.message); return }

    toast.success('Grupo eliminado')
    onDeleted(group.id)
    onClose()
  }

  function handleClose() {
    // Resetear estado al cerrar
    setTab('edit')
    setName(group.name)
    setDaysOfWeek(group.days_of_week || [])
    setMatchType(group.match_type)
    setDeleteConfirm('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Configuración del grupo">
      {/* Tabs */}
      <div className="flex bg-bg border border-border rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab('edit')}
          className={cn(
            'flex-1 py-2 rounded-lg text-sm font-body font-semibold transition-all',
            tab === 'edit'
              ? 'bg-green-primary text-white'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          Editar
        </button>
        <button
          onClick={() => setTab('delete')}
          className={cn(
            'flex-1 py-2 rounded-lg text-sm font-body font-semibold transition-all',
            tab === 'delete'
              ? 'bg-red-600 text-white'
              : 'text-text-muted hover:text-red-400'
          )}
        >
          Eliminar
        </button>
      </div>

      {/* ── Tab Editar ─────────────────────────────────────────────────────── */}
      {tab === 'edit' && (
        <div className="flex flex-col gap-4">
          <Input
            label="Nombre del grupo"
            value={name}
            onChange={e => setName(e.target.value.slice(0, 30))}
            maxLength={30}
            placeholder="Los Cracks del Jueves"
          />
          <p className="text-text-muted text-xs font-body text-right -mt-2">{name.length}/30</p>

          {/* Día de semana */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-body">Días habituales</label>
            <div className="grid grid-cols-7 gap-1.5 w-full py-0.5">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  onClick={() => setDaysOfWeek(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                  className={cn(
                    'flex items-center justify-center w-full h-11 rounded-xl font-body text-sm font-semibold transition-all',
                    daysOfWeek.includes(i)
                      ? 'bg-green-primary text-white shadow-lg shadow-green-primary/30'
                      : 'bg-bg border border-border text-text-secondary hover:border-green-primary/50'
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de partido */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-body">Modalidad</label>
            <div className="flex gap-2">
              {MATCH_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMatchType(value)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl border text-sm font-body font-semibold transition-colors',
                    matchType === value
                      ? 'bg-green-primary border-green-primary text-white'
                      : 'bg-bg border-border text-text-secondary hover:border-green-primary/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!canSave}
            className="w-full mt-1"
          >
            Guardar cambios
          </Button>
        </div>
      )}

      {/* ── Tab Eliminar ────────────────────────────────────────────────────── */}
      {tab === 'delete' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/50 rounded-xl">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="font-body font-semibold text-red-300 text-sm">Esta acción es irreversible</p>
              <p className="font-body text-red-400/80 text-sm">
                El grupo <strong className="text-red-300">{group.name}</strong> y todos sus partidos,
                jugadores e historial quedarán inaccesibles.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-body">
              Escribí <span className="text-text-primary font-semibold">{group.name}</span> para confirmar
            </label>
            <Input
              placeholder={group.name}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
          </div>

          <Button
            onClick={handleDelete}
            loading={deleting}
            disabled={!canDelete}
            className="w-full bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 disabled:opacity-40"
          >
            <Trash2 size={16} /> Eliminar grupo
          </Button>
        </div>
      )}
    </Modal>
  )
}
