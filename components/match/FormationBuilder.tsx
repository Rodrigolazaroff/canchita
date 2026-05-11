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
import { X, RotateCcw, Shuffle } from 'lucide-react'
import type { Player, MatchType, FormationData, Team } from '@/lib/types'

interface Slot {
  id: string
  team: Team
  x: number
  y: number
}

function buildFormation(name: string, dark: { id: string; x: number; y: number }[]): { name: string; slots: Slot[] } {
  const darkSlots: Slot[] = dark.map(s => ({ ...s, team: 'dark' as Team }))
  const lightSlots: Slot[] = dark.map(s => ({
    id: s.id.replace('d-', 'l-'),
    team: 'light' as Team,
    x: 1 - s.x,
    y: s.y,
  }))
  return { name, slots: [...darkSlots, ...lightSlots] }
}

// y positions standardized by group size so equal-sized lines always share the same rows
const Y1 = [0.5]
const Y2 = [0.28, 0.72]
const Y3 = [0.17, 0.5, 0.83]
const Y4 = [0.1, 0.37, 0.63, 0.9]

const FORMATIONS: Record<MatchType, { name: string; slots: Slot[] }[]> = {
  futbol5: [
    buildFormation('1-2-1', [
      { id: 'd-gk',  x: 0.05, y: Y1[0] },
      { id: 'd-d1',  x: 0.2,  y: Y1[0] },
      { id: 'd-m1',  x: 0.33, y: Y2[0] },
      { id: 'd-m2',  x: 0.33, y: Y2[1] },
      { id: 'd-f1',  x: 0.44, y: Y1[0] },
    ]),
    buildFormation('2-2', [
      { id: 'd-gk',  x: 0.05, y: Y1[0] },
      { id: 'd-d1',  x: 0.22, y: Y2[0] },
      { id: 'd-d2',  x: 0.22, y: Y2[1] },
      { id: 'd-f1',  x: 0.4,  y: Y2[0] },
      { id: 'd-f2',  x: 0.4,  y: Y2[1] },
    ]),
    buildFormation('2-1-1', [
      { id: 'd-gk',  x: 0.05, y: Y1[0] },
      { id: 'd-d1',  x: 0.2,  y: Y2[0] },
      { id: 'd-d2',  x: 0.2,  y: Y2[1] },
      { id: 'd-m1',  x: 0.33, y: Y1[0] },
      { id: 'd-f1',  x: 0.44, y: Y1[0] },
    ]),
  ],
  futbol8: [
    buildFormation('2-3-2', [
      { id: 'd-gk',  x: 0.04, y: Y1[0] },
      { id: 'd-d1',  x: 0.15, y: Y2[0] },
      { id: 'd-d2',  x: 0.15, y: Y2[1] },
      { id: 'd-m1',  x: 0.27, y: Y3[0] },
      { id: 'd-m2',  x: 0.27, y: Y3[1] },
      { id: 'd-m3',  x: 0.27, y: Y3[2] },
      { id: 'd-f1',  x: 0.4,  y: Y2[0] },
      { id: 'd-f2',  x: 0.4,  y: Y2[1] },
    ]),
    buildFormation('3-3-1', [
      { id: 'd-gk',  x: 0.04, y: Y1[0] },
      { id: 'd-d1',  x: 0.15, y: Y3[0] },
      { id: 'd-d2',  x: 0.15, y: Y3[1] },
      { id: 'd-d3',  x: 0.15, y: Y3[2] },
      { id: 'd-m1',  x: 0.29, y: Y3[0] },
      { id: 'd-m2',  x: 0.29, y: Y3[1] },
      { id: 'd-m3',  x: 0.29, y: Y3[2] },
      { id: 'd-f1',  x: 0.42, y: Y1[0] },
    ]),
    buildFormation('3-2-2', [
      { id: 'd-gk',  x: 0.04, y: Y1[0] },
      { id: 'd-d1',  x: 0.14, y: Y3[0] },
      { id: 'd-d2',  x: 0.14, y: Y3[1] },
      { id: 'd-d3',  x: 0.14, y: Y3[2] },
      { id: 'd-m1',  x: 0.28, y: Y2[0] },
      { id: 'd-m2',  x: 0.28, y: Y2[1] },
      { id: 'd-f1',  x: 0.41, y: Y2[0] },
      { id: 'd-f2',  x: 0.41, y: Y2[1] },
    ]),
  ],
  futbol11: [
    buildFormation('4-4-2', [
      { id: 'd-gk',  x: 0.04, y: Y1[0] },
      { id: 'd-d1',  x: 0.13, y: Y4[0] },
      { id: 'd-d2',  x: 0.13, y: Y4[1] },
      { id: 'd-d3',  x: 0.13, y: Y4[2] },
      { id: 'd-d4',  x: 0.13, y: Y4[3] },
      { id: 'd-m1',  x: 0.27, y: Y4[0] },
      { id: 'd-m2',  x: 0.27, y: Y4[1] },
      { id: 'd-m3',  x: 0.27, y: Y4[2] },
      { id: 'd-m4',  x: 0.27, y: Y4[3] },
      { id: 'd-f1',  x: 0.41, y: Y2[0] },
      { id: 'd-f2',  x: 0.41, y: Y2[1] },
    ]),
    buildFormation('4-3-3', [
      { id: 'd-gk',  x: 0.04, y: Y1[0] },
      { id: 'd-d1',  x: 0.13, y: Y4[0] },
      { id: 'd-d2',  x: 0.13, y: Y4[1] },
      { id: 'd-d3',  x: 0.13, y: Y4[2] },
      { id: 'd-d4',  x: 0.13, y: Y4[3] },
      { id: 'd-m1',  x: 0.27, y: Y3[0] },
      { id: 'd-m2',  x: 0.27, y: Y3[1] },
      { id: 'd-m3',  x: 0.27, y: Y3[2] },
      { id: 'd-f1',  x: 0.41, y: Y3[0] },
      { id: 'd-f2',  x: 0.41, y: Y3[1] },
      { id: 'd-f3',  x: 0.41, y: Y3[2] },
    ]),
    buildFormation('4-3-1-2', [
      { id: 'd-gk',  x: 0.04, y: Y1[0] },
      { id: 'd-d1',  x: 0.12, y: Y4[0] },
      { id: 'd-d2',  x: 0.12, y: Y4[1] },
      { id: 'd-d3',  x: 0.12, y: Y4[2] },
      { id: 'd-d4',  x: 0.12, y: Y4[3] },
      { id: 'd-m1',  x: 0.24, y: Y3[0] },
      { id: 'd-m2',  x: 0.24, y: Y3[1] },
      { id: 'd-m3',  x: 0.24, y: Y3[2] },
      { id: 'd-a1',  x: 0.36, y: Y1[0] },
      { id: 'd-f1',  x: 0.43, y: Y2[0] },
      { id: 'd-f2',  x: 0.43, y: Y2[1] },
    ]),
  ],
}

const BENCH_PER_TEAM = 3

interface FormationBuilderProps {
  players: Player[]
  matchType: MatchType
  onBack: () => void
  onFinish: (data: FormationData) => void
  saving: boolean
}

export function FormationBuilder({ players, matchType, onBack, onFinish, saving }: FormationBuilderProps) {
  const [selectedFormationDark, setSelectedFormationDark] = useState(0)
  const [selectedFormationLight, setSelectedFormationLight] = useState(0)
  const darkSlots  = FORMATIONS[matchType][selectedFormationDark].slots.filter(s => s.team === 'dark')
  const lightSlots = FORMATIONS[matchType][selectedFormationLight].slots.filter(s => s.team === 'light')
  const slots = [...darkSlots, ...lightSlots]
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  function changeFormationDark(idx: number) {
    const oldDark = FORMATIONS[matchType][selectedFormationDark].slots.filter(s => s.team === 'dark')
    const newDark = FORMATIONS[matchType][idx].slots.filter(s => s.team === 'dark')
    const next: Record<string, string> = {}
    newDark.forEach((slot, i) => {
      const prev = oldDark[i]
      if (prev && assignments[prev.id]) next[slot.id] = assignments[prev.id]
    })
    lightSlots.forEach(slot => { if (assignments[slot.id]) next[slot.id] = assignments[slot.id] })
    for (let i = 0; i < BENCH_PER_TEAM; i++) {
      if (assignments[`bench-dark-${i}`])  next[`bench-dark-${i}`]  = assignments[`bench-dark-${i}`]
      if (assignments[`bench-light-${i}`]) next[`bench-light-${i}`] = assignments[`bench-light-${i}`]
    }
    setSelectedFormationDark(idx)
    setAssignments(next)
  }

  function changeFormationLight(idx: number) {
    const oldLight = FORMATIONS[matchType][selectedFormationLight].slots.filter(s => s.team === 'light')
    const newLight = FORMATIONS[matchType][idx].slots.filter(s => s.team === 'light')
    const next: Record<string, string> = {}
    darkSlots.forEach(slot => { if (assignments[slot.id]) next[slot.id] = assignments[slot.id] })
    newLight.forEach((slot, i) => {
      const prev = oldLight[i]
      if (prev && assignments[prev.id]) next[slot.id] = assignments[prev.id]
    })
    for (let i = 0; i < BENCH_PER_TEAM; i++) {
      if (assignments[`bench-dark-${i}`])  next[`bench-dark-${i}`]  = assignments[`bench-dark-${i}`]
      if (assignments[`bench-light-${i}`]) next[`bench-light-${i}`] = assignments[`bench-light-${i}`]
    }
    setSelectedFormationLight(idx)
    setAssignments(next)
  }

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

  function randomize() {
    // Jugadores sin asignar al campo (excluye ya asignados a campo)
    const fieldSlotIds = slots.map(s => s.id)
    const assignedToField = new Set(
      Object.entries(assignments).filter(([k]) => fieldSlotIds.includes(k)).map(([, v]) => v)
    )
    const toPlace = players.filter(p => !assignedToField.has(p.id))
    // Slots de campo vacíos
    const emptySlots = slots.filter(s => !assignments[s.id])
    // Mezclar jugadores
    const shuffled = [...toPlace].sort(() => Math.random() - 0.5)
    const next: Record<string, string> = { ...assignments }
    // Limpiar bench previo
    for (let i = 0; i < BENCH_PER_TEAM; i++) {
      delete next[`bench-dark-${i}`]
      delete next[`bench-light-${i}`]
    }
    // Asignar a slots vacíos del campo
    emptySlots.forEach((slot, i) => {
      if (shuffled[i]) next[slot.id] = shuffled[i].id
    })
    // Jugadores sobrantes → bench alternado dark/light
    const leftover = shuffled.slice(emptySlots.length)
    let darkBench = 0, lightBench = 0
    leftover.forEach((p, i) => {
      if (i % 2 === 0 && darkBench < BENCH_PER_TEAM) {
        next[`bench-dark-${darkBench++}`] = p.id
      } else if (lightBench < BENCH_PER_TEAM) {
        next[`bench-light-${lightBench++}`] = p.id
      }
    })
    setAssignments(next)
  }

  function handleFinish() {
    const placements: FormationData['players'] = []
    for (const [slotId, playerId] of Object.entries(assignments)) {
      const player = players.find(p => p.id === playerId)
      if (!player) continue
      if (slotId.startsWith('bench-')) {
        const benchTeam: Team = slotId.startsWith('bench-dark-') ? 'dark'
          : slotId.startsWith('bench-light-') ? 'light'
          : 'bench'
        placements.push({ player_id: playerId, name: player.name, team: benchTeam, position_x: null, position_y: null })
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
      {/* ── Mobile: flex column que llena el contenedor (overflow-hidden del padre) ─────
           ── Desktop: grid de dos columnas                                            ── */}
      <div className="flex flex-col h-full lg:grid lg:grid-cols-[1fr,320px] lg:gap-6">

        {/* ── Columna izquierda (desktop) / parte superior (mobile) ── */}
        <div className="lg:flex lg:flex-col lg:flex-1 lg:min-h-0 shrink-0 lg:shrink">

          {/* Formaciones (fila superior) + estado/acciones (fila inferior) */}
          <div className="flex items-start justify-between gap-2 mb-2">
            {/* Izquierda: pills oscuro + estado */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                {FORMATIONS[matchType].map((f, i) => (
                  <button
                    key={f.name}
                    onClick={() => changeFormationDark(i)}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-body font-semibold border transition-colors',
                      selectedFormationDark === i
                        ? 'bg-blue-700 border-blue-700 text-white'
                        : 'bg-surface border-border text-text-muted hover:border-blue-400/40'
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <span className="text-xs text-text-muted font-body">
                {placedCount} en cancha · {unassigned.length} por asignar
              </span>
            </div>
            {/* Derecha: pills claro + aleatorizar/limpiar */}
            <div className="flex flex-col gap-1 items-end">
              <div className="flex items-center gap-1">
                {FORMATIONS[matchType].map((f, i) => (
                  <button
                    key={f.name}
                    onClick={() => changeFormationLight(i)}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-body font-semibold border transition-colors',
                      selectedFormationLight === i
                        ? 'bg-slate-300 border-slate-300 text-black'
                        : 'bg-surface border-border text-text-muted hover:border-white/20'
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={randomize} className="text-green-light font-body flex items-center gap-1 text-xs">
                  <Shuffle size={12} /> Aleatorizar
                </button>
                {Object.keys(assignments).length > 0 && (
                  <button onClick={() => setAssignments({})} className="text-text-muted hover:text-red-400 font-body flex items-center gap-1 text-xs">
                    <RotateCcw size={12} /> Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Campo */}
          <div className="flex items-center justify-center lg:flex-1 lg:min-h-0">
            <Field slots={slots} assignments={assignments} players={players} onUnassign={unassign} />
          </div>

          {/* Botones — solo desktop */}
          <div className="hidden lg:flex gap-3 pt-3">
            <Button variant="secondary" onClick={onBack} className="flex-1">Atrás</Button>
            <Button onClick={handleFinish} loading={saving} className="flex-1" disabled={placedCount === 0}>
              Generar imagen
            </Button>
          </div>
        </div>

        {/* ── Panel de jugadores: scrolleable en AMBAS vistas ── */}
        <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar flex flex-col gap-4 mt-3 lg:mt-0 pb-1">
          {/* Jugadores sin asignar */}
          {unassigned.length > 0 && (
            <div className="flex flex-col gap-3 shrink-0">
              <p className="text-xs font-body font-semibold uppercase tracking-widest text-text-muted">
                Por asignar
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {unassigned.map(p => <DraggablePlayerChip key={p.id} player={p} />)}
              </div>
            </div>
          )}

          {/* Suplentes */}
          <div className="flex flex-col gap-6 shrink-0">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-body font-semibold uppercase tracking-widest text-blue-400 border-b border-blue-400/20 pb-1">Suplentes Oscuro</p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: BENCH_PER_TEAM }).map((_, i) => {
                  const id = `bench-dark-${i}`
                  const player = players.find(p => p.id === assignments[id])
                  return <BenchSlot key={id} id={id} player={player} onUnassign={player ? () => unassign(player.id) : undefined} />
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-body font-semibold uppercase tracking-widest text-slate-300 border-b border-slate-300/20 pb-1">Suplentes Claro</p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: BENCH_PER_TEAM }).map((_, i) => {
                  const id = `bench-light-${i}`
                  const player = players.find(p => p.id === assignments[id])
                  return <BenchSlot key={id} id={id} player={player} onUnassign={player ? () => unassign(player.id) : undefined} />
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Botones fijos en mobile — siempre visibles al fondo */}
        <div className="lg:hidden shrink-0 flex gap-3 pt-3 pb-1 border-t border-border/40 mt-1">
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
    <div className="flex flex-col items-center gap-2 mx-auto" style={{ width: 'min(100%, 660px)' }}>
    <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-border" style={{ aspectRatio: '3/2' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 70" fill="none" preserveAspectRatio="none">
        <defs>
          <pattern id="grass" x="0" y="0" width="8" height="70" patternUnits="userSpaceOnUse">
            <rect width="4" height="70" fill="#1d6b2f"/>
            <rect x="4" width="4" height="70" fill="#1a6129"/>
          </pattern>
        </defs>

        {/* Fondo verde rayado */}
        <rect width="100" height="70" fill="url(#grass)"/>

        {/* Borde del campo */}
        <rect x="2" y="2" width="96" height="66" stroke="white" strokeWidth="0.5" fill="none"/>

        {/* Línea del medio */}
        <line x1="50" y1="2" x2="50" y2="68" stroke="white" strokeWidth="0.5"/>

        {/* Círculo central */}
        <circle cx="50" cy="35" r="9" stroke="white" strokeWidth="0.5" fill="none"/>
        <circle cx="50" cy="35" r="0.6" fill="white"/>

        {/* Área grande izquierda */}
        <rect x="2" y="15.5" width="15" height="39" stroke="white" strokeWidth="0.5" fill="none"/>
        {/* Área chica izquierda */}
        <rect x="2" y="26" width="5" height="18" stroke="white" strokeWidth="0.5" fill="none"/>
        {/* Punto de penal izquierdo */}
        <circle cx="12" cy="35" r="0.6" fill="white"/>
        {/* Semicírculo penal izquierdo */}
        <path d="M 17 28.1 A 8.5 8.5 0 0 1 17 41.9" stroke="white" strokeWidth="0.5" fill="none"/>
        {/* Arcos de esquina izquierdos */}
        <path d="M 4.5 2 A 2.5 2.5 0 0 1 2 4.5" stroke="white" strokeWidth="0.5" fill="none"/>
        <path d="M 2 65.5 A 2.5 2.5 0 0 1 4.5 68" stroke="white" strokeWidth="0.5" fill="none"/>

        {/* Área grande derecha */}
        <rect x="83" y="15.5" width="15" height="39" stroke="white" strokeWidth="0.5" fill="none"/>
        {/* Área chica derecha */}
        <rect x="93" y="26" width="5" height="18" stroke="white" strokeWidth="0.5" fill="none"/>
        {/* Punto de penal derecho */}
        <circle cx="88" cy="35" r="0.6" fill="white"/>
        {/* Semicírculo penal derecho */}
        <path d="M 83 28.1 A 8.5 8.5 0 0 0 83 41.9" stroke="white" strokeWidth="0.5" fill="none"/>
        {/* Arcos de esquina derechos */}
        <path d="M 95.5 2 A 2.5 2.5 0 0 0 98 4.5" stroke="white" strokeWidth="0.5" fill="none"/>
        <path d="M 98 65.5 A 2.5 2.5 0 0 0 95.5 68" stroke="white" strokeWidth="0.5" fill="none"/>

        {/* Arcos de esquina izquierda adicionales ya arriba */}

        {/* Arco del arco (portería) izquierda */}
        <rect x="0" y="31" width="2" height="8" stroke="white" strokeWidth="0.5" fill="#155222"/>
        {/* Portería derecha */}
        <rect x="98" y="31" width="2" height="8" stroke="white" strokeWidth="0.5" fill="#155222"/>
      </svg>

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
    {/* Etiquetas debajo de la cancha */}
    <div className="flex w-full">
      <div className="flex-1 flex justify-center">
        <span className="text-xs font-body text-blue-400/70 uppercase tracking-widest font-bold">Oscuro</span>
      </div>
      <div className="flex-1 flex justify-center">
        <span className="text-xs font-body text-white/50 uppercase tracking-widest font-bold">Claro</span>
      </div>
    </div>
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
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
      style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
    >
      {player ? (
        <div className="flex flex-col items-center">
          <button
            onClick={onUnassign}
            className={cn(
              'group relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-[11px] font-bold hover:scale-110 transition-transform shadow-lg cursor-pointer',
              isDark ? 'bg-black text-white border-white' : 'bg-white text-black border-black'
            )}
          >
            {initials(player.name)}
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex">
              <X size={10} />
            </span>
          </button>
          <span className={cn(
            'text-[9px] sm:text-[10px] font-body font-semibold truncate max-w-[60px] sm:max-w-[75px] text-center mt-0.5 px-1 rounded shadow-sm',
            isDark ? 'text-blue-100 bg-blue-900/60' : 'text-bg bg-white/80'
          )}>
            {player.name}
          </span>
        </div>
      ) : (
        <div className={cn(
          'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-dashed transition-all',
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
        'w-full h-16 rounded-xl border-2 border-dashed flex items-center justify-center transition-all',
        player ? 'border-transparent bg-surface shadow-sm' : 'border-border',
        isOver && 'border-green-light bg-green-light/15 scale-105'
      )}
    >
      {player && (
        <button onClick={onUnassign} className="flex items-center justify-center group relative w-full h-full px-2 gap-2">
          <PlayerAvatar name={player.name} id={player.id} photoUrl={player.photo_url} size={36} />
          <span className="text-sm font-body font-semibold text-text-primary truncate flex-1 text-left">{player.name}</span>
          <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex">
            <X size={14} />
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
        'flex items-center gap-2.5 px-3 py-2.5 bg-surface border border-border rounded-xl cursor-grab active:cursor-grabbing select-none hover:border-green-primary/40 transition-colors shadow-sm',
        isDragging && 'opacity-30'
      )}
      // touch-action:none es OBLIGATORIO en mobile para que dnd-kit capture
      // el touch antes de que el browser lo interprete como scroll
      style={{ transform: CSS.Translate.toString(transform), touchAction: 'none' }}
    >
      <PlayerAvatar name={player.name} id={player.id} photoUrl={player.photo_url} size={28} />
      <span className="text-sm font-body font-semibold text-text-primary truncate flex-1">
        {player.name}
      </span>
    </div>
  )
}
