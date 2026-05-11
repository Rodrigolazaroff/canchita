'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PlayerCardSkeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { Plus, MoreVertical, UserCheck, UserX, Pencil, Bandage, HeartPulse, Trash2, BarChart2, Minus } from 'lucide-react'
import { saveImportedStats } from '@/lib/actions/metrics'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/format'
import type { Player } from '@/lib/types'
import { trackPlayerAdded } from '@/lib/analytics'

interface PlayersClientProps {
  players: Player[]
  groupId: string
  userId: string
}

export function PlayersClient({ players: initial, groupId, userId }: PlayersClientProps) {
  const [players, setPlayers] = useState(initial)
  const [addOpen, setAddOpen] = useState(false)
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [menuPlayer, setMenuPlayer] = useState<Player | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importValues, setImportValues] = useState<Record<string, { matches: number; goals: number }>>({})
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', isGuest: false, guestLabel: '' })

  const active = players.filter(p => p.is_active)
  const inactive = players.filter(p => !p.is_active)

  async function handleAdd() {
    if (!form.name.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('players')
      .insert({
        group_id: groupId,
        user_id: userId,
        name: form.name.trim(),
        is_guest: form.isGuest,
        guest_label: form.isGuest ? form.guestLabel : null,
      })
      .select()
      .single()

    if (error) { toast.error('Error al agregar jugador'); setLoading(false); return }
    const updatedPlayers = [...players, data]
    setPlayers(updatedPlayers.sort((a, b) => a.name.localeCompare(b.name)))
    trackPlayerAdded({ is_first: players.length === 0, group_id: groupId })
    setAddOpen(false)
    setForm({ name: '', isGuest: false, guestLabel: '' })
    toast.success(`${data.name} agregado`)
    setLoading(false)
  }

  async function handleEdit() {
    if (!editPlayer || !form.name.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('players')
      .update({ name: form.name.trim(), is_guest: form.isGuest, guest_label: form.isGuest ? form.guestLabel : null })
      .eq('id', editPlayer.id)
      .select()
      .single()

    if (error) { toast.error('Error al editar'); setLoading(false); return }
    setPlayers(prev => prev.map(p => p.id === data.id ? data : p))
    setEditPlayer(null)
    toast.success('Jugador actualizado')
    setLoading(false)
  }

  async function toggleActive(player: Player) {
    const supabase = createClient()
    await supabase.from('players').update({ is_active: !player.is_active }).eq('id', player.id)
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, is_active: !p.is_active } : p))
    setMenuPlayer(null)
    toast.success(player.is_active ? 'Jugador desactivado' : 'Jugador reactivado')
  }

  async function toggleInjury(player: Player) {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    if (player.is_injured) {
      // Cerrar lesión activa
      const { data: active } = await supabase
        .from('player_injuries')
        .select('id, start_date')
        .eq('player_id', player.id)
        .is('end_date', null)
        .single()
      if (active) {
        const start = new Date(active.start_date)
        const end   = new Date(today)
        const days  = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
        await supabase.from('player_injuries').update({ end_date: today, days_total: days }).eq('id', active.id)
      }
      await supabase.from('players').update({ is_injured: false, active_injury_start: null }).eq('id', player.id)
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, is_injured: false } : p))
      toast.success(`${player.name} dado de alta ✅`)
    } else {
      // Abrir nueva lesión
      await supabase.from('player_injuries').insert({ player_id: player.id, start_date: today })
      await supabase.from('players').update({ is_injured: true, active_injury_start: today }).eq('id', player.id)
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, is_injured: true } : p))
      toast.success(`${player.name} marcado como lesionado 🩹`)
    }
    setMenuPlayer(null)
  }

  async function handleDelete(player: Player) {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${player.name}?`)) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('players')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', player.id)

    if (error) { toast.error('Error al eliminar'); setLoading(false); return }
    setPlayers(prev => prev.filter(p => p.id !== player.id))
    setMenuPlayer(null)
    toast.success('Jugador eliminado')
    setLoading(false)
  }

  function openEdit(player: Player) {
    setEditPlayer(player)
    setForm({ name: player.name, isGuest: player.is_guest, guestLabel: player.guest_label ?? '' })
    setMenuPlayer(null)
  }

  function openImport() {
    const initial: Record<string, { matches: number; goals: number }> = {}
    players.filter(p => p.is_active).forEach(p => {
      initial[p.id] = {
        matches: p.imported_matches ?? 0,
        goals:   p.imported_goals   ?? 0,
      }
    })
    setImportValues(initial)
    setImportOpen(true)
  }

  function adjustImport(playerId: string, field: 'matches' | 'goals', delta: number) {
    setImportValues(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: Math.max(0, (prev[playerId]?.[field] ?? 0) + delta),
      },
    }))
  }

  async function handleImport() {
    setLoading(true)
    const activePlayers = players.filter(p => p.is_active)
    await Promise.all(
      activePlayers.map(p =>
        saveImportedStats(p.id, importValues[p.id]?.matches ?? 0, importValues[p.id]?.goals ?? 0)
      )
    )
    setPlayers(prev => prev.map(p => ({
      ...p,
      imported_matches: importValues[p.id]?.matches ?? p.imported_matches ?? 0,
      imported_goals:   importValues[p.id]?.goals   ?? p.imported_goals   ?? 0,
    })))
    setImportOpen(false)
    toast.success('Estadísticas previas guardadas')
    setLoading(false)
  }

  function openAdd() {
    setForm({ name: '', isGuest: false, guestLabel: '' })
    setAddOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-text-primary">Jugadores</h1>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <Button size="sm" variant="ghost" onClick={openImport}>
              <BarChart2 size={16} /> Importar estadísticas
            </Button>
          )}
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} /> Agregar
          </Button>
        </div>
      </div>

      {/* Active players */}
      <div className="flex flex-col gap-2">
        {active.map(player => (
          <PlayerRow
            key={player.id}
            player={player}
            onMenu={() => setMenuPlayer(player)}
          />
        ))}
        {active.length === 0 && (
          <Card className="text-center py-8 text-text-muted font-body">
            Todavía no hay jugadores. ¡Agregá el primero!
          </Card>
        )}
      </div>

      {inactive.length > 0 && (
        <div>
          <h3 className="font-body text-sm text-text-muted mb-2 uppercase tracking-wider">Inactivos</h3>
          <div className="flex flex-col gap-2 opacity-50">
            {inactive.map(player => (
              <PlayerRow key={player.id} player={player} onMenu={() => setMenuPlayer(player)} />
            ))}
          </div>
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nuevo jugador">
        <PlayerForm form={form} onChange={setForm} onSubmit={handleAdd} loading={loading} submitLabel="Agregar" />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editPlayer} onClose={() => setEditPlayer(null)} title="Editar jugador">
        <PlayerForm form={form} onChange={setForm} onSubmit={handleEdit} loading={loading} submitLabel="Guardar" />
      </Modal>

      {/* Bulk import stats modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Estadísticas previas" className="sm:max-w-2xl overflow-hidden flex flex-col">
        <div className="flex flex-col gap-3 min-h-0 flex-1">
          <p className="font-body text-sm text-text-muted">
            Cargá los partidos y goles que cada jugador tenía antes de usar la app. Se suman a las estadísticas actuales.
          </p>
          <div className="flex items-center justify-end gap-6 px-1 pb-1 border-b border-border">
            <span className="font-body text-xs text-text-muted uppercase tracking-wider w-20 text-center">PJ</span>
            <span className="font-body text-xs text-text-muted uppercase tracking-wider w-20 text-center">Goles</span>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(70vh - 200px)' }}>
            {active.map(player => (
              <div key={player.id} className="flex items-center gap-3">
                <PlayerAvatar name={player.name} id={player.id} photoUrl={player.photo_url} size={36} />
                <span className="flex-1 font-body text-sm text-text-primary truncate">{player.name}</span>
                <StatStepper
                  value={importValues[player.id]?.matches ?? 0}
                  onDecrement={() => adjustImport(player.id, 'matches', -1)}
                  onIncrement={() => adjustImport(player.id, 'matches', +1)}
                />
                <StatStepper
                  value={importValues[player.id]?.goals ?? 0}
                  onDecrement={() => adjustImport(player.id, 'goals', -1)}
                  onIncrement={() => adjustImport(player.id, 'goals', +1)}
                />
              </div>
            ))}
          </div>
          <Button onClick={handleImport} loading={loading} className="w-full mt-2">
            Guardar estadísticas
          </Button>
        </div>
      </Modal>

      {/* Context menu */}
      <Modal open={!!menuPlayer} onClose={() => setMenuPlayer(null)}>
        {menuPlayer && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <PlayerAvatar name={menuPlayer.name} id={menuPlayer.id} size={44} />
              <div>
                <p className="font-body font-semibold text-text-primary">{menuPlayer.name}</p>
                <p className="text-sm text-text-muted font-body">{menuPlayer.is_guest ? 'Invitado' : 'Habitual'}</p>
              </div>
            </div>
            <button
              onClick={() => openEdit(menuPlayer)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-border text-text-primary font-body"
            >
              <Pencil size={18} className="text-text-muted" /> Editar nombre
            </button>
            <button
              onClick={() => toggleInjury(menuPlayer)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl font-body',
                menuPlayer.is_injured
                  ? 'hover:bg-green-primary/10 text-green-light'
                  : 'hover:bg-orange-900/20 text-orange-400'
              )}
            >
              {menuPlayer.is_injured
                ? <><HeartPulse size={18} /> Dar de alta</>
                : <><Bandage size={18} /> Marcar lesionado</>}
            </button>
            <button
              onClick={() => toggleActive(menuPlayer)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl font-body',
                menuPlayer.is_active
                  ? 'hover:bg-red-900/20 text-red-400'
                  : 'hover:bg-green-primary/10 text-green-light'
              )}
            >
              {menuPlayer.is_active
                ? <><UserX size={18} /> Desactivar jugador</>
                : <><UserCheck size={18} /> Reactivar jugador</>}
            </button>
            <button
              onClick={() => handleDelete(menuPlayer)}
              disabled={loading}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-900/40 text-red-500 font-body transition-colors"
            >
              <Trash2 size={18} /> Eliminar permanentemente
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function PlayerRow({ player, onMenu }: { player: Player; onMenu: () => void }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-4 bg-surface border rounded-2xl',
      player.is_injured ? 'border-orange-500/40' : 'border-border'
    )}>
      <PlayerAvatar name={player.name} id={player.id} photoUrl={player.photo_url} size={44} />
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-text-primary truncate">{player.name}</p>
        {player.is_injured && (
          <p className="text-xs text-orange-400 font-body">🩹 Lesionado</p>
        )}
        {!player.is_injured && player.is_guest && (
          <p className="text-xs text-text-muted font-body">
            Invitado{player.guest_label ? ` · ${player.guest_label}` : ''}
          </p>
        )}
      </div>
      <span className={cn(
        'text-xs px-2 py-0.5 rounded-full font-body',
        player.is_injured
          ? 'bg-orange-900/30 text-orange-400'
          : player.is_guest
            ? 'bg-yellow-900/30 text-yellow-400'
            : 'bg-green-primary/15 text-green-light'
      )}>
        {player.is_injured ? '🩹' : player.is_guest ? 'Invitado' : 'Habitual'}
      </span>
      <button onClick={onMenu} className="p-1 text-text-muted hover:text-text-primary">
        <MoreVertical size={18} />
      </button>
    </div>
  )
}

function StatStepper({ value, onDecrement, onIncrement }: {
  value: number
  onDecrement: () => void
  onIncrement: () => void
}) {
  return (
    <div className="flex items-center gap-1 w-16 justify-center">
      <button
        onClick={onDecrement}
        className="w-6 h-6 flex items-center justify-center rounded-lg bg-border hover:bg-border/80 text-text-muted"
      >
        <Minus size={12} />
      </button>
      <span className="w-6 text-center font-body text-sm text-text-primary tabular-nums">{value}</span>
      <button
        onClick={onIncrement}
        className="w-6 h-6 flex items-center justify-center rounded-lg bg-border hover:bg-border/80 text-text-muted"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

interface FormState { name: string; isGuest: boolean; guestLabel: string }

function PlayerForm({
  form, onChange, onSubmit, loading, submitLabel,
}: {
  form: FormState
  onChange: (f: FormState) => void
  onSubmit: () => void
  loading: boolean
  submitLabel: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Nombre"
        placeholder="Ej: Juan Pérez"
        value={form.name}
        onChange={e => onChange({ ...form, name: e.target.value })}
        autoFocus
      />
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => onChange({ ...form, isGuest: !form.isGuest })}
          className={cn(
            'w-12 h-6 rounded-full transition-colors relative',
            form.isGuest ? 'bg-green-primary' : 'bg-border'
          )}
        >
          <div className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
            form.isGuest ? 'translate-x-6' : 'translate-x-0.5'
          )} />
        </div>
        <span className="font-body text-text-secondary">Es invitado</span>
      </label>
      {form.isGuest && (
        <Input
          label="Referido por (opcional)"
          placeholder="Ej: Amigo de un amigo"
          value={form.guestLabel}
          onChange={e => onChange({ ...form, guestLabel: e.target.value })}
        />
      )}
      <Button onClick={onSubmit} loading={loading} disabled={!form.name.trim()} className="w-full">
        {submitLabel}
      </Button>
    </div>
  )
}
