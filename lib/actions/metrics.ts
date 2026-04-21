'use server'
/**
 * lib/actions/metrics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Actions que conectan Supabase con las funciones de cálculo puras.
 * Cada función se importa directamente en un Server Component o en un
 * Client Component via "use server".
 */

import { createClient } from '@/lib/supabase/server'
import {
  calcPlayerMetrics,
  calcLuckRanking,
  calcTeamMetrics,
  buildMatchResultUpdate,
  buildInjuryStart,
  buildInjuryEnd,
  type PlayedMatchSummary,
} from '@/lib/utils/metrics'
import type {
  PlayerMetricsInput,
  PlayerMetrics,
  LuckRankingEntry,
  TeamMetrics,
  InjuryRecord,
  PlayerMatchSnapshot,
  MatchWinner,
} from '@/lib/types'

// ─── Métricas de un jugador ───────────────────────────────────────────────────

/**
 * Devuelve todas las métricas calculadas de un jugador.
 * Realiza 3 consultas paralelas a Supabase y luego ejecuta el cálculo en JS.
 */
export async function getPlayerMetrics(playerId: string): Promise<PlayerMetrics | null> {
  const supabase = createClient()

  const [playerRes, snapshotsRes, injuriesRes] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, group_id, is_injured, active_injury_start')
      .eq('id', playerId)
      .single(),

    supabase.rpc('get_player_match_snapshots', { p_player_id: playerId }),

    supabase
      .from('player_injuries')
      .select('*')
      .eq('player_id', playerId)
      .order('start_date', { ascending: true }),
  ])

  if (playerRes.error || !playerRes.data) return null

  const player = playerRes.data

  // Total de fechas de la temporada del grupo
  const { data: totalData } = await supabase.rpc('get_season_total_matches', {
    p_group_id: player.group_id,
  })

  const snapshots: PlayerMatchSnapshot[] = (snapshotsRes.data ?? []).map((row: any) => ({
    match_id:   row.match_id,
    match_date: row.match_date,
    attended:   row.attended,
    team:       row.team as 'light' | 'dark' | null,
    goals:      row.goals ?? 0,
    winner:     row.winner as MatchWinner | null,
  }))

  const input: PlayerMetricsInput = {
    player_id:            player.id,
    name:                 player.name,
    is_injured:           player.is_injured ?? false,
    active_injury_start:  player.active_injury_start ?? null,
    injury_history:       (injuriesRes.data ?? []) as InjuryRecord[],
    match_snapshots:      snapshots,
    season_total_matches: totalData ?? 0,
  }

  return calcPlayerMetrics(input)
}

// ─── Métricas de todos los jugadores de un grupo ──────────────────────────────

/**
 * Devuelve las métricas de todos los jugadores activos de un grupo.
 * Útil para la pantalla de estadísticas y el ranking.
 */
export async function getGroupMetrics(groupId: string): Promise<PlayerMetrics[]> {
  const supabase = createClient()

  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('group_id', groupId)
    .eq('is_active', true)

  if (!players?.length) return []

  const results = await Promise.all(
    players.map(p => getPlayerMetrics(p.id))
  )

  return results.filter((m): m is PlayerMetrics => m !== null)
}

// ─── Ranking de suerte ────────────────────────────────────────────────────────

export async function getLuckRanking(groupId: string): Promise<LuckRankingEntry[]> {
  const metrics = await getGroupMetrics(groupId)
  return calcLuckRanking(metrics)
}

// ─── Métricas de equipo ────────────────────────────────────────────────────────

export async function getTeamMetrics(
  groupId: string
): Promise<[TeamMetrics, TeamMetrics] | null> {
  const supabase = createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, winner')
    .eq('group_id', groupId)
    .eq('status', 'played')
    .not('winner', 'is', null)

  if (!matches) return null

  const summaries: PlayedMatchSummary[] = matches.map(m => ({
    match_id: m.id,
    winner: m.winner as MatchWinner,
  }))

  return calcTeamMetrics(summaries)
}

// ─── Cargar resultado de un partido ──────────────────────────────────────────

/**
 * Guarda el resultado de un partido (goles) y marca su estado como 'played'.
 * Actualiza también los goles individuales de cada jugador si se proveen.
 */
export async function saveMatchResult(
  matchId: string,
  scoreLight: number,
  scoreDark: number,
  playerGoals?: { playerId: string; goals: number }[]
): Promise<{ error: string | null }> {
  const supabase = createClient()

  // 1. Actualizar el partido con resultado y ganador
  const matchUpdate = buildMatchResultUpdate(scoreLight, scoreDark)
  const { error: matchError } = await supabase
    .from('matches')
    .update(matchUpdate)
    .eq('id', matchId)

  if (matchError) return { error: matchError.message }

  // 2. Actualizar goles individuales si se proveen
  if (playerGoals?.length) {
    const updates = playerGoals.map(({ playerId, goals }) =>
      supabase
        .from('match_players')
        .update({ goals })
        .eq('match_id', matchId)
        .eq('player_id', playerId)
    )
    await Promise.all(updates)
  }

  return { error: null }
}

// ─── Marcar / levantar lesión ─────────────────────────────────────────────────

/**
 * Marca a un jugador como lesionado.
 * Inserta un registro en player_injuries y actualiza el flag en players.
 */
export async function markInjuryStart(
  playerId: string,
  startDate?: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { injuryInsert, playerUpdate } = buildInjuryStart(playerId, startDate)

  const { error: injError } = await supabase
    .from('player_injuries')
    .insert(injuryInsert)

  if (injError) return { error: injError.message }

  const { error: playerError } = await supabase
    .from('players')
    .update(playerUpdate)
    .eq('id', playerId)

  return { error: playerError?.message ?? null }
}

/**
 * Levanta la marca de lesión de un jugador.
 * Cierra el registro activo en player_injuries (calcula days_total)
 * y limpia el flag en players.
 */
export async function markInjuryEnd(
  playerId: string,
  endDate?: string
): Promise<{ error: string | null }> {
  const supabase = createClient()

  // Buscar la lesión activa
  const { data: activeInjury, error: fetchError } = await supabase
    .from('player_injuries')
    .select('id, start_date')
    .eq('player_id', playerId)
    .is('end_date', null)
    .single()

  if (fetchError || !activeInjury) {
    return { error: fetchError?.message ?? 'No hay lesión activa para este jugador' }
  }

  const { injuryUpdate, playerUpdate } = buildInjuryEnd(
    activeInjury.id,
    activeInjury.start_date,
    endDate
  )

  const { error: injError } = await supabase
    .from('player_injuries')
    .update(injuryUpdate)
    .eq('id', activeInjury.id)

  if (injError) return { error: injError.message }

  const { error: playerError } = await supabase
    .from('players')
    .update(playerUpdate)
    .eq('id', playerId)

  return { error: playerError?.message ?? null }
}
