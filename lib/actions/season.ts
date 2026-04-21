'use server'
/**
 * lib/actions/season.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Actions para el ciclo de vida de temporadas:
 *  - Obtener / abrir la temporada activa
 *  - Cerrar la temporada con resumen
 *  - Consultar historial
 */

import { createClient } from '@/lib/supabase/server'
import { buildSeasonSummary, getSeasonDateRange } from '@/lib/utils/season'
import { getGroupMetrics, getTeamMetrics } from '@/lib/actions/metrics'
import type { Season, SeasonSummary, StatsPageData } from '@/lib/types'

// ─── Obtener temporada activa ─────────────────────────────────────────────────

/**
 * Devuelve la temporada activa del grupo.
 * Si no existe, la crea automáticamente mediante la función SQL.
 */
export async function getOrCreateActiveSeason(
  groupId: string,
): Promise<{ season: Season | null; error: string | null }> {
  const supabase = createClient()

  // Obtener el userId de la sesión activa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { season: null, error: 'No autenticado' }

  // Llamar a la función SQL que crea la temporada si no existe
  const { data: seasonId, error: rpcError } = await supabase.rpc(
    'get_or_create_active_season',
    { p_group_id: groupId, p_user_id: user.id },
  )

  if (rpcError) return { season: null, error: rpcError.message }

  const { data: season, error: fetchError } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', seasonId)
    .single()

  return { season: season as Season | null, error: fetchError?.message ?? null }
}

/**
 * Devuelve la temporada activa existente sin crearla.
 * Devuelve null si no hay temporada activa (muestra botón "Iniciar temporada").
 */
export async function getActiveSeason(
  groupId: string,
): Promise<Season | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .maybeSingle()

  return data as Season | null
}

// ─── Abrir temporada manualmente ──────────────────────────────────────────────

/**
 * El organizador abre manualmente una nueva temporada.
 * Falla si ya existe una activa.
 */
export async function openSeason(
  groupId: string,
  year?: number,
): Promise<{ seasonId: string | null; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { seasonId: null, error: 'No autenticado' }

  const targetYear = year ?? new Date().getFullYear()

  const { data: seasonId, error } = await supabase.rpc('open_season', {
    p_group_id: groupId,
    p_user_id:  user.id,
    p_year:     targetYear,
  })

  return { seasonId: seasonId ?? null, error: error?.message ?? null }
}

// ─── Cerrar temporada ─────────────────────────────────────────────────────────

/**
 * Cierra la temporada activa de un grupo.
 *
 * Flujo:
 * 1. Calcula las métricas finales de todos los jugadores.
 * 2. Genera el SeasonSummary.
 * 3. Llama a la función SQL close_season() que persiste el resumen.
 *
 * NOTA sobre lesiones entre temporadas:
 * Las lesiones activas NO se cierran. El resumen guarda los días acumulados
 * HASTA el 31/12. En la nueva temporada el contador sigue desde el 1/1.
 * El campo player_injuries.end_date permanece null hasta que el organizador
 * levante la marca físicamente.
 */
export async function closeSeason(
  seasonId: string,
  groupId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient()

  // 1. Obtener la temporada
  const { data: season, error: seasonErr } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', seasonId)
    .single()

  if (seasonErr || !season) return { error: seasonErr?.message ?? 'Temporada no encontrada' }

  // 2. Calcular métricas finales de todos los jugadores
  const [allMetrics, teamMetricsResult] = await Promise.all([
    getGroupMetrics(groupId),
    getTeamMetrics(groupId),
  ])

  if (!teamMetricsResult) return { error: 'No se pudieron obtener las métricas de equipo' }

  // 3. Obtener total de partidos jugados en la temporada
  const { count: totalMatches } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .eq('status', 'played')

  // 4. Construir el resumen
  const [teamLight, teamDark] = teamMetricsResult
  const summary: SeasonSummary = buildSeasonSummary(
    season.year,
    totalMatches ?? 0,
    allMetrics,
    teamLight,
    teamDark,
  )

  // 5. Persistir el cierre vía función SQL
  const { error: closeErr } = await supabase.rpc('close_season', {
    p_season_id: seasonId,
    p_summary:   summary,
  })

  return { error: closeErr?.message ?? null }
}

// ─── Historial de temporadas ──────────────────────────────────────────────────

/**
 * Devuelve todas las temporadas cerradas de un grupo, ordenadas de más reciente a más antigua.
 */
export async function getSeasonHistory(groupId: string): Promise<Season[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'closed')
    .order('year', { ascending: false })

  return (data ?? []) as Season[]
}

/**
 * Devuelve el resumen de un jugador en una temporada cerrada específica.
 * Extrae el dato del campo JSONB summary.players[] del registro de la temporada.
 */
export async function getPlayerSeasonSummary(
  seasonId: string,
  playerId: string,
) {
  const supabase = createClient()
  const { data } = await supabase
    .from('seasons')
    .select('summary')
    .eq('id', seasonId)
    .single()

  if (!data?.summary) return null

  const summary = data.summary as SeasonSummary
  return summary.players.find(p => p.player_id === playerId) ?? null
}

// ─── Datos para la página de estadísticas completa ───────────────────────────

/**
 * Agrega todos los datos necesarios para la StatsPageData de un jugador:
 * métricas, rankings, métricas de equipo e historial de temporadas.
 */
export async function getStatsPageData(
  playerId: string,
  groupId: string,
): Promise<StatsPageData | null> {
  const supabase = createClient()

  // Obtener métricas de todos los jugadores para calcular rankings
  const [allMetrics, teamMetricsResult, closedSeasons] = await Promise.all([
    getGroupMetrics(groupId),
    getTeamMetrics(groupId),
    getSeasonHistory(groupId),
  ])

  const playerMetrics = allMetrics.find(m => m.player_id === playerId)
  if (!playerMetrics || !teamMetricsResult) return null

  // Calcular posición en cada ranking (1 = mejor)
  const sortedByGoals =      [...allMetrics].sort((a, b) => b.total_goals - a.total_goals)
  const sortedByAttendance = [...allMetrics].sort((a, b) => b.attendance_pct - a.attendance_pct)
  const sortedByLuck =       [...allMetrics].sort((a, b) =>
    b.win_pct !== a.win_pct ? b.win_pct - a.win_pct : b.matches_played - a.matches_played
  )

  const rank_goals      = sortedByGoals.findIndex(m => m.player_id === playerId) + 1
  const rank_attendance = sortedByAttendance.findIndex(m => m.player_id === playerId) + 1
  const rank_luck       = sortedByLuck.findIndex(m => m.player_id === playerId) + 1

  // Historial con el snapshot del jugador en cada temporada cerrada
  const season_history = await Promise.all(
    closedSeasons.map(async season => {
      const player_summary = await getPlayerSeasonSummary(season.id, playerId)
      return { season, player_summary }
    })
  )

  const [team_light, team_dark] = teamMetricsResult

  return {
    metrics: playerMetrics,
    rank_goals,
    rank_attendance,
    rank_luck,
    team_light,
    team_dark,
    season_history,
  }
}
