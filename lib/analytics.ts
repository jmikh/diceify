// The one place that talks to the analytics SDKs (ESLint restricts `posthog-js` and `sendGAEvent` to this file).
// Every event goes to both GA4 and PostHog; the catalog below is the full list (plan step I1).
//
// The PostHog key is read as a literal `process.env.NEXT_PUBLIC_*` access so it is inlined at build time (not through
// `lib/env.public.ts`, which must not throw at page load). Unset key → PostHog stays inert: no load, no network.
// PostHog is a dynamic import (~100 kB off every page's first load); calls made before it is up wait on its promise.
// Everything is a no-op outside the browser (prerender, vitest).

import type { PostHog } from 'posthog-js'
import { sendGAEvent } from '@next/third-parties/google'
import type { CheckoutPlan, Plan } from '@/core/billing'

export const GA_MEASUREMENT_ID = 'G-BDR76Z4JEE'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

/**
 * Hides an element (and its subtree) from session replay and autocapture: put it on anything that shows the user's
 * photo from a URL. Images made in the browser (`blob:`/`data:` — the cropper's photo, local thumbnails, the dice
 * preview) are blocked by `PRIVATE_IMAGES` without it.
 */
export const NO_CAPTURE_CLASS = 'ph-no-capture'
const PRIVATE_IMAGES = 'img[src^="blob:"], img[src^="data:"]'

// gtag is installed on window by <GoogleAnalytics/> (@next/third-parties); the package does not expose it.
declare global {
  interface Window {
    gtag?: (command: 'config', targetId: string, params: Record<string, unknown>) => void
  }
}

/** Event name → properties. Flat primitives only (GA4 parameters). */
export type AnalyticsEvents = {
  // Marketing
  go_to_editor: { source: string }
  hub_click: { source: string }
  blog_click: { source: string; slug: string }
  unsupported_login_provider_click: { provider: string }
  // Editor funnel
  editor_opened: { signed_in: boolean; restored: boolean }
  photo_uploaded: { file_type: string; file_size: number }
  crop_completed: { aspect_ratio: string }
  tune_completed: {
    rows: number
    cols: number | null
    total_dice: number | null
    color_mode: string
    contrast: number
    gamma: number
    edge_sharpening: number
    rotate6: boolean
    rotate3: boolean
    rotate2: boolean
  }
  build_started: { total_dice: number }
  build_progress: { percent: number; total_dice: number }
  blueprint_downloaded: { total_dice: number }
  // Gating and billing (the purchase itself is captured server-side by the stripe-webhook function)
  paywall_shown: { feature: string; prompt: 'sign_in' | 'limit' | 'proFeature' }
  click_upgrade: { source: string; plan_type?: CheckoutPlan }
  checkout_started: { plan: CheckoutPlan }
  // Sharing
  share_create: { share_id: string; total_dice: number }
  share: { method: string; content_type: 'dice_art'; item_id: string }
  share_view: { share_id: string }
  share_cta_click: { share_id: string }
}

export type AnalyticsEvent = keyof AnalyticsEvents

const inBrowser = () => typeof window !== 'undefined'

let client: Promise<PostHog | null> | undefined

/** How long the PostHog start may wait for the browser to go idle before it runs anyway. */
const IDLE_TIMEOUT_MS = 3000

/** Run `fn` when the main thread is idle (or after IDLE_TIMEOUT_MS), so it does not compete with LCP. */
function whenIdle(fn: () => void): void {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => fn(), { timeout: IDLE_TIMEOUT_MS })
  else window.setTimeout(fn, IDLE_TIMEOUT_MS)
}

/** Load and start PostHog once; null without a key, outside the browser, or when the chunk fails to load. */
function loadPosthog(key: string): Promise<PostHog | null> {
  return import('posthog-js').then(
    ({ default: posthog }) => {
      posthog.init(key, {
        api_host: POSTHOG_HOST,
        // Pageviews on every client-side route change (the first one is captured at init, from the current URL)
        defaults: '2026-08-30',
        // Anonymous visitors get no person profile; `identify` on sign-in merges their earlier events into the user
        person_profiles: 'identified_only',
        session_recording: { blockSelector: PRIVATE_IMAGES },
        // Not used: no surveys, no dead-click autocapture, no web vitals (Sentry/CrUX cover performance)
        disable_surveys: true,
        capture_dead_clicks: false,
        capture_performance: { web_vitals: false },
      })
      return posthog
    },
    (error: unknown) => {
      console.warn('[analytics] PostHog failed to load:', error)
      return null
    },
  )
}

/**
 * Start PostHog (pageviews, autocapture, session replay per the project settings). Idempotent. The chunk is loaded
 * once the browser is idle (at most IDLE_TIMEOUT_MS after the call); events fired before then wait on the promise.
 */
export function initAnalytics(): void {
  if (client || !inBrowser()) return
  client = POSTHOG_KEY
    ? new Promise((resolve) => whenIdle(() => resolve(loadPosthog(POSTHOG_KEY))))
    : Promise.resolve(null)
}

/** Run `use` once PostHog is up (started on demand, so an event fired before the root layout's effect still lands). */
function withPosthog(use: (posthog: PostHog) => void): void {
  initAnalytics()
  // Every call chains on the one promise, so calls keep their order
  void client?.then((posthog) => posthog && use(posthog))
}

/** Set on every event so the iOS app's events (`platform: 'ios'`, same names) can be told apart. */
const PLATFORM = 'web'

export function track<E extends AnalyticsEvent>(event: E, properties: AnalyticsEvents[E]): void {
  if (!inBrowser()) return
  const props = { platform: PLATFORM, ...properties }
  sendGAEvent('event', event, props)
  withPosthog((posthog) => posthog.capture(event, props))
}

/** The signed-in user: GA4 `user_id` (+ its `login` event) and PostHog `identify`, which links the anonymous history. */
export function identifyUser(id: string): void {
  if (!inBrowser()) return
  window.gtag?.('config', GA_MEASUREMENT_ID, { user_id: id })
  sendGAEvent('event', 'login', { method: 'google', user_id: id })
  withPosthog((posthog) => posthog.identify(id))
}

/** Person properties of the identified user (PostHog only). */
export function setUserProperties(properties: { plan: Plan }): void {
  if (!inBrowser()) return
  withPosthog((posthog) => posthog.setPersonProperties(properties))
}

/** After a sign-out: later events belong to a new anonymous visitor. */
export function resetUser(): void {
  if (!inBrowser()) return
  withPosthog((posthog) => posthog.reset())
}

/** A share page visit: this visitor's later events (an upload, a sign-up) carry `ref_share_id` (PostHog only). */
export function rememberShareReferral(shareId: string): void {
  if (!inBrowser()) return
  withPosthog((posthog) => posthog.register({ ref_share_id: shareId }))
}
