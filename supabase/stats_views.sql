-- ─────────────────────────────────────────────────────────────────────────────
-- stats_views.sql
-- Reemplaza las vistas de estadísticas para que el frontend solo lea y muestre.
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de schema.sql y metrics_schema.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Helper: ganador efectivo de un partido ───────────────────────────────────
-- Usa el campo `winner` si está seteado; si no, lo deriva de los scores.
-- Esto garantiza retrocompatibilidad con partidos cargados antes de esta migración.

-- ─── 1. Vista player_stats (reemplaza la original) ───────────────────────────
-- Devuelve todo lo necesario para la pantalla de estadísticas: partidos jugados,
-- goles, victorias, derrotas, empates, % de victoria y promedio de goles.
-- El frontend ya NO necesita calcular nada.

CREATE OR REPLACE VIEW player_stats AS
SELECT
  p.id                                                      AS player_id,
  p.name,
  p.group_id,
  p.user_id,

  -- Partidos jugados (attended = true, partido en estado 'played')
  COUNT(DISTINCT m.id) FILTER (
    WHERE mp.attended = true AND m.status = 'played'
  )                                                         AS matches_played,

  -- Goles y asistencias
  COALESCE(SUM(mp.goals)   FILTER (WHERE mp.attended = true AND m.status = 'played'), 0) AS total_goals,
  COALESCE(SUM(mp.assists) FILTER (WHERE mp.attended = true AND m.status = 'played'), 0) AS total_assists,

  -- Victorias
  COUNT(DISTINCT m.id) FILTER (
    WHERE mp.attended = true AND m.status = 'played' AND (
      (m.winner IS NOT NULL AND m.winner = mp.team) OR
      (m.winner IS NULL AND (
        (mp.team = 'dark'  AND m.score_dark  > m.score_light) OR
        (mp.team = 'light' AND m.score_light > m.score_dark)
      ))
    )
  )                                                         AS wins,

  -- Derrotas
  COUNT(DISTINCT m.id) FILTER (
    WHERE mp.attended = true AND m.status = 'played' AND (
      (m.winner IS NOT NULL AND m.winner != 'draw' AND m.winner != mp.team) OR
      (m.winner IS NULL AND (
        (mp.team = 'dark'  AND m.score_light > m.score_dark) OR
        (mp.team = 'light' AND m.score_dark  > m.score_light)
      ))
    )
  )                                                         AS losses,

  -- Empates
  COUNT(DISTINCT m.id) FILTER (
    WHERE mp.attended = true AND m.status = 'played' AND (
      m.winner = 'draw' OR
      (m.winner IS NULL AND m.score_dark IS NOT NULL AND m.score_dark = m.score_light)
    )
  )                                                         AS draws,

  -- % de victoria (0–100, redondeado)
  CASE
    WHEN COUNT(DISTINCT m.id) FILTER (WHERE mp.attended = true AND m.status = 'played') = 0
    THEN 0
    ELSE ROUND(
      COUNT(DISTINCT m.id) FILTER (
        WHERE mp.attended = true AND m.status = 'played' AND (
          (m.winner IS NOT NULL AND m.winner = mp.team) OR
          (m.winner IS NULL AND (
            (mp.team = 'dark'  AND m.score_dark  > m.score_light) OR
            (mp.team = 'light' AND m.score_light > m.score_dark)
          ))
        )
      )::numeric
      / NULLIF(
          COUNT(DISTINCT m.id) FILTER (WHERE mp.attended = true AND m.status = 'played'), 0
        ) * 100
    )
  END                                                       AS win_pct,

  -- Promedio de goles por partido (redondeado a 2 decimales)
  CASE
    WHEN COUNT(DISTINCT m.id) FILTER (WHERE mp.attended = true AND m.status = 'played') = 0
    THEN 0
    ELSE ROUND(
      COALESCE(SUM(mp.goals) FILTER (WHERE mp.attended = true AND m.status = 'played'), 0)::numeric
      / NULLIF(
          COUNT(DISTINCT m.id) FILTER (WHERE mp.attended = true AND m.status = 'played'), 0
        ),
      2
    )
  END                                                       AS goal_avg

FROM players p
LEFT JOIN match_players mp ON mp.player_id = p.id
LEFT JOIN matches m        ON m.id = mp.match_id
GROUP BY p.id, p.name, p.group_id, p.user_id;


-- ─── 2. Vista team_metrics_by_group (reemplaza la original) ──────────────────
-- Devuelve victorias/derrotas/empates y % de victoria para cada equipo por grupo.
-- Fallback a scores para partidos sin campo `winner`.

CREATE OR REPLACE VIEW team_metrics_by_group AS
SELECT
  m.group_id,

  COUNT(*) FILTER (WHERE m.status = 'played')               AS total_played,

  -- ── Equipo Claro (light) ──────────────────────────────────────────────────
  COUNT(*) FILTER (
    WHERE m.status = 'played' AND (
      m.winner = 'light' OR (m.winner IS NULL AND m.score_light > m.score_dark)
    )
  )                                                         AS light_wins,

  COUNT(*) FILTER (
    WHERE m.status = 'played' AND (
      m.winner = 'dark' OR (m.winner IS NULL AND m.score_dark > m.score_light)
    )
  )                                                         AS light_losses,

  COUNT(*) FILTER (
    WHERE m.status = 'played' AND (
      m.winner = 'draw' OR
      (m.winner IS NULL AND m.score_dark IS NOT NULL AND m.score_dark = m.score_light)
    )
  )                                                         AS light_draws,

  -- ── Equipo Oscuro (dark) ──────────────────────────────────────────────────
  COUNT(*) FILTER (
    WHERE m.status = 'played' AND (
      m.winner = 'dark' OR (m.winner IS NULL AND m.score_dark > m.score_light)
    )
  )                                                         AS dark_wins,

  COUNT(*) FILTER (
    WHERE m.status = 'played' AND (
      m.winner = 'light' OR (m.winner IS NULL AND m.score_light > m.score_dark)
    )
  )                                                         AS dark_losses,

  COUNT(*) FILTER (
    WHERE m.status = 'played' AND (
      m.winner = 'draw' OR
      (m.winner IS NULL AND m.score_dark IS NOT NULL AND m.score_dark = m.score_light)
    )
  )                                                         AS dark_draws,

  -- % de victoria equipo Claro
  CASE
    WHEN COUNT(*) FILTER (WHERE m.status = 'played') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (
        WHERE m.status = 'played' AND (
          m.winner = 'light' OR (m.winner IS NULL AND m.score_light > m.score_dark)
        )
      )::numeric
      / COUNT(*) FILTER (WHERE m.status = 'played') * 100, 1
    )
  END                                                       AS light_win_pct,

  -- % de victoria equipo Oscuro
  CASE
    WHEN COUNT(*) FILTER (WHERE m.status = 'played') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (
        WHERE m.status = 'played' AND (
          m.winner = 'dark' OR (m.winner IS NULL AND m.score_dark > m.score_light)
        )
      )::numeric
      / COUNT(*) FILTER (WHERE m.status = 'played') * 100, 1
    )
  END                                                       AS dark_win_pct

FROM matches m
GROUP BY m.group_id;
