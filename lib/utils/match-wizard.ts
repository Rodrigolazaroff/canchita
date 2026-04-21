/**
 * lib/utils/match-wizard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Funciones puras para el flujo de 6 pasos de armado de un partido.
 * Sin dependencias de red. Toda la lógica de validación y construcción
 * de filas para la DB vive aquí.
 *
 * Pasos del flujo:
 *  0 — Selección de asistentes (planilla)
 *  1 — Invitados (contador numérico)
 *  2 — Armado de equipos (light / dark)
 *  3 — Resultado (score_light / score_dark)
 *  4 — Goles individuales
 *  5 — Confirmación → server action
 */

import type { MatchDraft, MatchType, Player } from '@/lib/types'
import { calcMatchWinner } from '@/lib/utils/metrics'

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Mínimo de jugadores totales (planilla + invitados) para cada modalidad. */
export const MIN_PLAYERS: Record<MatchType, number> = {
  futbol5:  10,   // 5 vs 5
  futbol8:  16,   // 8 vs 8
  futbol11: 22,   // 11 vs 11
}

/** Máximo de invitados permitidos (límite razonable de UI). */
export const MAX_GUESTS = 20

// ─── Paso 0: selección de asistentes ─────────────────────────────────────────

/**
 * Alterna la presencia de un jugador en la lista de seleccionados.
 * Devuelve un nuevo array (inmutable).
 */
export function togglePlayerSelection(
  selectedIds: string[],
  playerId: string,
): string[] {
  return selectedIds.includes(playerId)
    ? selectedIds.filter(id => id !== playerId)
    : [...selectedIds, playerId]
}

/**
 * Dado el roster completo del grupo y los IDs seleccionados,
 * devuelve los IDs de los jugadores que NO asistieron.
 * Se usan para registrar inasistencia automática al confirmar.
 */
export function buildAbsenteeIds(
  rosterIds: string[],
  selectedIds: string[],
): string[] {
  const selectedSet = new Set(selectedIds)
  return rosterIds.filter(id => !selectedSet.has(id))
}

// ─── Paso 1: invitados ────────────────────────────────────────────────────────

/** Incrementa el contador de invitados sin superar MAX_GUESTS. */
export function incrementGuests(current: number): number {
  return Math.min(current + 1, MAX_GUESTS)
}

/** Decrementa el contador de invitados sin bajar de 0. */
export function decrementGuests(current: number): number {
  return Math.max(current - 1, 0)
}

/** Setea el contador clampado entre 0 y MAX_GUESTS. */
export function setGuestCount(value: number): number {
  return Math.max(0, Math.min(value, MAX_GUESTS))
}

// ─── Paso 2: armado de equipos ────────────────────────────────────────────────

/**
 * Asigna un jugador a un equipo en el draft.
 * Devuelve un nuevo Record (inmutable).
 */
export function assignTeam(
  assignments: Record<string, 'light' | 'dark'>,
  playerId: string,
  team: 'light' | 'dark',
): Record<string, 'light' | 'dark'> {
  return { ...assignments, [playerId]: team }
}

/**
 * Quita a un jugador de cualquier equipo (queda sin asignar).
 */
export function unassignTeam(
  assignments: Record<string, 'light' | 'dark'>,
  playerId: string,
): Record<string, 'light' | 'dark'> {
  const next = { ...assignments }
  delete next[playerId]
  return next
}

/**
 * Devuelve los IDs de jugadores seleccionados que todavía no tienen equipo asignado.
 * El wizard no deja avanzar mientras haya jugadores sin asignar.
 */
export function getUnassignedPlayerIds(
  selectedIds: string[],
  assignments: Record<string, 'light' | 'dark'>,
): string[] {
  return selectedIds.filter(id => !(id in assignments))
}

// ─── Validaciones por paso ────────────────────────────────────────────────────

/**
 * Paso 0 — Mínimo de jugadores seleccionados.
 * Se verifica sumando planilla + invitados vs el mínimo de la modalidad.
 * En el Paso 0 todavía no se conocen los invitados, así que se usa 0.
 */
export function validateStep0(
  selectedCount: number,
): string | null {
  if (selectedCount === 0) return 'Seleccioná al menos un jugador de la planilla.'
  return null
}

/**
 * Paso 2 — Verificar que todos los seleccionados tienen equipo asignado.
 */
export function validateStep2(
  selectedIds: string[],
  assignments: Record<string, 'light' | 'dark'>,
): string | null {
  const unassigned = getUnassignedPlayerIds(selectedIds, assignments)
  if (unassigned.length > 0) {
    return `Faltan asignar ${unassigned.length} jugador${unassigned.length > 1 ? 'es' : ''} a un equipo.`
  }
  return null
}

/**
 * Validación final antes de confirmar el partido.
 * Verifica el mínimo de jugadores totales para la modalidad.
 */
export function validateDraftReady(draft: MatchDraft): string | null {
  const totalPlayers = draft.selected_player_ids.length + draft.guest_count
  const min = MIN_PLAYERS[draft.match_type]

  if (totalPlayers < min) {
    return `Necesitás al menos ${min} jugadores para ${draft.match_type}. Tenés ${totalPlayers}.`
  }

  if (draft.score_light === null || draft.score_dark === null) {
    return 'El resultado es obligatorio para confirmar el partido.'
  }

  if (draft.score_light < 0 || draft.score_dark < 0) {
    return 'Los goles no pueden ser negativos.'
  }

  const unassigned = getUnassignedPlayerIds(draft.selected_player_ids, draft.team_assignments)
  if (unassigned.length > 0) {
    return `${unassigned.length} jugador${unassigned.length > 1 ? 'es no tienen' : ' no tiene'} equipo asignado.`
  }

  return null
}

// ─── Construcción de filas para la DB ─────────────────────────────────────────

/**
 * Fila a insertar en match_players para un jugador de planilla que ASISTIÓ.
 */
export interface AttendedPlayerRow {
  player_id:  string
  team:       'light' | 'dark'
  attended:   true
  goals:      number
  /** Campos de formación opcionales (se pasan si viene del FormationBuilder). */
  position_x: number | null
  position_y: number | null
}

/**
 * Fila a insertar en match_players para un jugador de planilla que NO ASISTIÓ.
 */
export interface AbsentPlayerRow {
  player_id:  string
  team:       null
  attended:   false
  goals:      0
  position_x: null
  position_y: null
}

export type MatchPlayerRow = AttendedPlayerRow | AbsentPlayerRow

/**
 * Construye el array completo de filas para match_players a partir del draft.
 *
 * Incluye:
 * - Todos los jugadores seleccionados (attended = true, con equipo y goles).
 * - Todos los jugadores ausentes del roster (attended = false).
 *
 * Los invitados NO generan filas en match_players (no acumulan métricas).
 * Su número se guarda directamente en matches.guest_count.
 */
export function buildMatchPlayerRows(
  draft: MatchDraft,
  rosterIds: string[],
  positionMap?: Record<string, { x: number | null; y: number | null }>,
): MatchPlayerRow[] {
  const absenteeIds = buildAbsenteeIds(rosterIds, draft.selected_player_ids)

  const attendedRows: AttendedPlayerRow[] = draft.selected_player_ids.map(pid => ({
    player_id:  pid,
    team:       draft.team_assignments[pid] ?? 'light',
    attended:   true,
    goals:      draft.player_goals[pid] ?? 0,
    position_x: positionMap?.[pid]?.x ?? null,
    position_y: positionMap?.[pid]?.y ?? null,
  }))

  const absentRows: AbsentPlayerRow[] = absenteeIds.map(pid => ({
    player_id:  pid,
    team:       null,
    attended:   false,
    goals:      0,
    position_x: null,
    position_y: null,
  }))

  return [...attendedRows, ...absentRows]
}

/**
 * Construye el objeto a insertar en la tabla matches desde el draft.
 * No incluye match_players (esos se insertan por separado).
 */
export function buildMatchInsert(draft: MatchDraft) {
  const winner =
    draft.score_light !== null && draft.score_dark !== null
      ? calcMatchWinner(draft.score_light, draft.score_dark)
      : null

  return {
    group_id:            draft.group_id,
    season_id:           draft.season_id,
    match_date:          draft.match_date,
    match_time:          draft.match_time,
    venue_name_override: draft.venue_name ?? null,
    total_price:         draft.total_price,
    payment_alias_id:    draft.payment_alias_id ?? null,
    score_light:         draft.score_light,
    score_dark:          draft.score_dark,
    winner,
    guest_count:         draft.guest_count,
    player_count:        draft.selected_player_ids.length + draft.guest_count,
    status:              'played' as const,
  }
}

// ─── Utilidades de UI ─────────────────────────────────────────────────────────

/**
 * Devuelve true si el jugador está en el equipo light según las asignaciones.
 */
export function isInTeam(
  playerId: string,
  team: 'light' | 'dark',
  assignments: Record<string, 'light' | 'dark'>,
): boolean {
  return assignments[playerId] === team
}

/**
 * Cuenta jugadores por equipo para mostrar en el header del wizard.
 */
export function countByTeam(
  selectedIds: string[],
  assignments: Record<string, 'light' | 'dark'>,
): { light: number; dark: number; unassigned: number } {
  let light = 0
  let dark  = 0
  let unassigned = 0

  for (const id of selectedIds) {
    const team = assignments[id]
    if (team === 'light')     light++
    else if (team === 'dark') dark++
    else                      unassigned++
  }

  return { light, dark, unassigned }
}

/**
 * Suma los goles de los jugadores de planilla asignados a cada equipo.
 * Se usa para verificar que los goles individuales cuadran con el resultado.
 *
 * @returns { light, dark } — goles individuales por equipo
 */
export function sumGoalsByTeam(
  playerGoals: Record<string, number>,
  assignments: Record<string, 'light' | 'dark'>,
): { light: number; dark: number } {
  let light = 0
  let dark  = 0

  for (const [playerId, goals] of Object.entries(playerGoals)) {
    if (assignments[playerId] === 'light') light += goals
    else if (assignments[playerId] === 'dark') dark += goals
  }

  return { light, dark }
}
