-- Habilita 'futbol7' como tipo de partido válido en groups.match_type.
-- Ejecutar en el SQL Editor de Supabase antes de desplegar el código nuevo.
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_match_type_check;
ALTER TABLE groups ADD CONSTRAINT groups_match_type_check
  CHECK (match_type IN ('futbol5', 'futbol7', 'futbol8', 'futbol11'));
