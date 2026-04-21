-- ─────────────────────────────────────────────────────────────────────────────
-- metrics_schema.sql
-- Ejecutar en el SQL Editor de Supabase (o migración) DESPUÉS del schema base.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Columnas nuevas en tablas existentes ──────────────────────────────────

-- Resultado de partido: ganador calculado y estado explícito
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS score_light       integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_dark        integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winner            text        CHECK (winner IN ('light','dark','draw')),
  ADD COLUMN IF NOT EXISTS group_season_id   uuid        REFERENCES group_seasons(id) ON DELETE SET NULL;

-- Estado de lesión activa en la fila del jugador
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS is_injured             boolean   DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS active_injury_start    date;     -- null = no lesionado

-- Goles y asistencia en match_players (ya existen en el schema base,
-- se incluyen aquí como referencia)
-- goals    integer DEFAULT 0
-- attended boolean DEFAULT false

-- ─── 2. Tabla de temporadas ───────────────────────────────────────────────────

-- Agrupa los partidos de una temporada para calcular el denominador
-- de asistencia (total de fechas). Una misma cancha puede tener varias temporadas.
CREATE TABLE IF NOT EXISTS group_seasons (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         text        NOT NULL,          -- ej: "Temporada 2025"
  starts_at    date        NOT NULL,
  ends_at      date,                          -- null = temporada en curso
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE group_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_seasons" ON group_seasons
  FOR ALL USING (auth.uid() = user_id);

-- ─── 3. Tabla de lesiones ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS player_injuries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  start_date   date        NOT NULL,
  end_date     date,                          -- null = lesión activa en curso
  days_total   integer,                       -- calculado al cerrar la lesión
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE player_injuries ENABLE ROW LEVEL SECURITY;

-- El dueño del jugador puede gestionar sus lesiones
CREATE POLICY "owner_all_injuries" ON player_injuries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_injuries.player_id
        AND p.user_id = auth.uid()
    )
  );

-- Índices de acceso frecuente
CREATE INDEX IF NOT EXISTS idx_injuries_player ON player_injuries (player_id);
CREATE INDEX IF NOT EXISTS idx_injuries_active  ON player_injuries (player_id) WHERE end_date IS NULL;

-- ─── 4. Vista de métricas de jugador ─────────────────────────────────────────
--
-- Devuelve los datos crudos necesarios para que calcPlayerMetrics() en TypeScript
-- construya el objeto PlayerMetrics completo. El cálculo de porcentajes,
-- categorías y rankings se realiza en la capa de aplicación para evitar
-- duplicar lógica de negocio en SQL.

CREATE OR REPLACE VIEW player_raw_metrics AS
SELECT
  p.id                                                        AS player_id,
  p.name,
  p.group_id,
  p.user_id,
  p.is_injured,
  p.active_injury_start,

  -- Partidos jugados (attended = true)
  COUNT(mp.id) FILTER (WHERE mp.attended = true)             AS matches_played,

  -- Goles totales (solo partidos jugados)
  COALESCE(SUM(mp.goals) FILTER (WHERE mp.attended = true), 0) AS total_goals,

  -- Victorias (jugó + su equipo ganó)
  COUNT(mp.id) FILTER (
    WHERE mp.attended = true
      AND m.winner IS NOT NULL
      AND m.winner != 'draw'
      AND m.winner = mp.team
  )                                                           AS wins,

  -- Derrotas
  COUNT(mp.id) FILTER (
    WHERE mp.attended = true
      AND m.winner IS NOT NULL
      AND m.winner != 'draw'
      AND m.winner != mp.team
  )                                                           AS losses,

  -- Empates
  COUNT(mp.id) FILTER (
    WHERE mp.attended = true
      AND m.winner = 'draw'
  )                                                           AS draws,

  -- Total de días lesionado en lesiones CERRADAS
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
GROUP BY p.id, p.name, p.group_id, p.user_id, p.is_injured, p.active_injury_start;

-- ─── 5. Vista de métricas de equipo ──────────────────────────────────────────

CREATE OR REPLACE VIEW team_metrics_by_group AS
SELECT
  m.group_id,

  -- ── Equipo Claro (light) ──────────────────────────────────────────────
  COUNT(*) FILTER (WHERE m.status = 'played')                  AS total_played,

  COUNT(*) FILTER (WHERE m.status = 'played' AND m.winner = 'light') AS light_wins,
  COUNT(*) FILTER (WHERE m.status = 'played' AND m.winner = 'dark')  AS light_losses,
  COUNT(*) FILTER (WHERE m.status = 'played' AND m.winner = 'draw')  AS light_draws,

  -- ── Equipo Oscuro (dark) — simétrico ─────────────────────────────────
  COUNT(*) FILTER (WHERE m.status = 'played' AND m.winner = 'dark')  AS dark_wins,
  COUNT(*) FILTER (WHERE m.status = 'played' AND m.winner = 'light') AS dark_losses,
  COUNT(*) FILTER (WHERE m.status = 'played' AND m.winner = 'draw')  AS dark_draws,

  -- % victoria (0 si no hay partidos)
  CASE
    WHEN COUNT(*) FILTER (WHERE m.status = 'played') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE m.status = 'played' AND m.winner = 'light')::numeric
      / COUNT(*) FILTER (WHERE m.status = 'played') * 100, 1
    )
  END                                                           AS light_win_pct,

  CASE
    WHEN COUNT(*) FILTER (WHERE m.status = 'played') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE m.status = 'played' AND m.winner = 'dark')::numeric
      / COUNT(*) FILTER (WHERE m.status = 'played') * 100, 1
    )
  END                                                           AS dark_win_pct

FROM matches m
GROUP BY m.group_id;

-- ─── 6. Función SQL helper: snapshots de partidos de un jugador ───────────────
--
-- Devuelve las filas necesarias para construir PlayerMatchSnapshot[] en TypeScript.
-- Se llama desde una Server Action pasando el player_id.

CREATE OR REPLACE FUNCTION get_player_match_snapshots(p_player_id uuid)
RETURNS TABLE (
  match_id    uuid,
  match_date  date,
  attended    boolean,
  team        text,
  goals       integer,
  winner      text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id          AS match_id,
    m.match_date,
    COALESCE(mp.attended, false) AS attended,
    mp.team,
    COALESCE(mp.goals, 0)        AS goals,
    m.winner
  FROM matches m
  LEFT JOIN match_players mp
         ON mp.match_id  = m.id
        AND mp.player_id = p_player_id
  WHERE m.group_id IN (
          SELECT group_id FROM players WHERE id = p_player_id
        )
    AND m.status IN ('played', 'scheduled')
  ORDER BY m.match_date ASC;
$$;

-- ─── 7. Función SQL helper: total de partidos de la temporada por grupo ────────

CREATE OR REPLACE FUNCTION get_season_total_matches(p_group_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM matches
  WHERE group_id = p_group_id
    AND status IN ('played', 'scheduled');
$$;
