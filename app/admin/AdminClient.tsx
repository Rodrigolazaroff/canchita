'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Venue } from '@/lib/types'

interface AdminClientProps {
  stats: {
    totalOrganizers: number
    totalGroups: number
    matchesThisMonth: number
    newOrganizersWeek: number
  }
  venues: Venue[]
}

export function AdminClient({ stats, venues: initial }: AdminClientProps) {
  const [venues, setVenues] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Venue | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)

  const statCards = [
    { label: 'Organizadores', value: stats.totalOrganizers },
    { label: 'Grupos activos', value: stats.totalGroups },
    { label: 'Partidos este mes', value: stats.matchesThisMonth },
    { label: 'Nuevos esta semana', value: stats.newOrganizersWeek },
  ]

  function openAdd() { setEditing(null); setName(''); setAddress(''); setCity(''); setOpen(true) }
  function openEdit(v: Venue) { setEditing(v); setName(v.name); setAddress(v.address ?? ''); setCity(v.city ?? ''); setOpen(true) }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    const supabase = createClient()

    if (editing) {
      const { data } = await supabase
        .from('venues')
        .update({ name: name.trim(), address: address.trim() || null, city: city.trim() || null })
        .eq('id', editing.id)
        .select()
        .single()
      if (data) setVenues(prev => prev.map(v => v.id === data.id ? data : v))
      toast.success('Cancha actualizada')
    } else {
      const { data } = await supabase
        .from('venues')
        .insert({ name: name.trim(), address: address.trim() || null, city: city.trim() || null, is_global: true })
        .select()
        .single()
      if (data) setVenues(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success('Cancha agregada')
    }

    setOpen(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('venues').delete().eq('id', id)
    setVenues(prev => prev.filter(v => v.id !== id))
    toast.success('Cancha eliminada')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">Panel de Admin</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ label, value }) => (
          <Card key={label} className="flex flex-col items-center py-5 gap-1">
            <p className="font-display text-4xl text-green-light">{value}</p>
            <p className="text-xs text-text-muted font-body text-center">{label}</p>
          </Card>
        ))}
      </div>

      {/* Global venues */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-text-primary">Canchas globales</h2>
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} /> Agregar
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {venues.map(v => (
            <Card key={v.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-body font-semibold text-text-primary">{v.name}</p>
                {(v.address || v.city) && (
                  <p className="text-xs text-text-muted font-body">
                    {[v.address, v.city].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <button onClick={() => openEdit(v)} className="p-2 text-text-muted hover:text-text-primary">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(v.id)} className="p-2 text-text-muted hover:text-red-400">
                <Trash2 size={15} />
              </button>
            </Card>
          ))}
          {venues.length === 0 && (
            <Card className="text-center py-8 text-text-muted font-body">
              No hay canchas globales aún
            </Card>
          )}
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar cancha' : 'Nueva cancha'}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre" placeholder="Ej: Complejo Central" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <Input label="Dirección (opcional)" placeholder="Ej: Av. Principal 123" value={address} onChange={e => setAddress(e.target.value)} />
          <Input label="Ciudad" placeholder="Ej: Buenos Aires" value={city} onChange={e => setCity(e.target.value)} />
          <Button onClick={handleSave} loading={loading} disabled={!name.trim()} className="w-full">
            {editing ? 'Guardar cambios' : 'Agregar cancha'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
