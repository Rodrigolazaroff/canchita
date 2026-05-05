import posthog from 'posthog-js'

// ── Init ─────────────────────────────────────────────────────────────────────
let initialized = false

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,      // lo manejamos manual con usePageView
    capture_pageleave: true,
    autocapture: false,           // solo eventos explícitos
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug()
    },
  })

  initialized = true
}

// ── Identify ──────────────────────────────────────────────────────────────────
export function identifyUser(userId: string, props?: Record<string, unknown>) {
  try {
    posthog.identify(userId, props)
  } catch {}
}

export function resetUser() {
  try {
    posthog.reset()
  } catch {}
}

// ── Track ─────────────────────────────────────────────────────────────────────
function track(event: string, props?: Record<string, unknown>) {
  try {
    posthog.capture(event, props)
  } catch {}
}

// ── Pageview ──────────────────────────────────────────────────────────────────
export function trackPageview(path: string) {
  track('$pageview', { $current_url: path })
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export function trackSignupCompleted(props?: { method?: string }) {
  track('signup_completed', props)
}

export function trackLoginSuccess(props?: { method?: string }) {
  track('login_success', props)
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function trackDashboardView() {
  track('dashboard_view')
}

// ── Matches ───────────────────────────────────────────────────────────────────
export function trackMatchCreated(props?: { is_first?: boolean; player_count?: number }) {
  if (props?.is_first) track('first_match_created', props)
  track('match_created', props)
}

export function trackStatsRecorded(props?: { match_id?: string; goals_count?: number }) {
  track('stats_recorded', props)
}

export function trackMatchShared(props?: { match_id?: string; method?: string }) {
  track('match_shared', props)
}

// ── Players ───────────────────────────────────────────────────────────────────
export function trackPlayerAdded(props?: { is_first?: boolean; group_id?: string }) {
  if (props?.is_first) track('first_player_added', props)
  track('player_added', props)
}
