# Memoria del Proyecto: Canchita

## Estado del Proyecto
La aplicación es una plataforma de gestión de partidos de fútbol amateur ("fulbito"), permitiendo organizar fechas, equipos, estadísticas y compartir formaciones.

## Arquitectura y Stack
- **Framework:** Next.js 14 (App Router)
- **Base de Datos & Auth:** Supabase (Postgres with RLS)
- **Estado:** Zustand
- **Formularios:** React Hook Form + Zod
- **Estilos:** Tailwind CSS + Lucide Icons + Sonner
- **PWA:** Implementado con `next-pwa`
- **Otros:** `@dnd-kit` para arrastrar jugadores, `html2canvas` para compartir formaciones.

## Estado Deseado (Plan Actual)
1. Limpiar el código de cualquier dato hardcodeado (placeholders excesivos o datos de prueba) tras la integración exitosa de Supabase.
2. Verificar que los componentes de estadísticas usen exclusivamente las vistas de Supabase.
3. Asegurar que el flujo de creación de partidos sea totalmente dinámico.

## Historial de Procesos
- [x] Análisis inicial de archivos (package.json, database schema, landing page).
- [x] Identificación de módulos core (Dashboard, Matches, Players, Stats, Groups).
- [x] Creación de `/.agents/memory.md` (Protocolo de Memoria).
- [x] Corrección de `supabase/stats_views.sql` para incluir el `ALTER TABLE` faltante.
- [x] Aplicación de SQL en Supabase por parte del usuario.
- [x] Verificación de frontend (`StatsClient.tsx`).
- [x] Refactorización de layout general (`AppShell.tsx`) para evitar padding innecesario en desktop.
- [x] Refactorización de `NewMatchWizard.tsx` y `FormationBuilder.tsx` para eliminar el scroll del body.
- [x] Alineación horizontal de inputs, unificación de etiquetas y tamaños en Paso 2 de creación de partido.
- [x] Aplicación de formato numérico automático y unificación de estilos (Pixel Perfect) en campos de precio.
- [x] Refactorización completa de Grupos para soportar selección múltiple de días habituales (`days_of_week`).
- [x] Refactorización del layout de "Días habituales" reemplazando anchos fijos y overflow horizontal por un sistema `grid-cols-7` para lograr una distribución perfectamente simétrica.
- [x] Corrección de bug crítico en el Modal de Grupos que mantenía caché del estado anterior y sobreescribía los nombres al cambiar de grupo activo.
- [x] Eliminación completa de la métrica de "Suerte" (% de victorias) en la UI de Estadísticas (etiquetas, porcentajes y sección de ranking).
- [x] Implementación de **Soft-Delete Global**: Se agregó la columna `deleted_at` a todas las tablas (jugadores, canchas, alias, partidos) y se actualizaron las consultas y políticas de RLS para ignorar registros eliminados.
- [x] Refactorización de Gestión de Partidos:
    - Agregado de botones **Editar** y **Eliminar** en el detalle del partido.
    - Creación de un `MatchWizard` genérico que soporta creación y edición.
    - Reubicación del botón **Compartir formación** junto a la acción de cargar resultado para mayor accesibilidad.

## Cicatrices (Fallos y Aprendizajes)
- **Fallo de Columna Faltante:** El plan anterior intentó crear vistas que referenciaban `m.winner` sin haber creado la columna primero en `matches`. Se solucionó agregando un bloque `DO $$` con `ALTER TABLE`.
- **Error de Deadlock en SQL:** Durante la migración de `deleted_at`, se detectó un deadlock por consultas activas del servidor local. Aprendizaje: Siempre detener el servidor de desarrollo antes de ejecutar migraciones de esquema que involucren `DROP VIEW CASCADE`.
- **Corrupción de Archivo:** Un intento de edición fallido corrompió `app/matches/[matchId]/page.tsx`. Se solucionó con una revisión manual y limpieza de imports duplicados.
