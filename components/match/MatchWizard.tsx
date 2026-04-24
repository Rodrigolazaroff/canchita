'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useGroupStore } from '@/lib/stores/group'
import { cn, nextOccurrenceOf, pricePerPlayer } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { FormationBuilder } from '@/components/match/FormationBuilder'
import { ShareImageModal } from '@/components/match/ShareImageModal'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import type { Group, Player, Venue, PaymentAlias, FormationData, MatchType } from '@/lib/types'

interface WizardProps {
  groups: Group[]
  userId: string
  initialMatch?: any // Datos del partido si estamos editando
  initialPlayers?: any[] // Jugadores del partido si estamos editando
}

const MATCH_TYPES: { value: MatchType; label: string }[] = [
  { value: 'futbol5', label: 'Fútbol 5' },
  { value: 'futbol8', label: 'Fútbol 8' },
  { value: 'futbol11', label: 'Fútbol 11' },
]

export function MatchWizard({ groups, userId, initialMatch, initialPlayers }: WizardProps) {
  const router = useRouter()
  const isEditing = !!initialMatch
  const { activeGroupId, setGroups, setActiveGroup, activeGroup } = useGroupStore()

  // Init store
  useEffect(() => {
    setGroups(groups)
    if (isEditing) {
      setActiveGroup(initialMatch.group_id)
    } else if (!activeGroupId || !groups.find(g => g.id === activeGroupId)) {
      setActiveGroup(groups[0].id)
    }
  }, [])

  const group = activeGroup()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [players, setPlayers] = useState<Player[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(initialPlayers?.map(p => p.player_id) || []))
  const [guestName, setGuestName] = useState('')
  const [showGuestInput, setShowGuestInput] = useState(false)
  const [guestPlayers, setGuestPlayers] = useState<Player[]>([])

  // Step 2
  const [venueManual, setVenueManual] = useState(initialMatch?.venue_name_override || initialMatch?.venues?.name || '')
  const [matchType, setMatchType] = useState<MatchType>(initialMatch?.formation_data?.matchType || group?.match_type || 'futbol5')
  const [matchDate, setMatchDate] = useState(initialMatch?.match_date || (group?.days_of_week?.length ? nextOccurrenceOf(group.days_of_week) : new Date().toISOString().split('T')[0]))
  const [matchTime, setMatchTime] = useState(initialMatch?.match_time?.substring(0, 5) || '21:00')
  const [totalPrice, setTotalPrice] = useState(initialMatch?.total_price?.toString() || '')
  const [aliases, setAliases] = useState<PaymentAlias[]>([])
  const [selectedAlias, setSelectedAlias] = useState<string>(initialMatch?.payment_alias_id || '')

  // Step 3
  const [formation, setFormation] = useState<FormationData | null>(initialMatch?.formation_data || null)
  const [matchId, setMatchId] = useState<string | null>(initialMatch?.id || null)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (!group) return
    const supabase = createClient()
    Promise.all([
      supabase.from('players').select('*').eq('group_id', group.id).eq('is_active', true).is('deleted_at', null).order('name'),
      supabase.from('payment_aliases').select('*').eq('user_id', userId).is('deleted_at', null).order('label'),
    ]).then(([pRes, aRes]) => {
      setPlayers(pRes.data ?? [])
      setAliases(aRes.data ?? [])
      if (!isEditing && aRes.data?.length && !selectedAlias) {
        setSelectedAlias(aRes.data[0].id)
      }
    })
  }, [group?.id])

  function togglePlayer(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addGuest() {
    if (!guestName.trim() || !group) return
    const fake: Player = {
      id: `guest-${Date.now()}`,
      group_id: group.id,
      user_id: userId,
      name: guestName.trim(),
      photo_url: null,
      is_guest: true,
      guest_label: null,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    setGuestPlayers(prev => [...prev, fake])
    setSelected(prev => new Set(Array.from(prev).concat(fake.id)))
    setGuestName('')
    setShowGuestInput(false)
  }

  const allPlayers = [...players, ...guestPlayers]
  const selectedPlayers = allPlayers.filter(p => selected.has(p.id))
  const priceDisplay = totalPrice && selectedPlayers.length
    ? pricePerPlayer(parseFloat(totalPrice), selectedPlayers.length)
    : null

  async function saveMatch(formationData: FormationData) {
    if (!group) return
    setSaving(true)
    const supabase = createClient()

    // Manejar invitados nuevos
    const realGuests = guestPlayers.filter(g => selected.has(g.id))
    const guestMap: Record<string, string> = {}
    for (const g of realGuests) {
      const { data } = await supabase
        .from('players')
        .insert({ group_id: group.id, user_id: userId, name: g.name, is_guest: true })
        .select()
        .single()
      if (data) guestMap[g.id] = data.id
    }

    const matchData = {
      group_id: group.id,
      user_id: userId,
      venue_name_override: venueManual || null,
      match_date: matchDate,
      match_time: matchTime,
      total_price: totalPrice ? parseFloat(totalPrice) : null,
      player_count: selectedPlayers.length,
      payment_alias_id: selectedAlias || null,
      formation_data: formationData,
      status: 'scheduled',
    }

    let currentMatchId = matchId
    let error: any = null

    if (isEditing && matchId) {
      const { error: err } = await supabase
        .from('matches')
        .update(matchData)
        .eq('id', matchId)
      error = err
    } else {
      const { data: match, error: err } = await supabase
        .from('matches')
        .insert(matchData)
        .select()
        .single()
      error = err
      currentMatchId = match?.id || null
    }

    if (error || !currentMatchId) {
      toast.error(isEditing ? 'Error al actualizar' : 'Error al crear')
      setSaving(false)
      return
    }

    // Actualizar match_players (borrar y re-insertar para simplicidad)
    if (isEditing) {
      await supabase.from('match_players').delete().eq('match_id', currentMatchId)
    }

    const matchPlayerRows = formationData.players.map(fp => ({
      match_id: currentMatchId,
      player_id: guestMap[fp.player_id] ?? fp.player_id,
      team: fp.team,
      position_x: fp.position_x,
      position_y: fp.position_y,
    }))
    await supabase.from('match_players').insert(matchPlayerRows)

    setFormation(formationData)
    setMatchId(currentMatchId)
    setSaving(false)
    setShareOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-110px)] overflow-hidden min-h-0">
      {step !== 2 && (
        <>
          <div className="flex items-center gap-3">
            <Link href={isEditing ? `/matches/${matchId}` : "/dashboard"} className="p-1 -ml-1 text-text-muted hover:text-text-primary transition-colors">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="font-display text-2xl text-text-primary flex-1">
              {isEditing ? 'Editar Partido' : 'Crear Partido'}
            </h1>
            <span className="text-sm text-text-muted font-body">Paso {step + 1} de 3</span>
          </div>

          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= step ? 'bg-green-primary' : 'bg-border')} />
            ))}
          </div>
        </>
      )}

      {/* Step 1 — Players */}
      {step === 0 && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="font-display text-xl text-text-primary">¿Quiénes juegan?</h2>
            <span className="text-sm font-body text-green-light">{selected.size} confirmados</span>
          </div>
          
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar pb-2 min-h-0">
            {allPlayers.map(player => {
              const isSelected = selected.has(player.id)
              const injured = !!player.is_injured
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={cn(
                    'flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all text-left w-full shrink-0',
                    injured
                      ? 'border-orange-500/30 bg-surface/50 opacity-60 grayscale'
                      : isSelected
                        ? 'border-green-primary bg-green-primary/10'
                        : 'border-border bg-surface hover:border-green-primary/30'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isSelected ? 'bg-green-primary border-green-primary' : 'border-border'
                  )}>
                    {isSelected && (
                      <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <PlayerAvatar name={player.name} id={player.id} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-text-primary truncate">{player.name}</p>
                    {injured && <p className="text-[10px] text-orange-400 font-body">🩹 Lesionado</p>}
                    {!injured && player.is_guest && <p className="text-[10px] text-yellow-400 font-body">Invitado</p>}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="shrink-0 flex flex-col gap-3 pt-2 border-t border-border/50">
            {showGuestInput ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre del invitado"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGuest()}
                  autoFocus
                  className="flex-1 h-11"
                />
                <Button onClick={addGuest} disabled={!guestName.trim()} className="h-11 px-4">Agregar</Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setShowGuestInput(true)} className="self-start h-9 px-3 -ml-3 text-text-muted hover:text-text-primary">
                <Plus size={16} className="mr-1.5" /> Agregar invitado
              </Button>
            )}

            <Button
              onClick={() => setStep(1)}
              disabled={selected.size < 2}
              className="w-full h-12 text-base shadow-lg shadow-green-primary/20"
            >
              Siguiente ({selected.size} jugadores)
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Where & When */}
      {step === 1 && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="shrink-0">
            <h2 className="font-display text-xl text-text-primary">¿Dónde y cuándo?</h2>
          </div>

          <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto no-scrollbar pb-2 min-h-0 px-1">
            <div className="flex flex-col gap-1.5 shrink-0">
              <label className="text-sm text-text-secondary font-body">Tipo de partido</label>
              <div className="flex gap-2">
                {MATCH_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMatchType(value)}
                    className={cn(
                      'flex-1 h-12 rounded-xl border text-sm font-body font-semibold transition-colors',
                      matchType === value ? 'bg-green-primary border-green-primary text-white' : 'bg-surface border-border text-text-secondary hover:border-green-primary/50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Input label="Cancha" placeholder="Ej: Complejo Deportivo" value={venueManual} onChange={e => setVenueManual(e.target.value)} />

            <div className="grid grid-cols-2 gap-3 shrink-0">
              <Input label="Fecha" type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary font-body">Hora</label>
                <div className="flex h-12 bg-surface border border-border rounded-xl px-2 items-center focus-within:border-green-primary transition-colors">
                  <select value={matchTime.split(':')[0]} onChange={e => setMatchTime(`${e.target.value}:${matchTime.split(':')[1]}`)} className="flex-1 bg-transparent text-text-primary font-body text-center focus:outline-none appearance-none cursor-pointer no-scrollbar">
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (<option key={h} value={h} className="bg-surface text-text-primary">{h}</option>))}
                  </select>
                  <span className="text-text-muted font-display text-lg pb-1">:</span>
                  <select value={matchTime.split(':')[1]} onChange={e => setMatchTime(`${matchTime.split(':')[0]}:${e.target.value}`)} className="flex-1 bg-transparent text-text-primary font-body text-center focus:outline-none appearance-none cursor-pointer no-scrollbar">
                    {['00', '15', '30', '45'].map(m => (<option key={m} value={m} className="bg-surface text-text-primary">{m}</option>))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              <Input label="Precio de la cancha" type="text" inputMode="numeric" prefix="$" placeholder="5.000" value={totalPrice ? new Intl.NumberFormat('es-AR').format(Number(totalPrice)) : ''} onChange={e => setTotalPrice(e.target.value.replace(/\D/g, ''))} />
              <div className="flex flex-col gap-1.5 shrink-0">
                <label className="text-sm text-text-secondary font-body">Cada uno</label>
                {totalPrice && selectedPlayers.length ? (
                  <div className="h-12 bg-surface border border-border rounded-xl pl-8 pr-4 flex items-center justify-start transition-colors relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-body">$</span>
                    <p className="font-body text-text-primary">{new Intl.NumberFormat('es-AR').format(Math.ceil(Number(totalPrice) / selectedPlayers.length))}</p>
                  </div>
                ) : (
                  <div className="h-12 bg-surface border border-dashed border-border/50 rounded-xl px-4 flex items-center justify-center transition-colors">
                    <p className="font-body text-text-muted/50 text-sm">--</p>
                  </div>
                )}
              </div>
            </div>

            {aliases.length > 0 && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <label className="text-sm text-text-secondary font-body">Alias de pago</label>
                <select value={selectedAlias} onChange={e => setSelectedAlias(e.target.value)} className="w-full h-12 bg-surface border border-border rounded-xl px-4 text-text-primary font-body focus:outline-none focus:border-green-primary transition-colors appearance-none cursor-pointer no-scrollbar">
                  <option value="" className="bg-surface text-text-primary">Sin alias</option>
                  {aliases.map(a => (<option key={a.id} value={a.id} className="bg-surface text-text-primary">{a.label} — {a.alias}</option>))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 shrink-0 pt-2 border-t border-border/50">
            <Button variant="secondary" onClick={() => setStep(0)} className="flex-1 h-12 text-base">Atrás</Button>
            <Button onClick={() => setStep(2)} className="flex-1 h-12 text-base shadow-lg shadow-green-primary/20" disabled={!matchDate || !matchTime}>Armar formación</Button>
          </div>
        </div>
      )}

      {/* Step 3 — Formation */}
      {step === 2 && (
        <div className="flex flex-col flex-1 min-h-0">
          <FormationBuilder players={selectedPlayers} matchType={matchType} onBack={() => setStep(1)} onFinish={saveMatch} saving={saving} />
        </div>
      )}

      {shareOpen && matchId && formation && (
        <ShareImageModal
          open={shareOpen}
          onClose={() => { setShareOpen(false); router.push(`/matches/${matchId}`) }}
          formation={formation}
          matchDate={matchDate}
          matchTime={matchTime}
          venueName={venueManual ?? ''}
          groupName={group?.name ?? ''}
          pricePerPlayer={priceDisplay ?? ''}
          aliasText={aliases.find(a => a.id === selectedAlias)?.alias ?? ''}
          matchId={matchId}
        />
      )}
    </div>
  )
}
