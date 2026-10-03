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
