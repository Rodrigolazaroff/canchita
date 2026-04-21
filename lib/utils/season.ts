/**
 * lib/utils/season.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Funciones puras para el ciclo de vida de temporadas.
 * Sin dependencias de red — reciben datos, devuelven datos.
 *
 * Secciones:
 *  1. Fechas y rango de temporada
 *  2. Estado de temporada
 *  3. Continuidad de lesiones entre temporadas
 *  4. Construcción del resumen de cierre (SeasonSummary)
 *  5. Derivación de PlayerCard desde PlayerMetrics
 */

import type {
  Season,
  SeasonSummary,
  SeasonPlayerSummary,
  PlayerMetrics,
  PlayerCard,
  InjuryRecord,
  TeamMetrics,
} from '@/lib/types'

// ─── 1. Fechas y rango de temporada ──────────────────────────────────────────

/** Año de la temporada corriente según la fecha del sistema. */
export function getCurrentSeasonYear(): number {
  return new Date().getFullYear()
}

/**
 * Devuelve el rango de fechas de una temporada.
 * Siempre es del 1/1 al 31/12 del año indicado.
 */
export function getSeasonDateRange(year: number): { starts_at: string; ends_at: string } {
  return {
    starts_at: `${year}-01-01`,
    ends_at:   `${year}-12-31`,
  }
}

/**
 * Verifica si una fecha ISO "YYYY-MM-DD" ya pasó respecto a hoy.
 * Se usa para detectar si ends_at = 31/12 ya ocurrió.
 */
export function isDatePast(isoDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(isoDate + 'T00:00:00')
  return target < today
}

/**
 * Devuelve true si la temporada activa ya expiró (ends_at < hoy).
 * Útil para mostrar un banner de "Temporada vencida — iniciá la nueva".
 */
export function isSeasonExpired(season: Pick<Season, 'ends_at' | 'status'>): boolean {
  if (season.status === 'closed') return false   // ya cerrada, no expirada
  return isDatePast(season.ends_at)
}

// ─── 2. Estado de temporada ───────────────────────────────────────────────────

/**
 * Verifica que la temporada esté activa y no expirada.
 * Se llama antes de permitir crear un partido.
 *
 * @returns null si está OK, o un string con el motivo si hay problema.
 */
export function validateSeasonIsOpen(season: Season): string | null {
  if (season.status === 'closed') {
    return `La temporada ${season.year} está cerrada. Iniciá una nueva temporada para crear partidos.`
  }
  if (isSeasonExpired(season)) {
    return `La temporada ${season.year} venció el 31/12. Cerrala y abrí la temporada ${season.year + 1}.`
  }
  return null
}

// ─── 3. Continuidad de lesiones entre temporadas ─────────────────────────────

/**
 * Calcula los días de una lesión que caen DENTRO de una temporada específica.
 *
 * Regla: si la lesión empezó antes del inicio de la temporada, solo se cuentan
 * los días desde el 1/1. Si sigue activa más allá del 31/12, solo se cuentan
 * hasta el 31/12. Si está activa hoy, se cuenta hasta hoy o el 31/12 (lo que sea menor).
 *
 * Así una lesión que atraviesa el cambio de año aporta días a cada temporada
 * sin duplicar contadores.
 *
 * @param injury        Registro de lesión (puede estar activa: end_date = null).
 * @param seasonStart   "YYYY-01-01" de la temporada.
 * @param seasonEnd     "YYYY-12-31" de la temporada.
 * @param today         Fecha de referencia para lesiones activas (por defecto: hoy).
 */
export function calcInjuryDaysInSeason(
  injury: Pick<InjuryRecord, 'start_date' | 'end_date'>,
  seasonStart: string,
  seasonEnd: string,
  today?: string,
): number {
  const msPerDay = 1000 * 60 * 60 * 24

  function toUTC(iso: string) {
    return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  }

  const todayIso = today ?? new Date().toISOString().slice(0, 10)

  // Inicio efectivo: el máximo entre el inicio de la lesión y el 1/1 de la temporada
  const effectiveStart = injury.start_date > seasonStart ? injury.start_date : seasonStart

  // Fin efectivo: el mínimo entre el fin de la lesión (o hoy si activa) y el 31/12
  const rawEnd = injury.end_date ?? todayIso
  const effectiveEnd = rawEnd < seasonEnd ? rawEnd : seasonEnd

  // Si el inicio efectivo supera el fin, la lesión no cae en esta temporada
  if (effectiveStart > effectiveEnd) return 0

  const days = Math.round(
    (toUTC(effectiveEnd) - toUTC(effectiveStart)) / msPerDay
  )
  return Math.max(0, days)
}

/**
 * Calcula los días totales de lesión de un jugador DENTRO de una temporada,
 * sumando todas sus lesiones (activas y cerradas) pero acotadas al rango de la temporada.
 *
 * Reemplaza a `calcTotalInjuryDays` de metrics.ts cuando se necesita
 * contabilizar solo los días de la temporada actual (no desde el inicio histórico).
 */
export function calcSeasonInjuryDays(
  injuries: Pick<InjuryRecord, 'start_date' | 'end_date'>[],
  seasonStart: string,
  seasonEnd: string,
  today?: string,
): number {
  return injuries.reduce(
    (acc, inj) => acc + calcInjuryDaysInSeason(inj, seasonStart, seasonEnd, today),
    0
  )
}

// ─── 4. Construcción del resumen de cierre ────────────────────────────────────

/**
 * Genera el objeto SeasonSummary que se persiste al cerrar la temporada.
 * Recibe las métricas ya calculadas de todos los jugadores y las métricas de equipo.
 *
 * @param year          Año de la temporada que se cierra.
 * @param totalMatches  Total de partidos jugados en la temporada.
 * @param metrics       Métricas de todos los jugadores del grupo en esa temporada.
 * @param teamLight     Métricas globales del equipo Claro.
 * @param teamDark      Métricas globales del equipo Oscuro.
 */
export function buildSeasonSummary(
  year: number,
  totalMatches: number,
  metrics: PlayerMetrics[],
  teamLight: TeamMetrics,
  teamDark: TeamMetrics,
): SeasonSummary {
  // Construir snapshot compacto de cada jugador
  const players: SeasonPlayerSummary[] = metrics.map(m => ({
    player_id:       m.player_id,
    name:            m.name,
    goals:           m.total_goals,
    matches_played:  m.matches_played,
    attendance_pct:  m.attendance_pct,
    wins:            m.wins,
    losses:          m.losses,
    draws:           m.draws,
    win_pct:         m.win_pct,
    total_injury_days: m.total_injury_days,
  }))

  // Premios de la temporada (null si no hay jugadores)
  const withMatches = players.filter(p => p.matches_played > 0)

  const top_scorer = withMatches.length
    ? withMatches.reduce((best, p) => p.goals > best.goals ? p : best)
    : null

  const top_attendance = withMatches.length
    ? withMatches.reduce((best, p) => p.attendance_pct > best.attendance_pct ? p : best)
    : null

  const luckiest = withMatches.length
    ? withMatches.reduce((best, p) => p.win_pct > best.win_pct ? p : best)
    : null

  return {
    year,
    total_matches: totalMatches,
    players,
    team_light: {
      wins:    teamLight.wins,
      losses:  teamLight.losses,
      draws:   teamLight.draws,
      win_pct: teamLight.win_pct,
    },
    team_dark: {
      wins:    teamDark.wins,
      losses:  teamDark.losses,
      draws:   teamDark.draws,
      win_pct: teamDark.win_pct,
    },
    top_scorer:     top_scorer     ? { player_id: top_scorer.player_id,     name: top_scorer.name,     goals: top_scorer.goals }                         : null,
    top_attendance: top_attendance ? { player_id: top_attendance.player_id, name: top_attendance.name, attendance_pct: top_attendance.attendance_pct } : null,
    luckiest:       luckiest       ? { player_id: luckiest.player_id,       name: luckiest.name,       win_pct: luckiest.win_pct }                       : null,
  }
}

// ─── 5. PlayerCard ────────────────────────────────────────────────────────────

/**
 * Extrae los campos necesarios para la Carta del Jugador desde PlayerMetrics completo.
 * No hace ningún cálculo adicional: solo selecciona las propiedades relevantes.
 */
export function toPlayerCard(metrics: PlayerMetrics): PlayerCard {
  return {
    player_id:           metrics.player_id,
    name:                metrics.name,
    total_goals:         metrics.total_goals,
    matches_played:      metrics.matches_played,
    attendance_pct:      metrics.attendance_pct,
    attendance_category: metrics.attendance_category,
    is_injured:          metrics.is_injured,
    active_injury_days:  metrics.active_injury_days,
    win_pct:             metrics.win_pct,
    current_streak:      metrics.current_streak,
  }
}

/**
 * Convierte un array de PlayerMetrics en PlayerCard[].
 * Útil para renderizar la lista de jugadores del grupo.
 */
export function toPlayerCards(metrics: PlayerMetrics[]): PlayerCard[] {
  return metrics.map(toPlayerCard)
}
