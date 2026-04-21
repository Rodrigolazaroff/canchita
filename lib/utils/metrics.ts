/**
 * lib/utils/metrics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Funciones puras de cálculo de métricas para jugadores y equipos.
 * No tienen dependencias de red ni de framework: reciben datos, devuelven datos.
 *
 * Orden del archivo:
 *  1. Helpers internos
 *  2. Métricas de jugador (una función por métrica)
 *  3. Función compuesta: calcPlayerMetrics()
 *  4. Ranking de suerte
 *  5. Métricas de equipo
 *  6. Lógica de partidos (cargar resultado, ganador)
 *  7. Lógica de lesiones (marcar / levantar)
 */

import type {
  PlayerMatchSnapshot,
  PlayerMetricsInput,
  PlayerMetrics,
  AttendanceCategory,
  InjuryRecord,
  MatchWinner,
  TeamMetrics,
  LuckRankingEntry,
  Team,
} from '@/lib/types'

// ─── 1. Helpers internos ──────────────────────────────────────────────────────

/**
 * Días entre dos fechas ISO "YYYY-MM-DD" (valor absoluto, siempre >= 0).
 * Se usa UTC para evitar problemas con cambios de horario.
 */
function daysBetween(from: string, to: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const fromMs = Date.UTC(
    +from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10)
  )
  const toMs = Date.UTC(
    +to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)
  )
  return Math.max(0, Math.round(Math.abs(toMs - fromMs) / msPerDay))
}

/** Fecha de hoy en formato "YYYY-MM-DD" (local del servidor/cliente). */
function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── 2. Métricas individuales de jugador ──────────────────────────────────────

/**
 * 2.1 Goles totales
 * Suma de todos los goles registrados en los partidos donde asistió.
 */
export function calcTotalGoals(snapshots: PlayerMatchSnapshot[]): number {
  return snapshots.reduce((acc, s) => acc + (s.attended ? s.goals : 0), 0)
}

/**
 * 2.2 Partidos jugados
 * Conteo de partidos con attended === true.
 */
export function calcMatchesPlayed(snapshots: PlayerMatchSnapshot[]): number {
  return snapshots.filter(s => s.attended).length
}

/**
 * 2.3 Promedio de gol
 * goles totales / partidos jugados.
 * Devuelve 0 si partidos jugados = 0 para evitar división por cero.
 */
export function calcGoalAverage(totalGoals: number, matchesPlayed: number): number {
  if (matchesPlayed === 0) return 0
  return totalGoals / matchesPlayed
}

/**
 * 2.4 Porcentaje de asistencia
 * (partidos jugados / total de fechas de la temporada) * 100.
 * Devuelve 0 si seasonTotal = 0.
 */
export function calcAttendancePct(matchesPlayed: number, seasonTotal: number): number {
  if (seasonTotal === 0) return 0
  return (matchesPlayed / seasonTotal) * 100
}

/**
 * 2.5 Categoría de asistencia
 * Clasifica al jugador según su porcentaje de asistencia.
 */
export function calcAttendanceCategory(attendancePct: number): AttendanceCategory {
  if (attendancePct === 100) return 'Asistencia perfecta'
  if (attendancePct >= 80)  return 'Muy buena asistencia'
  if (attendancePct >= 50)  return 'Buena asistencia'
  if (attendancePct >= 1)   return 'Baja asistencia'
  return 'Sin asistencia'
}

/**
 * 2.6 Racha actual de partidos jugados
 * Recorre los snapshots de más reciente a más antiguo y cuenta
 * cuántos partidos consecutivos asistió desde el último hacia atrás.
 * Se detiene en el primer partido al que no asistió.
 * Si no asistió al último partido, la racha es 0.
 *
 * Los snapshots deben estar ordenados de más antiguo a más reciente.
 * La función los invierte internamente.
 */
export function calcCurrentStreak(snapshots: PlayerMatchSnapshot[]): number {
  // Ordenar de más reciente a más antiguo por si llegan en otro orden
  const sorted = [...snapshots].sort(
    (a, b) => b.match_date.localeCompare(a.match_date)
  )

  let streak = 0
  for (const s of sorted) {
    if (s.attended) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/**
 * 2.7 Días de lesión activa
 * Si el jugador está lesionado, calcula los días desde el inicio de la lesión activa.
 * Devuelve 0 si no está lesionado o no hay fecha de inicio.
 */
export function calcActiveInjuryDays(
  isInjured: boolean,
  activeInjuryStart: string | null
): number {
  if (!isInjured || !activeInjuryStart) return 0
  return daysBetween(activeInjuryStart, todayISO())
}

/**
 * 2.8 Total de días lesionado en la temporada
 * Suma los días de todas las lesiones cerradas (days_total) más
 * los días de la lesión activa si existe.
 */
export function calcTotalInjuryDays(
  injuryHistory: InjuryRecord[],
  activeInjuryDays: number
): number {
  const historicalDays = injuryHistory
    .filter(inj => inj.end_date !== null)       // solo lesiones cerradas
    .reduce((acc, inj) => acc + (inj.days_total ?? 0), 0)

  return historicalDays + activeInjuryDays
}

/**
 * 2.9 Victorias, derrotas y empates del jugador
 * Por cada partido jugado, compara el equipo del jugador con el ganador.
 */
export function calcPlayerRecord(snapshots: PlayerMatchSnapshot[]): {
  wins: number
  losses: number
  draws: number
} {
  let wins = 0
  let losses = 0
  let draws = 0

  for (const s of snapshots) {
    // Solo partidos donde asistió, tiene equipo asignado y hay resultado
    if (!s.attended || s.team === null || s.winner === null) continue

    if (s.winner === 'draw') {
      draws++
    } else if (s.winner === s.team) {
      wins++
    } else {
      losses++
    }
  }

  return { wins, losses, draws }
}

/**
 * 2.10 Porcentaje de victorias ("suerte")
 * ganados / partidos jugados * 100.
 * Los empates no se cuentan ni en el numerador ni alteran el denominador.
 * Devuelve 0 si partidos jugados = 0.
 */
export function calcWinPct(wins: number, matchesPlayed: number): number {
  if (matchesPlayed === 0) return 0
  return (wins / matchesPlayed) * 100
}

// ─── 3. Función compuesta ─────────────────────────────────────────────────────

/**
 * Dado el input completo de un jugador, calcula y devuelve todas
 * sus métricas en un único objeto PlayerMetrics.
 *
 * Esta es la función principal a llamar desde componentes o Server Actions.
 */
export function calcPlayerMetrics(input: PlayerMetricsInput): PlayerMetrics {
  const {
    player_id,
    name,
    is_injured,
    active_injury_start,
    injury_history,
    match_snapshots,
    season_total_matches,
  } = input

  const total_goals     = calcTotalGoals(match_snapshots)
  const matches_played  = calcMatchesPlayed(match_snapshots)
  const goal_average    = calcGoalAverage(total_goals, matches_played)

  const attendance_pct      = calcAttendancePct(matches_played, season_total_matches)
  const attendance_category = calcAttendanceCategory(attendance_pct)
  const current_streak      = calcCurrentStreak(match_snapshots)

  const active_injury_days = calcActiveInjuryDays(is_injured, active_injury_start)
  const total_injury_days  = calcTotalInjuryDays(injury_history, active_injury_days)

  const { wins, losses, draws } = calcPlayerRecord(match_snapshots)
  const win_pct = calcWinPct(wins, matches_played)

  return {
    player_id,
    name,
    total_goals,
    matches_played,
    goal_average,
    attendance_pct,
    attendance_category,
    current_streak,
    is_injured,
    active_injury_days,
    total_injury_days,
    injury_history,
    wins,
    losses,
    draws,
    win_pct,
  }
}

// ─── 4. Ranking de suerte ─────────────────────────────────────────────────────

/**
 * Devuelve el ranking de suerte de todos los jugadores recibidos,
 * ordenado de mayor a menor % de victorias.
 *
 * Criterio de desempate: mayor cantidad de partidos jugados.
 * El rango (rank) empieza en 1.
 *
 * Acepta tanto PlayerMetrics[] como PlayerMetricsInput[] (los convierte internamente).
 */
export function calcLuckRanking(metrics: PlayerMetrics[]): LuckRankingEntry[] {
  const sorted = [...metrics].sort((a, b) => {
    if (b.win_pct !== a.win_pct) return b.win_pct - a.win_pct
    return b.matches_played - a.matches_played   // desempate
  })

  return sorted.map((m, idx) => ({
    rank: idx + 1,
    player_id: m.player_id,
    name: m.name,
    win_pct: m.win_pct,
    matches_played: m.matches_played,
  }))
}

// ─── 5. Métricas de equipo ────────────────────────────────────────────────────

/**
 * Dato mínimo de un partido para calcular métricas de equipo.
 * Se obtiene de la tabla matches filtrando status = 'played'.
 */
export interface PlayedMatchSummary {
  match_id: string
  winner: MatchWinner
}

/**
 * Calcula las métricas globales de Claro (light) y Oscuro (dark)
 * a lo largo de toda la temporada.
 *
 * @param playedMatches Lista de partidos con resultado, status = 'played'.
 * @returns Tupla [teamLight, teamDark] con sus métricas.
 */
export function calcTeamMetrics(
  playedMatches: PlayedMatchSummary[]
): [TeamMetrics, TeamMetrics] {
  const total = playedMatches.length

  const light: TeamMetrics = {
    team: 'light',
    matches_played: total,
    wins: 0, losses: 0, draws: 0,
    win_pct: 0,
  }
  const dark: TeamMetrics = {
    team: 'dark',
    matches_played: total,
    wins: 0, losses: 0, draws: 0,
    win_pct: 0,
  }

  for (const m of playedMatches) {
    if (m.winner === 'draw') {
      light.draws++
      dark.draws++
    } else if (m.winner === 'light') {
      light.wins++
      dark.losses++
    } else {
      dark.wins++
      light.losses++
    }
  }

  light.win_pct = total > 0 ? (light.wins / total) * 100 : 0
  dark.win_pct  = total > 0 ? (dark.wins  / total) * 100 : 0

  return [light, dark]
}

// ─── 6. Lógica de partidos ────────────────────────────────────────────────────

/**
 * Determina el ganador de un partido dados los goles de cada equipo.
 */
export function calcMatchWinner(scoreLight: number, scoreDark: number): MatchWinner {
  if (scoreLight > scoreDark) return 'light'
  if (scoreDark > scoreLight) return 'dark'
  return 'draw'
}

/**
 * Construye el objeto a persistir en la base de datos al cargar el resultado
 * de un partido. Devuelve los campos que deben actualizarse en la tabla matches.
 *
 * Uso típico:
 *   const update = buildMatchResultUpdate(3, 1)
 *   await supabase.from('matches').update(update).eq('id', matchId)
 */
export function buildMatchResultUpdate(
  scoreLight: number,
  scoreDark: number
): { score_light: number; score_dark: number; winner: MatchWinner; status: 'played' } {
  return {
    score_light: scoreLight,
    score_dark: scoreDark,
    winner: calcMatchWinner(scoreLight, scoreDark),
    status: 'played',
  }
}

// ─── 7. Lógica de lesiones ────────────────────────────────────────────────────

/**
 * Construye el registro a insertar en la tabla player_injuries al marcar
 * a un jugador como lesionado.
 *
 * También devuelve el update para la tabla players.
 *
 * Uso típico:
 *   const { injuryInsert, playerUpdate } = buildInjuryStart(playerId)
 *   await supabase.from('player_injuries').insert(injuryInsert)
 *   await supabase.from('players').update(playerUpdate).eq('id', playerId)
 */
export function buildInjuryStart(
  playerId: string,
  startDate?: string
): {
  injuryInsert: Omit<InjuryRecord, 'id' | 'created_at'>
  playerUpdate: { is_injured: boolean; active_injury_start: string }
} {
  const start = startDate ?? todayISO()
  return {
    injuryInsert: {
      player_id: playerId,
      start_date: start,
      end_date: null,
      days_total: null,
    },
    playerUpdate: {
      is_injured: true,
      active_injury_start: start,
    },
  }
}

/**
 * Construye los updates a aplicar al levantar la marca de lesión de un jugador.
 * Cierra la lesión activa con fecha fin y calcula los días totales.
 *
 * Uso típico:
 *   const { injuryUpdate, playerUpdate } = buildInjuryEnd(activeInjuryId, activeInjuryStart)
 *   await supabase.from('player_injuries').update(injuryUpdate).eq('id', activeInjuryId)
 *   await supabase.from('players').update(playerUpdate).eq('id', playerId)
 */
export function buildInjuryEnd(
  injuryId: string,
  startDate: string,
  endDate?: string
): {
  injuryUpdate: { end_date: string; days_total: number }
  playerUpdate: { is_injured: boolean; active_injury_start: null }
} {
  const end = endDate ?? todayISO()
  return {
    injuryUpdate: {
      end_date: end,
      days_total: daysBetween(startDate, end),
    },
    playerUpdate: {
      is_injured: false,
      active_injury_start: null,
    },
  }
}
