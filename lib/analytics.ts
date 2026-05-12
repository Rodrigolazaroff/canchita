import posthog from 'posthog-js'

// ── Init ─────────────────────────────────────────────────────────────────────
let initialized = false

/**
 * Inicializa PostHog.
 * En desarrollo arranca en modo opt-out para no contaminar datos reales.
 */
export function initPostHog() {
  if (initialized || typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'always',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
    advanced_disable_feature_flags: true,         // evita 401 en /flags/
    disable_external_dependency_loading: true,    // evita 404 en CDN assets
    opt_out_capturing_by_default: process.env.NODE_ENV === 'development',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug()
    },
  })

  initialized = true
}

// ── Opt-out / Opt-in ─────────────────────────────────────────────────────────
export function optOut() {
  try { posthog.opt_out_capturing() } catch {}
}

export function optIn() {
  try { posthog.opt_in_capturing() } catch {}
}

// ── Identify ──────────────────────────────────────────────────────────────────
export function identify(userId: string, props?: Record<string, unknown>) {
  try { posthog.identify(userId, props) } catch {}
}

export function resetUser() {
  try { posthog.reset() } catch {}
}

// ── Track (público) ───────────────────────────────────────────────────────────
/**
 * Función base de tracking. Todos los helpers del módulo la usan internamente.
 * Los componentes NUNCA deben llamar a posthog directamente — siempre a través de track().
 */
export function track(event: string, props?: Record<string, unknown>) {
  try { posthog.capture(event, props) } catch {}
}

// ── Pageview ──────────────────────────────────────────────────────────────────
export function trackPageview(path: string) {
  track('$pageview', { $current_url: path })
}

// ── Funnel de activación ──────────────────────────────────────────────────────

/** 1. Usuario completa el registro */
export function trackUserSignedUp(props?: { method?: string }) {
  track('user_signed_up', props)
}

/** 2. Usuario termina el onboarding (crea su primer grupo) */
export function trackOnboardingCompleted(props?: { match_type?: string }) {
  track('onboarding_completed', props)
}

/** 3. Se agrega el primer jugador al grupo */
export function trackFirstPlayerAdded(props?: { group_id?: string }) {
  track('first_player_added', props)
}

/** 4. Se crea un partido */
export function trackMatchCreated(props?: { player_count?: number }) {
  track('match_created', props)
}

/** 5. Se comparte la formación */
export function trackFormationShared(props?: { match_id?: string; method?: string }) {
  track('formation_shared', props)
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export function trackLoginSuccess(props?: { method?: string }) {
  track('login_success', props)
}

// ── Players ───────────────────────────────────────────────────────────────────
export function trackPlayerAdded(props?: { is_first?: boolean; group_id?: string }) {
  if (props?.is_first) trackFirstPlayerAdded({ group_id: props.group_id })
  track('player_added', props)
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function trackStatsRecorded(props?: { match_id?: string; goals_count?: number }) {
  track('stats_recorded', props)
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function trackDashboardView() {
  track('dashboard_view')
}

// ── Aliases para compatibilidad hacia atrás ───────────────────────────────────
/** @deprecated Usar identify() */
export const identifyUser = identify

/** @deprecated Usar trackUserSignedUp() */
export const trackSignupCompleted = trackUserSignedUp

/** @deprecated Usar trackFormationShared() */
export const trackMatchShared = trackFormationShared
