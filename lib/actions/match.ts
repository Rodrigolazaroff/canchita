'use server'
/**
 * lib/actions/match.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Action principal del flujo de armado de partido.
 *
 * confirmMatch() es la operación atómica final:
 *  1. Valida la temporada activa
 *  2. Valida mínimo de jugadores
 *  3. Inserta el partido (matches)
 *  4. Inserta todos los match_players (asistentes + ausentes automáticos)
 *  5. Devuelve el match_id para navegar al detalle
 *
 * Todas las métricas (goles, asistencia, victorias) se calculan on-demand
 * en las vistas — no se pre-calculan ni se cachean en columnas extra.
 * La única excepción es `winner` en matches, que se calcula aquí al confirmar.
 */

import { createClient } from '@/lib/supabase/server'
import { validateSeasonIsOpen } from '@/lib/utils/season'
import {
  validateDraftReady,
  buildMatchInsert,
  buildMatchPlayerRows,
} from '@/lib/utils/match-wizard'
import { getOrCreateActiveSeason } from '@/lib/actions/season'
import type { MatchDraft, Season } from '@/lib/types'

// ─── Tipo de respuesta ────────────────────────────────────────────────────────

export interface ConfirmMatchResult {
  matchId: string | null
  error: string | null
}

// ─── Acción principal ─────────────────────────────────────────────────────────

/**
 * Confirma un partido y lo persiste completamente en la DB.
 *
 * @param draft       Estado completo del wizard.
 * @param rosterIds   IDs de TODOS los jugadores activos del grupo
 *                    (no solo los seleccionados). Se necesitan para
 *                    registrar las inasistencias automáticas.
 * @param positionMap Opcional: posiciones X/Y del FormationBuilder por player_id.
 */
export async function confirmMatch(
  draft: MatchDraft,
  rosterIds: string[],
  positionMap?: Record<string, { x: number | null; y: number | null }>,
): Promise<ConfirmMatchResult> {
  const supabase = createClient()

  // ── Autenticación ──────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { matchId: null, error: 'No autenticado' }

  // ── 1. Validar que la temporada esté activa ────────────────────────────────
  const { season, error: seasonError } = await getOrCreateActiveSeason(draft.group_id)
  if (seasonError || !season) {
    return { matchId: null, error: seasonError ?? 'No se pudo obtener la temporada activa' }
  }

  const seasonValidationError = validateSeasonIsOpen(season as Season)
  if (seasonValidationError) {
    return { matchId: null, error: seasonValidationError }
  }

  // Asegurar que el draft tiene el season_id correcto
  const draftWithSeason: MatchDraft = { ...draft, season_id: season.id }

  // ── 2. Validar el draft (mínimo jugadores, equipos asignados, resultado) ───
  const draftError = validateDraftReady(draftWithSeason)
  if (draftError) {
    return { matchId: null, error: draftError }
  }

  // ── 3. Insertar el partido ─────────────────────────────────────────────────
  const matchInsert = {
    ...buildMatchInsert(draftWithSeason),
    user_id: user.id,
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert(matchInsert)
    .select('id')
    .single()

  if (matchError || !match) {
    return { matchId: null, error: matchError?.message ?? 'Error al crear el partido' }
  }

  // ── 4. Insertar match_players (asistentes + ausentes automáticos) ──────────
  const playerRows = buildMatchPlayerRows(draftWithSeason, rosterIds, positionMap)

  const rowsToInsert = playerRows.map(row => ({
    match_id:   match.id,
    player_id:  row.player_id,
    team:       row.team,
    attended:   row.attended,
    goals:      row.goals,
    position_x: row.position_x,
    position_y: row.position_y,
  }))

  const { error: playersError } = await supabase
    .from('match_players')
    .insert(rowsToInsert)

  if (playersError) {
    // Rollback manual: eliminar el partido recién creado para mantener consistencia
    await supabase.from('matches').delete().eq('id', match.id)
    return { matchId: null, error: `Error al registrar jugadores: ${playersError.message}` }
  }

  // ── 5. Éxito ───────────────────────────────────────────────────────────────
  return { matchId: match.id, error: null }
}

// ─── Editar resultado de un partido ya confirmado ────────────────────────────

/**
 * Permite al organizador corregir el resultado de un partido ya jugado.
 * Actualiza score_light, score_dark y recalcula winner.
 *
 * Política: solo el dueño del partido puede editarlo.
 * El RLS de Supabase garantiza esto; aquí solo se agrega la validación
 * de que el partido existe y está en estado 'played'.
 */
export async function editMatchResult(
  matchId: string,
  scoreLight: number,
  scoreDark: number,
): Promise<{ error: string | null }> {
  const supabase = createClient()

  // Verificar que el partido existe y está jugado
  const { data: existing, error: fetchError } = await supabase
    .from('matches')
    .select('id, status')
    .eq('id', matchId)
    .single()

  if (fetchError || !existing) {
    return { error: fetchError?.message ?? 'Partido no encontrado' }
  }

  if (existing.status !== 'played') {
    return { error: 'Solo se puede editar el resultado de un partido jugado' }
  }

  if (scoreLight < 0 || scoreDark < 0) {
    return { error: 'Los goles no pueden ser negativos' }
  }

  // Recalcular ganador
  const winner =
    scoreLight > scoreDark ? 'light' :
    scoreDark > scoreLight ? 'dark'  : 'draw'

  const { error: updateError } = await supabase
    .from('matches')
    .update({ score_light: scoreLight, score_dark: scoreDark, winner })
    .eq('id', matchId)

  return { error: updateError?.message ?? null }
}

// ─── Editar goles individuales ────────────────────────────────────────────────

/**
 * Actualiza los goles de uno o varios jugadores en un partido ya confirmado.
 */
export async function editPlayerGoals(
  matchId: string,
  playerGoals: { playerId: string; goals: number }[],
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const updates = playerGoals.map(({ playerId, goals }) =>
    supabase
      .from('match_players')
      .update({ goals: Math.max(0, goals) })
      .eq('match_id', matchId)
      .eq('player_id', playerId)
  )

  const results = await Promise.all(updates)
  const firstError = results.find(r => r.error)?.error

  return { error: firstError?.message ?? null }
}

// ─── Obtener draft inicial (para retomar un partido no confirmado) ────────────

/**
 * Construye un MatchDraft vacío con los defaults necesarios para iniciar el wizard.
 * Se llama al abrir el wizard de un grupo que ya tiene temporada activa.
 */
export async function buildEmptyDraft(
  groupId: string,
  matchType: import('@/lib/types').MatchType,
  matchDate: string,
  matchTime: string,
): Promise<{ draft: MatchDraft | null; error: string | null }> {
  const { season, error } = await getOrCreateActiveSeason(groupId)

  if (error || !season) {
    return { draft: null, error: error ?? 'No hay temporada activa' }
  }

  const seasonError = validateSeasonIsOpen(season as Season)
  if (seasonError) {
    return { draft: null, error: seasonError }
  }

  const draft: MatchDraft = {
    group_id:           groupId,
    season_id:          season.id,
    match_date:         matchDate,
    match_time:         matchTime,
    venue_name:         null,
    match_type:         matchType,
    total_price:        null,
    payment_alias_id:   null,
    selected_player_ids: [],
    guest_count:        0,
    team_assignments:   {},
    score_light:        null,
    score_dark:         null,
    player_goals:       {},
  }

  return { draft, error: null }
}
