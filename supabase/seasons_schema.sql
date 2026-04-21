-- ─────────────────────────────────────────────────────────────────────────────
-- seasons_schema.sql
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de schema.sql y metrics_schema.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Tabla de temporadas ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seasons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid        NOT NULL REFERENCES groups(id)    ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  year        integer     NOT NULL,
  starts_at   date        NOT NULL,   -- siempre YYYY-01-01
  ends_at     date        NOT NULL,   -- siempre YYYY-12-31
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'closed')),
  closed_at   timestamptz,
  summary     jsonb,                  -- SeasonSummary; null hasta el cierre
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, year)
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_owner" ON seasons
  FOR ALL USING (user_id = auth.uid());

-- Índice para obtener la temporada activa de un grupo rápidamente
CREATE INDEX IF NOT EXISTS idx_seasons_group_active
  ON seasons (group_id) WHERE status = 'active';

-- ─── 2. Columna season_id en matches ─────────────────────────────────────────

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS winner    text CHECK (winner IN ('light','dark','draw')),
  ADD COLUMN IF NOT EXISTS guest_count integer DEFAULT 0;

-- Índice para obtener todos los partidos de una temporada
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches (season_id);

-- ─── 3. Columnas de lesión en players (si no existen de metrics_schema.sql) ──

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS is_injured            boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS active_injury_start   date;

-- ─── 4. Función: abrir temporada manualmente ─────────────────────────────────
--
-- Crea una temporada para el grupo en el año indicado (o el corriente si no se pasa).
-- Falla si ya existe una temporada activa para ese grupo.
-- La app la llama cuando el organizador crea el primer partido o pulsa "Iniciar temporada".

CREATE OR REPLACE FUNCTION open_season(
  p_group_id  uuid,
  p_user_id   uuid,
  p_year      integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS uuid           -- devuelve el id de la temporada creada
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id uuid;
BEGIN
  -- Verificar que no existe ya una temporada activa para este grupo
  IF EXISTS (
    SELECT 1 FROM seasons
    WHERE group_id = p_group_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Ya existe una temporada activa para este grupo.';
  END IF;

  INSERT INTO seasons (group_id, user_id, year, starts_at, ends_at, status)
  VALUES (
    p_group_id,
    p_user_id,
    p_year,
    make_date(p_year, 1, 1),
    make_date(p_year, 12, 31),
    'active'
  )
  ON CONFLICT (group_id, year) DO NOTHING
  RETURNING id INTO v_season_id;

  RETURN v_season_id;
END;
$$;

-- ─── 5. Función: cerrar temporada ────────────────────────────────────────────
--
-- Marca la temporada como cerrada y guarda el resumen (summary se pasa como JSONB
-- desde la app, ya que el cálculo de métricas ocurre en TypeScript).

CREATE OR REPLACE FUNCTION close_season(
  p_season_id  uuid,
  p_summary    jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE seasons
  SET
    status    = 'closed',
    closed_at = now(),
    summary   = p_summary
  WHERE id = p_season_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La temporada no existe o ya está cerrada.';
  END IF;
END;
$$;

-- ─── 6. Función: cierre automático de temporadas expiradas ───────────────────
--
-- Busca todas las temporadas activas cuya ends_at < hoy.
-- Para cada una, la cierra con summary = null (la app puede rellenar el summary
-- luego con una migración de datos si lo necesita).
--
-- Se invoca desde pg_cron el 31/12 a las 23:55 (ver cron setup al final).
-- También puede llamarse manualmente si el job falla.

CREATE OR REPLACE FUNCTION close_expired_seasons()
RETURNS integer          -- cantidad de temporadas cerradas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE seasons
  SET
    status    = 'closed',
    closed_at = now()
  WHERE status = 'active'
    AND ends_at < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─── 7. Cron job con pg_cron (habilitar la extensión primero) ─────────────────
--
-- En el panel de Supabase: Database → Extensions → pg_cron → habilitar.
-- Luego ejecutar el bloque de abajo UNA sola vez.
--
-- SELECT cron.schedule(
--   'close-expired-seasons',      -- nombre único del job
--   '55 23 31 12 *',              -- 23:55 del 31 de diciembre
--   'SELECT close_expired_seasons()'
-- );
--
-- Para verificar: SELECT * FROM cron.job;
-- Para eliminar:  SELECT cron.unschedule('close-expired-seasons');

-- ─── 8. Vista: temporada activa por grupo ─────────────────────────────────────

CREATE OR REPLACE VIEW active_seasons AS
SELECT * FROM seasons WHERE status = 'active';

-- ─── 9. Vista de historial de temporadas cerradas ─────────────────────────────

CREATE OR REPLACE VIEW closed_seasons AS
SELECT
  s.*,
  g.name AS group_name
FROM seasons s
JOIN groups g ON g.id = s.group_id
WHERE s.status = 'closed'
ORDER BY s.year DESC;

-- ─── 10. Función helper: obtener o crear temporada activa ────────────────────
--
-- Llamada desde la app antes de crear un partido.
-- Si no hay temporada activa la crea automáticamente para el año corriente.

CREATE OR REPLACE FUNCTION get_or_create_active_season(
  p_group_id uuid,
  p_user_id  uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id uuid;
  v_year      integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
BEGIN
  -- Intentar obtener la temporada activa existente
  SELECT id INTO v_season_id
  FROM seasons
  WHERE group_id = p_group_id AND status = 'active'
  LIMIT 1;

  -- Si no existe, abrirla
  IF v_season_id IS NULL THEN
    v_season_id := open_season(p_group_id, p_user_id, v_year);
  END IF;

  RETURN v_season_id;
END;
$$;
