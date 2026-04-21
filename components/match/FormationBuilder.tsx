'use client'
import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { Button } from '@/components/ui/Button'
import { cn, initials } from '@/lib/utils/format'
import { X, RotateCcw } from 'lucide-react'
import type { Player, MatchType, FormationData, Team } from '@/lib/types'

interface Slot {
  id: string
  team: Team
  x: number
  y: number
}

const POSITIONS: Record<MatchType, Slot[]> = {
  futbol5: [
    { id: 'd-gk', team: 'dark', x: 0.5, y: 0.06 },
    { id: 'd-dl', team: 'dark', x: 0.25, y: 0.2 },
    { id: 'd-dr', team: 'dark', x: 0.75, y: 0.2 },
    { id: 'd-mid', team: 'dark', x: 0.5, y: 0.32 },
    { id: 'd-fwd', team: 'dark', x: 0.5, y: 0.44 },
    { id: 'l-fwd', team: 'light', x: 0.5, y: 0.56 },
    { id: 'l-mid', team: 'light', x: 0.5, y: 0.68 },
    { id: 'l-dl', team: 'light', x: 0.25, y: 0.8 },
    { id: 'l-dr', team: 'light', x: 0.75, y: 0.8 },
    { id: 'l-gk', team: 'light', x: 0.5, y: 0.94 },
  ],
  futbol8: [
    { id: 'd-gk', team: 'dark', x: 0.5, y: 0.04 },
    { id: 'd-dl', team: 'dark', x: 0.2, y: 0.17 },
    { id: 'd-dc', team: 'dark', x: 0.5, y: 0.17 },
    { id: 'd-dr', team: 'dark', x: 0.8, y: 0.17 },
    { id: 'd-ml', team: 'dark', x: 0.3, y: 0.3 },
    { id: 'd-mr', team: 'dark', x: 0.7, y: 0.3 },
    { id: 'd-fl', team: 'dark', x: 0.35, y: 0.43 },
    { id: 'd-fr', team: 'dark', x: 0.65, y: 0.43 },
    { id: 'l-fl', team: 'light', x: 0.35, y: 0.57 },
    { id: 'l-fr', team: 'light', x: 0.65, y: 0.57 },
    { id: 'l-ml', team: 'light', x: 0.3, y: 0.7 },
    { id: 'l-mr', team: 'light', x: 0.7, y: 0.7 },
    { id: 'l-dl', team: 'light', x: 0.2, y: 0.83 },
    { id: 'l-dc', team: 'light', x: 0.5, y: 0.83 },
    { id: 'l-dr', team: 'light', x: 0.8, y: 0.83 },
    { id: 'l-gk', team: 'light', x: 0.5, y: 0.96 },
  ],
  futbol11: [
    { id: 'd-gk', team: 'dark', x: 0.5, y: 0.04 },
    { id: 'd-d1', team: 'dark', x: 0.12, y: 0.15 },
    { id: 'd-d2', team: 'dark', x: 0.35, y: 0.17 },
    { id: 'd-d3', team: 'dark', x: 0.65, y: 0.17 },
    { id: 'd-d4', team: 'dark', x: 0.88, y: 0.15 },
    { id: 'd-m1', team: 'dark', x: 0.22, y: 0.28 },
    { id: 'd-m2', team: 'dark', x: 0.5, y: 0.3 },
    { id: 'd-m3', team: 'dark', x: 0.78, y: 0.28 },
    { id: 'd-f1', team: 'dark', x: 0.22, y: 0.42 },
    { id: 'd-f2', team: 'dark', x: 0.5, y: 0.44 },
    { id: 'd-f3', team: 'dark', x: 0.78, y: 0.42 },
    { id: 'l-f1', team: 'light', x: 0.22, y: 0.58 },
    { id: 'l-f2', team: 'light', x: 0.5, y: 0.56 },
    { id: 'l-f3', team: 'light', x: 0.78, y: 0.58 },
    { id: 'l-m1', team: 'light', x: 0.22, y: 0.72 },
    { id: 'l-m2', team: 'light', x: 0.5, y: 0.7 },
    { id: 'l-m3', team: 'light', x: 0.78, y: 0.72 },
    { id: 'l-d1', team: 'light', x: 0.12, y: 0.85 },
    { id: 'l-d2', team: 'light', x: 0.35, y: 0.83 },
    { id: 'l-d3', team: 'light', x: 0.65, y: 0.83 },
    { id: 'l-d4', team: 'light', x: 0.88, y: 0.85 },
    { id: 'l-gk', team: 'light', x: 0.5, y: 0.96 },
  ],
}

const BENCH_SLOTS = 6

interface FormationBuilderProps {
  players: Player[]
  matchType: MatchType
  onBack: () => void
  onFinish: (data: FormationData) => void
  saving: boolean
}

export function FormationBuilder({ players, matchType, onBack, onFinish, saving }: FormationBuilderProps) {
  const slots = POSITIONS[matchType]
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // delay 200ms + tolerance 8px: ignora scrolls pero detecta drags en mobile
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const assignedIds = new Set(Object.values(assignments))
  const unassigned = players.filter(p => !assignedIds.has(p.id))
  const activePlayer = players.find(p => p.id === activeId)

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const playerId = active.id as string
    const target = over.id as string
    setAssignments(prev => {
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) if (v !== playerId) next[k] = v
      if (next[target]) delete next[target]
      next[target] = playerId
      return next
    })
  }

  function unassign(playerId: string) {
    setAssignments(prev => {
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) if (v !== playerId) next[k] = v
      return next
    })
  }

  function handleFinish() {
    const placements: FormationData['players'] = []
    for (const [slotId, playerId] of Object.entries(assignments)) {
      const player = players.find(p => p.id === playerId)
      if (!player) continue
      if (slotId.startsWith('bench-')) {
        placements.push({ player_id: playerId, name: player.name, team: 'bench', position_x: null, position_y: null })
      } else {
        const slot = slots.find(s => s.id === slotId)
        if (!slot) continue
        placements.push({ player_id: playerId, name: player.name, team: slot.team, position_x: slot.x, position_y: slot.y })
      }
    }
    onFinish({ players: placements })
  }

  const placedCount = Object.keys(assignments).filter(k => !k.startsWith('bench-')).length

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }: DragStartEvent) => setActiveId(active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted font-body">
            {placedCount} en cancha · {unassigned.length} por asignar
          </span>
          {Object.keys(assignments).length > 0 && (
            <button
              onClick={() => setAssignments({})}
              className="text-text-muted hover:text-red-400 font-body flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Limpiar todo
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Left: Bench */}
          <div className="w-14 sm:w-20 flex flex-col gap-1.5">
            <p className="text-[9px] text-text-muted font-body uppercase tracking-wider text-center">Suplentes</p>
            {Array.from({ length: BENCH_SLOTS }).map((_, i) => {
              const id = `bench-${i}`
              const player = players.find(p => p.id === assignments[id])
              return <BenchSlot key={id} id={id} player={player} onUnassign={player ? () => unassign(player.id) : undefined} />
            })}
          </div>

          {/* Center: Field */}
          <div className="flex-1 min-w-0">
            <Field slots={slots} assignments={assignments} players={players} onUnassign={unassign} />
          </div>

          {/* Right: Confirmed players */}
          <div className="w-20 sm:w-24 flex flex-col gap-1.5">
            <p className="text-[9px] text-text-muted font-body uppercase tracking-wider text-center">Confirmados</p>
            <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar pr-0.5" style={{ maxHeight: '70vh' }}>
              {unassigned.length === 0 && (
                <p className="text-[10px] text-text-muted/60 font-body text-center py-2">Todos asignados</p>
              )}
              {unassigned.map(p => <DraggablePlayerChip key={p.id} player={p} />)}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onBack} className="flex-1">Atrás</Button>
          <Button onClick={handleFinish} loading={saving} className="flex-1" disabled={placedCount === 0}>
            Generar imagen
          </Button>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePlayer && (
          <div className="w-10 h-10 rounded-full border-2 border-white/60 bg-green-primary flex items-center justify-center text-white text-[10px] font-bold shadow-2xl">
            {initials(activePlayer.name)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Field({ slots, assignments, players, onUnassign }: {
  slots: Slot[]
  assignments: Record<string, string>
  players: Player[]
  onUnassign: (playerId: string) => void
}) {
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '7/10', background: '#0d2a18' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 70 100" fill="none" preserveAspectRatio="none">
        <rect x="2" y="2" width="66" height="96" stroke="#2d6a40" strokeWidth="0.8" rx="1.5"/>
        <line x1="2" y1="50" x2="68" y2="50" stroke="#2d6a40" strokeWidth="0.5" strokeDasharray="2 1.5"/>
        <circle cx="35" cy="50" r="7" stroke="#2d6a40" strokeWidth="0.5" fill="none"/>
        <rect x="17" y="2" width="36" height="10" stroke="#2d6a40" strokeWidth="0.5"/>
        <rect x="17" y="88" width="36" height="10" stroke="#2d6a40" strokeWidth="0.5"/>
      </svg>
      <div className="absolute top-1 left-0 right-0 text-center pointer-events-none">
        <span className="text-[9px] font-body text-blue-400/40 uppercase tracking-widest">Oscuro</span>
      </div>
      <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
        <span className="text-[9px] font-body text-text-primary/30 uppercase tracking-widest">Claro</span>
      </div>
      {slots.map(slot => {
        const player = players.find(p => p.id === assignments[slot.id])
        return (
          <FieldSlot
            key={slot.id}
            slot={slot}
            player={player ?? null}
            onUnassign={player ? () => onUnassign(player.id) : undefined}
          />
        )
      })}
    </div>
  )
}

function FieldSlot({ slot, player, onUnassign }: {
  slot: Slot
  player: Player | null
  onUnassign?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id })
  const isDark = slot.team === 'dark'

  return (
    <div
      ref={setNodeRef}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
    >
      {player ? (
        <button
          onClick={onUnassign}
          className={cn(
            'group relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center text-[9px] sm:text-[10px] font-bold hover:scale-110 transition-transform shadow-lg cursor-pointer',
            isDark ? 'bg-[#1e3a5f] text-blue-200 border-blue-300/50' : 'bg-[#f0fdf4] text-bg border-bg/30'
          )}
        >
          {initials(player.name)}
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex">
            <X size={9} />
          </span>
        </button>
      ) : (
        <div className={cn(
          'w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-dashed transition-all',
          isDark ? 'border-blue-300/20' : 'border-white/20',
          isOver && 'border-green-light bg-green-light/15 scale-110'
        )} />
      )}
    </div>
  )
}

function BenchSlot({ id, player, onUnassign }: {
  id: string
  player: Player | undefined
  onUnassign?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full aspect-square rounded-xl border-2 border-dashed flex items-center justify-center transition-all',
        player ? 'border-transparent bg-surface' : 'border-border',
        isOver && 'border-green-light bg-green-light/15 scale-105'
      )}
    >
      {player && (
        <button onClick={onUnassign} className="flex items-center justify-center group relative">
          <PlayerAvatar name={player.name} id={player.id} photoUrl={player.photo_url} size={32} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex">
            <X size={9} />
          </span>
        </button>
      )}
    </div>
  )
}

function DraggablePlayerChip({ player }: { player: Player }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: player.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded-full cursor-grab active:cursor-grabbing select-none hover:border-green-primary/40 transition-colors',
        isDragging && 'opacity-30'
      )}
      // touch-action:none es OBLIGATORIO en mobile para que dnd-kit capture
      // el touch antes de que el browser lo interprete como scroll
      style={{ transform: CSS.Translate.toString(transform), touchAction: 'none' }}
    >
      <PlayerAvatar name={player.name} id={player.id} photoUrl={player.photo_url} size={22} />
      <span className="text-[11px] font-body text-text-primary truncate">
        {player.name.split(' ')[0]}
      </span>
    </div>
  )
}
