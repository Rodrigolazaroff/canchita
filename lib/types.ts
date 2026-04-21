export type MatchType = 'futbol5' | 'futbol8' | 'futbol11'
export type MatchStatus = 'scheduled' | 'played' | 'cancelled'
export type Team = 'dark' | 'light' | 'bench'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export interface Group {
  id: string
  user_id: string
  name: string
  day_of_week: number | null
  match_type: MatchType | null
  deleted_at: string | null
  created_at: string
}

export interface Player {
  id: string
  group_id: string
  user_id: string
  name: string
  photo_url: string | null
  is_guest: boolean
  guest_label: string | null
  is_active: boolean
  is_injured?: boolean
  active_injury_start?: string | null
  created_at: string
}

export interface Venue {
  id: string
  name: string
  address: string | null
  city: string | null
  is_global: boolean
  user_id: string | null
  created_at: string
}

export interface PaymentAlias {
  id: string
  user_id: string
  alias: string
  label: string
  created_at: string
}

export interface Match {
  id: string
  group_id: string
  user_id: string
  venue_id: string | null
  venue_name_override: string | null
  match_date: string
  match_time: string
  total_price: number | null
  player_count: number | null
  payment_alias_id: string | null
  score_dark: number | null
  score_light: number | null
  status: MatchStatus
  formation_data: FormationData | null
  share_image_url: string | null
  created_at: string
  venues?: Venue
  payment_aliases?: PaymentAlias
}

export interface MatchPlayer {
  id: string
  match_id: string
  player_id: string
  team: Team | null
  position_x: number | null
  position_y: number | null
  goals: number
  assists: number
  attended: boolean
  players?: Player
}

export interface FormationData {
  players: {
    player_id: string
    name: string
    team: Team
    position_x: number | null
    position_y: number | null
  }[]
}

export interface PlayerStats {
  player_id: string
  name: string
  group_id: string
  user_id: string
  matches_played: number
  total_goals: number
  total_assists: number
  wins: number
}

// ─── Lesiones ─────────────────────────────────────────────────────────────────

/** Una lesión cerrada (fecha_fin está siempre presente). */
export interface InjuryRecord {
  id: string
  player_id: string
  /** ISO date string "YYYY-MM-DD" */
  start_date: string
  /** ISO date string "YYYY-MM-DD". Null = lesión activa en curso. */
  end_date: string | null
  /** Pre-calculado al cerrar la lesión. Null mientras esté activa. */
  days_total: number | null
  created_at: string
}

// ─── Resultado de partido ──────────────────────────────────────────────────────

export type MatchWinner = 'light' | 'dark' | 'draw'

/** Resultado cargado al terminar un partido. */
export interface MatchResult {
  match_id: string
  score_light: number
  score_dark: number
  /** Calculado al momento de guardar: light | dark | draw */
  winner: MatchWinner
}

// ─── Métricas calculadas ───────────────────────────────────────────────────────

export type AttendanceCategory =
  | 'Asistencia perfecta'
  | 'Muy buena asistencia'
  | 'Buena asistencia'
  | 'Baja asistencia'
  | 'Sin asistencia'

/** Todas las métricas de un jugador calculadas en un único objeto. */
export interface PlayerMetrics {
  player_id: string
  name: string

  // — Goles y partidos —
  total_goals: number
  matches_played: number
  goal_average: number          // goles / partidos (0 si partidos = 0)

  // — Asistencia —
  attendance_pct: number        // 0–100
  attendance_category: AttendanceCategory
  current_streak: number        // partidos consecutivos más recientes

  // — Lesiones —
  is_injured: boolean
  active_injury_days: number    // 0 si no está lesionado
  total_injury_days: number     // suma histórica (lesiones cerradas + activa)
  injury_history: InjuryRecord[]

  // — Resultados —
  wins: number
  losses: number
  draws: number
  win_pct: number               // 0–100 (0 si partidos = 0)
}

/** Métricas del equipo Claro u Oscuro en toda la temporada. */
export interface TeamMetrics {
  team: Exclude<Team, 'bench'>
  matches_played: number
  wins: number
  losses: number
  draws: number
  win_pct: number               // 0–100
}

/** Entrada del ranking de suerte. */
export interface LuckRankingEntry {
  rank: number
  player_id: string
  name: string
  win_pct: number
  matches_played: number
}

// ─── Tipos de entrada para las funciones de cálculo ───────────────────────────

/**
 * Snapshot de un partido desde la perspectiva de un jugador.
 * Se construye uniendo Match + MatchPlayer + resultado.
 */
export interface PlayerMatchSnapshot {
  match_id: string
  match_date: string            // "YYYY-MM-DD"
  attended: boolean
  /** null si no fue asignado a ningún equipo (bench/ausente) */
  team: 'light' | 'dark' | null
  goals: number
  /** null si el partido no tiene resultado todavía */
  winner: MatchWinner | null
}

/**
 * Datos planos de un jugador necesarios para calcular todas sus métricas.
 * Se obtienen con una sola consulta que une players + match_players + injuries.
 */
export interface PlayerMetricsInput {
  player_id: string
  name: string
  is_injured: boolean
  /** Fecha de inicio de la lesión activa, si la hay. */
  active_injury_start: string | null
  injury_history: InjuryRecord[]
  /** Lista completa de partidos de la temporada ordenados de más antiguo a más reciente. */
  match_snapshots: PlayerMatchSnapshot[]
  /** Total de fechas/partidos de la temporada (denominador de asistencia). */
  season_total_matches: number
  /**
   * Fecha de inicio de la temporada activa ("YYYY-01-01").
   * Se usa como piso para calcular días de lesión activa en la temporada corriente,
   * evitando que una lesión pre-temporada infle el contador.
   */
  season_start_date?: string
}

// ─── Temporadas ───────────────────────────────────────────────────────────────

export type SeasonStatus = 'active' | 'closed'

/**
 * Snapshot compacto de un jugador guardado al cerrar la temporada.
 * Queda embebido en Season.summary como JSONB.
 */
export interface SeasonPlayerSummary {
  player_id: string
  name: string
  goals: number
  matches_played: number
  attendance_pct: number
  wins: number
  losses: number
  draws: number
  win_pct: number
  total_injury_days: number
}

/**
 * Resumen completo de la temporada guardado al cierre.
 * Se genera una sola vez y queda inmutable en la DB.
 */
export interface SeasonSummary {
  year: number
  total_matches: number
  players: SeasonPlayerSummary[]
  team_light: Pick<TeamMetrics, 'wins' | 'losses' | 'draws' | 'win_pct'>
  team_dark:  Pick<TeamMetrics, 'wins' | 'losses' | 'draws' | 'win_pct'>
  /** Máximo goleador de la temporada. */
  top_scorer:     { player_id: string; name: string; goals: number } | null
  /** Mayor porcentaje de asistencia. */
  top_attendance: { player_id: string; name: string; attendance_pct: number } | null
  /** Mayor % de victorias (más "suerte"). */
  luckiest:       { player_id: string; name: string; win_pct: number } | null
}

/** Temporada de un grupo. Un grupo puede tener muchas temporadas, una activa a la vez. */
export interface Season {
  id: string
  group_id: string
  user_id: string
  /** Año calendario: 2025, 2026, etc. */
  year: number
  /** Siempre "YYYY-01-01" */
  starts_at: string
  /** Siempre "YYYY-12-31" */
  ends_at: string
  status: SeasonStatus
  /** Timestamp en que se cerró la temporada. Null si está activa. */
  closed_at: string | null
  /** Null hasta que se cierra. */
  summary: SeasonSummary | null
  created_at: string
}

// ─── Flujo de armado de partido (wizard state) ────────────────────────────────

/**
 * Estado completo del draft de un partido.
 * Vive en memoria (useState / Zustand) durante el wizard.
 * Se materializa en la DB solo al confirmar (Paso 6).
 */
export interface MatchDraft {
  // — Metadata —
  group_id: string
  season_id: string
  match_date: string        // "YYYY-MM-DD"
  match_time: string        // "HH:MM"
  venue_name: string | null
  match_type: MatchType
  total_price: number | null
  payment_alias_id: string | null

  // — Paso 1: jugadores de planilla que asisten —
  /** IDs de jugadores de planilla confirmados. */
  selected_player_ids: string[]

  // — Paso 2: invitados (no acumulan métricas) —
  /** Cantidad de invitados. No tienen nombre ni ID propio. */
  guest_count: number

  // — Paso 3: asignación de equipos —
  /** player_id → equipo asignado. Solo jugadores de planilla seleccionados. */
  team_assignments: Record<string, 'light' | 'dark'>

  // — Paso 4: resultado —
  score_light: number | null
  score_dark:  number | null

  // — Paso 5: goles individuales —
  /** player_id → goles marcados. Solo jugadores de planilla. */
  player_goals: Record<string, number>
}

// ─── Vistas de jugador ────────────────────────────────────────────────────────

/**
 * Carta del jugador: datos clave para la vista de lista / card compact.
 * Subset de PlayerMetrics, sin historial ni detalles.
 */
export interface PlayerCard {
  player_id: string
  name: string
  total_goals: number
  matches_played: number
  attendance_pct: number
  attendance_category: AttendanceCategory
  is_injured: boolean
  /** 0 si no está lesionado. */
  active_injury_days: number
  /** Badge de suerte (0–100). */
  win_pct: number
  current_streak: number
}

/**
 * Página de estadísticas completa: métricas del jugador + rankings + equipo + historial.
 */
export interface StatsPageData {
  // — Jugador —
  metrics: PlayerMetrics

  // — Posición en rankings (1 = primero) —
  rank_goals: number
  rank_attendance: number
  rank_luck: number

  // — Métricas globales del grupo esta temporada —
  team_light: TeamMetrics
  team_dark:  TeamMetrics

  // — Historial de temporadas anteriores (solo lectura) —
  season_history: Array<{
    season: Season
    player_summary: SeasonPlayerSummary | null
  }>
}
