// The Apple billing snapshot: the profile's `apple_*` columns recomputed from a RevenueCat subscriber (the whole
// purchase history of the Supabase user, `app_user_id` = uid). PURE and import-free (Deno + Node), like
// billing-snapshot.ts for Stripe. Order-independent: every webhook (and the app's post-purchase sync) refetches the
// subscriber and recomputes, there is no per-event state machine.
//
// Products (App Store Connect, plans/ios/ios-app-plan.md § 7.3): auto-renewable `studio_monthly` / `studio_yearly`
// (subscription group "Studio") and the non-renewing `creator_30d` pass. RevenueCat reports auto-renewables under
// `subscriptions` with their `expires_date`, and non-renewing purchases under `non_subscriptions` without an end:
// the pass end is purchase + CREATOR_PASS_DAYS, mirroring the Stripe pass (billing-snapshot.ts `creatorExpiry`).

export type ApplePlan = 'creator' | 'studio'

export interface RevenueCatSubscription {
  expires_date: string | null
  purchase_date: string
  /** Set when the user turned auto-renew off (access continues until `expires_date`). */
  unsubscribe_detected_at: string | null
  billing_issues_detected_at: string | null
  is_sandbox?: boolean
  store?: string
}

export interface RevenueCatNonSubscription {
  id: string
  purchase_date: string
  is_sandbox?: boolean
  store?: string
}

/** The parts of `GET /v1/subscribers/{id}` → `subscriber` that the snapshot reads. */
export interface RevenueCatSubscriber {
  subscriptions?: Record<string, RevenueCatSubscription>
  non_subscriptions?: Record<string, RevenueCatNonSubscription[]>
}

/** The `profiles.apple_*` columns (ISO timestamps). */
export interface AppleSnapshot {
  apple_plan: ApplePlan | null
  apple_product_id: string | null
  apple_expires_at: string | null
  apple_will_renew: boolean
  apple_environment: 'sandbox' | 'production' | null
}

export const EMPTY_APPLE_SNAPSHOT: AppleSnapshot = {
  apple_plan: null,
  apple_product_id: null,
  apple_expires_at: null,
  apple_will_renew: false,
  apple_environment: null,
}

/** The payload's `event` (RevenueCat webhooks v1), the fields the webhook reads. */
export interface RevenueCatEvent {
  id: string
  type: string
  /** Absent on TRANSFER events, which name both sides in `transferred_from` / `transferred_to`. */
  app_user_id?: string
  original_app_user_id?: string
  aliases?: string[]
  transferred_from?: string[]
  transferred_to?: string[]
  product_id?: string
  environment?: string
  store?: string
  price?: number | null
  currency?: string | null
  event_timestamp_ms?: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The Supabase users whose Apple columns an event changes (the app sets `appUserID` = uid; anonymous ids are
 * `$RCAnonymousID:…`): the event's user, or for a TRANSFER (a restore on another account moves the purchases) both
 * the accounts losing and gaining them.
 */
export function userIdsOf(event: RevenueCatEvent): string[] {
  const isUser = (id: unknown): id is string => typeof id === 'string' && UUID.test(id)
  if (event.type === 'TRANSFER') return [...new Set([...(event.transferred_from ?? []), ...(event.transferred_to ?? [])].filter(isUser))]
  const userId = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].find(isUser)
  return userId ? [userId] : []
}

/** Mirror of core/billing/plans.ts `PRICING.creator.accessDays` (and billing-snapshot.ts `CREATOR_PASS_DAYS`). */
export const APPLE_CREATOR_PASS_DAYS = 30

/** Which plan an App Store product id grants: `studio_*` → studio, `creator_*` → creator, anything else → ignored. */
export function planOfProduct(productId: string): ApplePlan | null {
  const name = productId.toLowerCase().split('.').pop() ?? ''
  if (name.startsWith('studio')) return 'studio'
  if (name.startsWith('creator')) return 'creator'
  return null
}

interface Grant {
  plan: ApplePlan
  productId: string
  expiresAt: number
  willRenew: boolean
  sandbox: boolean
}

const parse = (iso: string | null | undefined): number | null => {
  if (typeof iso !== 'string') return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** Every grant in the subscriber's history, each with its end. */
export function grantsOf(subscriber: RevenueCatSubscriber): Grant[] {
  const grants: Grant[] = []
  for (const [productId, sub] of Object.entries(subscriber.subscriptions ?? {})) {
    const plan = planOfProduct(productId)
    const expiresAt = parse(sub.expires_date)
    if (!plan || expiresAt === null) continue
    grants.push({ plan, productId, expiresAt, willRenew: sub.unsubscribe_detected_at === null || sub.unsubscribe_detected_at === undefined, sandbox: sub.is_sandbox === true })
  }
  for (const [productId, purchases] of Object.entries(subscriber.non_subscriptions ?? {})) {
    const plan = planOfProduct(productId)
    if (!plan) continue
    for (const purchase of purchases) {
      const purchasedAt = parse(purchase.purchase_date)
      if (purchasedAt === null) continue
      grants.push({ plan, productId, expiresAt: purchasedAt + APPLE_CREATOR_PASS_DAYS * 86_400_000, willRenew: false, sandbox: purchase.is_sandbox === true })
    }
  }
  return grants
}

/**
 * The grant to store: an unexpired studio (latest end) → an unexpired creator pass (latest end) → the grant that ended
 * most recently (lapsed, informational, like Stripe's lapsed subscription) → none.
 */
export function computeAppleSnapshot(subscriber: RevenueCatSubscriber, now: Date): AppleSnapshot {
  const grants = grantsOf(subscriber)
  if (grants.length === 0) return EMPTY_APPLE_SNAPSHOT
  const latest = (list: Grant[]): Grant | null => list.reduce<Grant | null>((best, g) => (best === null || g.expiresAt > best.expiresAt ? g : best), null)
  const live = grants.filter((g) => g.expiresAt > now.getTime())
  const chosen = latest(live.filter((g) => g.plan === 'studio')) ?? latest(live.filter((g) => g.plan === 'creator')) ?? latest(grants)!
  return {
    apple_plan: chosen.plan,
    apple_product_id: chosen.productId,
    apple_expires_at: new Date(chosen.expiresAt).toISOString(),
    apple_will_renew: chosen.plan === 'studio' && chosen.willRenew && chosen.expiresAt > now.getTime(),
    apple_environment: chosen.sandbox ? 'sandbox' : 'production',
  }
}
