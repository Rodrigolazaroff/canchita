'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useGroupStore } from '@/lib/stores/group'
import { cn, nextOccurrenceOf, pricePerPlayer } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { FormationBuilder } from '@/components/match/FormationBuilder'
import { ShareImageModal } from '@/components/match/ShareImageModal'
import type { Group, Player, Venue, PaymentAlias, FormationData, MatchType } from '@/lib/types'
import { Plus } from 'lucide-react'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'

interface WizardProps {
  groups: Group[]
  userId: string
}

interface VenueResult extends Venue {}

const MATCH_TYPES: { value: MatchType; label: string }[] = [
  { value: 'futbol5', label: 'Fútbol 5' },
  { value: 'futbol8', label: 'Fútbol 8' },
  { value: 'futbol11', label: 'Fútbol 11' },
]

export function NewMatchWizard({ groups, userId }: WizardProps) {
  const router = useRouter()
  const { activeGroupId, setGroups, setActiveGroup, activeGroup } = useGroupStore()

  // Init store
  useEffect(() => {
    setGroups(groups)
    if (!activeGroupId || !groups.find(g => g.id === activeGroupId)) {
      setActiveGroup(groups[0].id)
    }
  }, [])

  const group = activeGroup()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [players, setPlayers] = useState<Player[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [guestName, setGuestName] = useState('')
  const [showGuestInput, setShowGuestInput] = useState(false)
  const [guestPlayers, setGuestPlayers] = useState<Player[]>([])

  // Step 2
  const [selectedVenue, setSelectedVenue] = useState<VenueResult | null>(null)
  const [venueManual, setVenueManual] = useState('')
  const [matchType, setMatchType] = useState<MatchType>(group?.match_type ?? 'futbol5')
  const [matchDate, setMatchDate] = useState(
    group?.day_of_week != null ? nextOccurrenceOf(group.day_of_week) : new Date().toISOString().split('T')[0]
  )
  const [matchTime, setMatchTime] = useState('21:00')
  const [totalPrice, setTotalPrice] = useState('')
  const [aliases, setAliases] = useState<PaymentAlias[]>([])
  const [selectedAlias, setSelectedAlias] = useState<string>('')

  // Step 3
  const [formation, setFormation] = useState<FormationData | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (!group) return
    const supabase = createClient()
    Promise.all([
      supabase.from('players').select('*').eq('group_id', group.id).eq('is_active', true).order('name'),
      supabase.from('payment_aliases').select('*').eq('user_id', userId).order('label'),
    ]).then(([pRes, aRes]) => {
      const sortedPlayers = sortByLastMatch(pRes.data ?? [])
      setPlayers(sortedPlayers)
      setAliases(aRes.data ?? [])
      if (aRes.data?.length) setSelectedAlias(aRes.data[0].id)
    })
  }, [group?.id])

  function sortByLastMatch(ps: Player[]) { return ps }

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

    // Create real guest players first
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

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        group_id: group.id,
        user_id: userId,
        venue_id: selectedVenue?.id ?? null,
        venue_name_override: !selectedVenue ? (venueManual || null) : null,
        match_date: matchDate,
        match_time: matchTime,
        total_price: totalPrice ? parseFloat(totalPrice) : null,
        player_count: selectedPlayers.length,
        payment_alias_id: selectedAlias || null,
        formation_data: formationData,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error || !match) {
      toast.error('Error al crear el partido')
      setSaving(false)
      return
    }

    // Insert match_players
    const matchPlayerRows = formationData.players.map(fp => ({
      match_id: match.id,
      player_id: guestMap[fp.player_id] ?? fp.player_id,
      team: fp.team,
      position_x: fp.position_x,
      position_y: fp.position_y,
    }))
    await supabase.from('match_players').insert(matchPlayerRows)

    setFormation(formationData)
    setMatchId(match.id)
    setSaving(false)
    setShareOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl text-text-primary flex-1">Crear Partido</h1>
        <span className="text-sm text-text-muted font-body">Paso {step + 1} de 3</span>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= step ? 'bg-green-primary' : 'bg-border')} />
        ))}
      </div>

      {/* Step 1 — Players */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-text-primary">¿Quiénes juegan?</h2>
            <span className="text-sm font-body text-green-light">{selected.size} confirmados</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto no-scrollbar">
            {allPlayers.map(player => {
              const isSelected = selected.has(player.id)
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-2xl border transition-all text-left w-full',
                    isSelected ? 'border-green-primary bg-green-primary/10' : 'border-border bg-surface'
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
                  <PlayerAvatar name={player.name} id={player.id} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-text-primary truncate">{player.name}</p>
                    {player.is_guest && <p className="text-xs text-yellow-400 font-body">Invitado</p>}
                  </div>
                </button>
              )
            })}
          </div>

          {showGuestInput ? (
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del invitado"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGuest()}
                autoFocus
                className="flex-1"
              />
              <Button onClick={addGuest} disabled={!guestName.trim()}>Agregar</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setShowGuestInput(true)} className="self-start">
              <Plus size={16} /> Agregar invitado
            </Button>
          )}

          <Button
            onClick={() => setStep(1)}
            disabled={selected.size < 2}
            className="w-full"
          >
            Siguiente ({selected.size} jugadores)
          </Button>
        </div>
      )}

      {/* Step 2 — Where & When */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-text-primary">¿Dónde y cuándo?</h2>

          {/* Match type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-body">Tipo de partido</label>
            <div className="flex gap-2">
              {MATCH_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMatchType(value)}
                  className={cn(
                    'flex-1 py-2 rounded-xl border text-sm font-body font-semibold transition-colors',
                    matchType === value
                      ? 'bg-green-primary border-green-primary text-white'
                      : 'bg-surface border-border text-text-secondary hover:border-green-primary/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Cancha"
            placeholder="Club Atlético Norte"
            value={venueManual}
            onChange={e => setVenueManual(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha"
              type="date"
              value={matchDate}
              onChange={e => setMatchDate(e.target.value)}
            />
            <Input
              label="Hora"
              type="time"
              value={matchTime}
              onChange={e => setMatchTime(e.target.value)}
            />
          </div>

          <Input
            label="Precio total de la cancha"
            type="number"
            prefix="$"
            placeholder="5000"
            value={totalPrice}
            onChange={e => setTotalPrice(e.target.value)}
          />

          {priceDisplay && (
            <div className="bg-green-primary/10 border border-green-primary/30 rounded-xl p-3 text-center">
              <p className="font-body text-text-muted text-sm">Cada jugador paga</p>
              <p className="font-display text-2xl text-green-light">{priceDisplay}</p>
            </div>
          )}

          {aliases.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-body">Alias de pago</label>
              <select
                value={selectedAlias}
                onChange={e => setSelectedAlias(e.target.value)}
                className="h-12 bg-surface border border-border rounded-xl px-4 text-text-primary font-body focus:outline-none focus:border-green-primary"
              >
                <option value="">Sin alias</option>
                {aliases.map(a => (
                  <option key={a.id} value={a.id}>{a.label} — {a.alias}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">Atrás</Button>
            <Button
              onClick={() => setStep(2)}
              className="flex-1"
              disabled={!matchDate || !matchTime}
            >
              Armar formación
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Formation */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-text-primary">Armá la formación</h2>
          <FormationBuilder
            players={selectedPlayers}
            matchType={matchType}
            onBack={() => setStep(1)}
            onFinish={saveMatch}
            saving={saving}
          />
        </div>
      )}

      {shareOpen && matchId && formation && (
        <ShareImageModal
          open={shareOpen}
          onClose={() => { setShareOpen(false); router.push(`/matches/${matchId}`) }}
          formation={formation}
          matchDate={matchDate}
          matchTime={matchTime}
          venueName={selectedVenue?.name ?? venueManual ?? ''}
          groupName={group?.name ?? ''}
          pricePerPlayer={priceDisplay ?? ''}
          aliasText={aliases.find(a => a.id === selectedAlias)?.alias ?? ''}
          matchId={matchId}
        />
      )}
    </div>
  )
}
