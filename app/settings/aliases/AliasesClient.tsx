'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { PaymentAlias } from '@/lib/types'

interface AliasesClientProps {
  aliases: PaymentAlias[]
  userId: string
}

export function AliasesClient({ aliases: initial, userId }: AliasesClientProps) {
  const [aliases, setAliases] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentAlias | null>(null)
  const [alias, setAlias] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)

  function openAdd() { setEditing(null); setAlias(''); setLabel(''); setOpen(true) }
  function openEdit(a: PaymentAlias) { setEditing(a); setAlias(a.alias); setLabel(a.label); setOpen(true) }

  async function handleSave() {
    if (!alias.trim() || !label.trim()) return
    setLoading(true)
    const supabase = createClient()

    if (editing) {
      const { data } = await supabase
        .from('payment_aliases')
        .update({ alias: alias.trim(), label: label.trim() })
        .eq('id', editing.id)
        .select()
        .single()
      if (data) setAliases(prev => prev.map(a => a.id === data.id ? data : a))
      toast.success('Alias actualizado')
    } else {
      const { data } = await supabase
        .from('payment_aliases')
        .insert({ user_id: userId, alias: alias.trim(), label: label.trim() })
        .select()
        .single()
      if (data) setAliases(prev => [...prev, data])
      toast.success('Alias agregado')
    }

    setOpen(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro? El alias dejará de estar disponible para nuevos partidos.')) return
    const supabase = createClient()
    await supabase.from('payment_aliases').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setAliases(prev => prev.filter(a => a.id !== id))
    toast.success('Alias eliminado')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-text-primary">Aliases de Pago</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} /> Agregar
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {aliases.map(a => (
          <Card key={a.id} className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-body font-semibold text-text-primary">{a.label}</p>
              <p className="text-sm text-green-light font-body">{a.alias}</p>
            </div>
            <button onClick={() => openEdit(a)} className="p-2 text-text-muted hover:text-text-primary">
              <Pencil size={16} />
            </button>
            <button onClick={() => handleDelete(a.id)} className="p-2 text-text-muted hover:text-red-400">
              <Trash2 size={16} />
            </button>
          </Card>
        ))}
        {aliases.length === 0 && (
          <Card className="text-center py-8 text-text-muted font-body">
            Agregá tu alias de Mercado Pago para incluirlo en la imagen del partido
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar alias' : 'Nuevo alias'}>
        <div className="flex flex-col gap-4">
          <Input
            label="Alias"
            placeholder="mi.alias.mp"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            autoFocus
          />
          <Input
            label="Etiqueta"
            placeholder="MP Personal"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <Button onClick={handleSave} loading={loading} disabled={!alias.trim() || !label.trim()} className="w-full">
            {editing ? 'Guardar cambios' : 'Agregar alias'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
