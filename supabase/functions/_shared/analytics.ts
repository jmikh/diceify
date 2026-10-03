// PostHog capture from the edge functions (plan step I1). The purchase is recorded here, server-side: the browser
// leaves for Stripe Checkout and may never come back to report it. `POSTHOG_KEY` unset → nothing is sent.
// `purchaseEvent` is pure (vitest); `capture` is the Deno side and never throws — analytics must not fail a webhook.

import type Stripe from 'stripe'

export interface CapturedEvent {
  event: string
  /** The Supabase user id: the same id the browser passes to `posthog.identify`. */
  distinctId: string
  properties: Record<string, unknown>
  timestamp: string
  /** Derived from the Stripe event id: PostHog drops a redelivered webhook's copy (same uuid, event, time, user). */
  uuid: string
}

/** RFC 9562 version-8 UUID from the SHA-256 of `seed` (deterministic). */
export async function uuidFrom(seed: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed))).slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x80
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * `purchase_completed` for a paid (or fully discounted) Checkout Session; null for any other event. `plan` is the
 * profile's plan after the sync, set on the person so the plan property is right before the browser reloads.
 */
export async function purchaseEvent(event: Stripe.Event, plan: string): Promise<CapturedEvent | null> {
  if (event.type !== 'checkout.session.completed') return null
  const session = event.data.object
  if (session.payment_status === 'unpaid' || !session.client_reference_id) return null
  return {
    event: 'purchase_completed',
    distinctId: session.client_reference_id,
    timestamp: new Date(event.created * 1000).toISOString(),
    uuid: await uuidFrom(event.id),
    properties: {
      // What was bought (creator / studio_monthly / studio_yearly), from the billing function's checkout metadata
      checkout_plan: session.metadata?.plan ?? null,
      mode: session.mode,
      revenue: (session.amount_total ?? 0) / 100,
      currency: session.currency,
      $set: { plan },
    },
  }
}

/** RevenueCat event types that are a payment (the rest are state changes: cancellation, expiration, billing issue…). */
const APPLE_PURCHASE_TYPES: ReadonlySet<string> = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE', 'UNCANCELLATION'])

/** The fields of a RevenueCat webhook event the purchase event reads. */
export interface ApplePurchaseFacts {
  id: string
  type: string
  product_id?: string
  environment?: string
  price?: number | null
  currency?: string | null
  event_timestamp_ms?: number
}

/**
 * `purchase_completed` for a RevenueCat payment event (App Store); null for state changes. Same event name and
 * `$set.plan` as the Stripe one, plus `store`/`environment` so sandbox purchases can be filtered out of revenue.
 */
export async function applePurchaseEvent(event: ApplePurchaseFacts, userId: string, plan: string): Promise<CapturedEvent | null> {
  if (!APPLE_PURCHASE_TYPES.has(event.type)) return null
  const productId = event.product_id ?? null
  return {
    event: 'purchase_completed',
    distinctId: userId,
    timestamp: new Date(event.event_timestamp_ms ?? Date.now()).toISOString(),
    uuid: await uuidFrom(`revenuecat:${event.id}`),
    properties: {
      checkout_plan: productId,
      mode: productId !== null && productId.toLowerCase().includes('creator') ? 'payment' : 'subscription',
      revenue: typeof event.price === 'number' ? event.price : 0,
      currency: (event.currency ?? 'USD').toLowerCase(),
      store: 'app_store',
      environment: (event.environment ?? 'PRODUCTION').toLowerCase(),
      revenuecat_event: event.type,
      $set: { plan },
    },
  }
}

const DEFAULT_HOST = 'https://us.i.posthog.com'

export async function capture(e: CapturedEvent): Promise<void> {
  const key = Deno.env.get('POSTHOG_KEY')
  if (!key) return
  const host = (Deno.env.get('POSTHOG_HOST') || DEFAULT_HOST).replace(/\/+$/, '')
  try {
    const res = await fetch(`${host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event: e.event,
        distinct_id: e.distinctId,
        properties: e.properties,
        timestamp: e.timestamp,
        uuid: e.uuid,
      }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) console.warn(`analytics: ${e.event} rejected by PostHog (${res.status})`)
  } catch (err) {
    console.warn(`analytics: ${e.event} not sent: ${err instanceof Error ? err.message : String(err)}`)
  }
}
