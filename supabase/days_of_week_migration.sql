-- ─────────────────────────────────────────────────────────────────────────────
-- days_of_week_migration.sql
-- Migra la columna day_of_week (INT) → days_of_week (INT[]) en la tabla groups.
-- Ejecutar en Supabase SQL Editor UNA SOLA VEZ.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Agregar nueva columna (array de enteros)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS days_of_week INT[];

-- 2. Migrar datos existentes: convierte el entero en array de un elemento
UPDATE groups
SET days_of_week = ARRAY[day_of_week]
WHERE day_of_week IS NOT NULL
  AND (days_of_week IS NULL OR days_of_week = '{}');

-- 3. Eliminar la columna vieja
ALTER TABLE groups DROP COLUMN IF EXISTS day_of_week;
