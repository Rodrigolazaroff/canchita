-- ─── import_stats_migration.sql ───────────────────────────────────────────────
-- Agrega campos de estadísticas importadas a players y actualiza las vistas.
-- Ejecutar en el SQL Editor de Supabase después de metrics_schema.sql.

-- ─── 1. Tablas y columnas previas (autocontenido) ─────────────────────────────

-- Tabla de lesiones (por si metrics_schema.sql no fue ejecutado)
CREATE TABLE IF NOT EXISTS player_injuries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  start_date   date        NOT NULL,
  end_date     date,
  days_total   integer,
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Columnas en players (por si metrics_schema.sql no fue ejecutado)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS is_injured            boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS active_injury_start   date;

-- Columna winner en matches (por si stats_views.sql no fue ejecutado)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS winner text CHECK (winner IN ('dark', 'light', 'draw'));

-- Columnas de importación
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS imported_matches  integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS imported_goals    integer DEFAULT 0 NOT NULL;

-- ─── 2. Vista player_stats actualizada ────────────────────────────────────────

CREATE OR REPLACE VIEW player_stats AS
SELECT
  p.id                                                      AS player_id,
  p.name,
  p.group_id,
  p.user_id,

  -- Partidos jugados: reales + importados
  COUNT(DISTINCT m.id) FILTER (
    WHERE mp.attended = true AND m.status = 'played'
  ) + COALESCE(p.imported_matches, 0)                       AS matches_played,

  -- Goles: reales + importados
  COALESCE(SUM(mp.goals) FILTER (WHERE mp.attended = true AND m.status = 'played'), 0)
    + COALESCE(p.imported_goals, 0)                         AS total_goals,

  COALESCE(SUM(mp.assists) FILTER (WHERE mp.attended = true AND m.status = 'played'), 0) AS total_assists,

  -- Victorias (solo partidos reales — los importados no tienen equipo/resultado)
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

  -- % de victoria (basado en partidos con resultado conocido)
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

  -- Promedio de goles (usa total con importados sobre partidos totales con importados)
  CASE
    WHEN (
      COUNT(DISTINCT m.id) FILTER (WHERE mp.attended = true AND m.status = 'played')
      + COALESCE(p.imported_matches, 0)
    ) = 0
    THEN 0
    ELSE ROUND(
      (
        COALESCE(SUM(mp.goals) FILTER (WHERE mp.attended = true AND m.status = 'played'), 0)
        + COALESCE(p.imported_goals, 0)
      )::numeric
      / NULLIF(
          COUNT(DISTINCT m.id) FILTER (WHERE mp.attended = true AND m.status = 'played')
          + COALESCE(p.imported_matches, 0),
          0
        ),
      2
    )
  END                                                       AS goal_avg

FROM players p
LEFT JOIN match_players mp ON mp.player_id = p.id
LEFT JOIN matches m        ON m.id = mp.match_id
GROUP BY p.id, p.name, p.group_id, p.user_id, p.imported_matches, p.imported_goals;


-- ─── 3. Vista player_raw_metrics actualizada ──────────────────────────────────

CREATE OR REPLACE VIEW player_raw_metrics AS
SELECT
  p.id                                                        AS player_id,
  p.name,
  p.group_id,
  p.user_id,
  p.is_injured,
  p.active_injury_start,
  p.imported_matches,
  p.imported_goals,

  -- Partidos reales (sin importados — se suman en la capa TS)
  COUNT(mp.id) FILTER (WHERE mp.attended = true)             AS matches_played,

  COALESCE(SUM(mp.goals) FILTER (WHERE mp.attended = true), 0) AS total_goals,

  COUNT(mp.id) FILTER (
    WHERE mp.attended = true
      AND m.winner IS NOT NULL
      AND m.winner != 'draw'
      AND m.winner = mp.team
  )                                                           AS wins,

  COUNT(mp.id) FILTER (
    WHERE mp.attended = true
      AND m.winner IS NOT NULL
      AND m.winner != 'draw'
      AND m.winner != mp.team
  )                                                           AS losses,

  COUNT(mp.id) FILTER (
    WHERE mp.attended = true
      AND m.winner = 'draw'
  )                                                           AS draws,

  COALESCE((
    SELECT SUM(days_total)
    FROM player_injuries pi
    WHERE pi.player_id = p.id
      AND pi.end_date IS NOT NULL
  ), 0)                                                       AS closed_injury_days

FROM players p
LEFT JOIN match_players mp ON mp.player_id = p.id
LEFT JOIN matches m        ON m.id = mp.match_id
                           AND m.status = 'played'
GROUP BY p.id, p.name, p.group_id, p.user_id,
         p.is_injured, p.active_injury_start,
         p.imported_matches, p.imported_goals;
