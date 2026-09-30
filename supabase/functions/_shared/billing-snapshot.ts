// The billing snapshot: the profile's billing columns recomputed from Stripe facts. PURE and import-free so
// it runs under Deno (edge functions) and Node (vitest, the F1 migration script) unchanged.
//
// Mirrors (keep in sync, same rule as SQL `effective_plan`): PRO statuses = core/billing/entitlements.ts
// `PRO_SUBSCRIPTION_STATUSES`; creator pass length = core/billing/plans.ts `PRICING.creator.accessDays`.

export type SnapshotPlan = 'explorer' | 'creator' | 'studio' | 'lifetime'

/** Stripe subscription statuses that keep Studio access (past_due = payment grace period). */
export const PRO_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due'])

export const CREATOR_PASS_DAYS = 30

/** The fields read from a Stripe `Subscription` (unix seconds for timestamps). */
export interface SubscriptionFacts {
  id: string
  status: string
  created: number
  cancel_at: number | null
  cancel_at_period_end?: boolean
  /** Root-level period end: present on older API versions only; current ones keep it on the items. */
  current_period_end?: number
  items: { data: { current_period_end?: number }[] }
}

/** The fields read from a Stripe `Checkout.Session`. */
export interface CheckoutSessionFacts {
  id: string
  created: number
  mode: string
  status: string | null
  metadata: Record<string, string> | null
}

export interface CurrentBilling {
  plan: SnapshotPlan
  /** ISO timestamp of the stored creator pass end. */
  planExpiresAt: string | null
}

export interface BillingFacts {
  subscriptions: SubscriptionFacts[]
  checkoutSessions: CheckoutSessionFacts[]
}

/** The `profiles` billing columns (ISO timestamps). */
export interface BillingSnapshot {
  plan: SnapshotPlan
  stripe_subscription_id: string | null
  subscription_status: string | null
  current_period_end: string | null
  cancel_at: string | null
  plan_expires_at: string | null
}

const toIso = (unixSeconds: number | null | undefined): string | null =>
  typeof unixSeconds === 'number' && Number.isFinite(unixSeconds) ? new Date(unixSeconds * 1000).toISOString() : null

const isPro = (sub: SubscriptionFacts): boolean => PRO_SUBSCRIPTION_STATUSES.has(sub.status)

/** Newest subscription with a PRO status, else the newest overall, else null. */
export function pickSubscription(subscriptions: readonly SubscriptionFacts[]): SubscriptionFacts | null {
  if (subscriptions.length === 0) return null
  const newestFirst = [...subscriptions].sort((a, b) => b.created - a.created)
  return newestFirst.find(isPro) ?? newestFirst[0]
}

const isCreatorPurchase = (s: CheckoutSessionFacts): boolean =>
  s.status === 'complete' && s.mode === 'payment' && (s.metadata?.plan ?? s.metadata?.planType) === 'creator'

/**
 * Creator pass end: the latest of the stored value and every completed one-time creator purchase + 30 days.
 * Monotonic — a sync never lowers it.
 */
export function creatorExpiry(stored: string | null, sessions: readonly CheckoutSessionFacts[]): string | null {
  let best = stored !== null ? Date.parse(stored) : NaN
  for (const session of sessions) {
    if (!isCreatorPurchase(session)) continue
    const end = session.created * 1000 + CREATOR_PASS_DAYS * 86_400_000
    if (Number.isNaN(best) || end > best) best = end
  }
  return Number.isNaN(best) ? null : new Date(best).toISOString()
}

const periodEndSeconds = (sub: SubscriptionFacts): number | null =>
  sub.items.data[0]?.current_period_end ?? sub.current_period_end ?? null

const cancelAtSeconds = (sub: SubscriptionFacts): number | null =>
  sub.cancel_at ?? (sub.cancel_at_period_end ? periodEndSeconds(sub) : null)

/** Recomputes the whole snapshot from the Stripe facts; see the rules table in plans/revamp/revamp-step-D1.md. */
export function computeBillingSnapshot(current: CurrentBilling, facts: BillingFacts, now: Date): BillingSnapshot {
  const sub = pickSubscription(facts.subscriptions)
  const planExpiresAt = creatorExpiry(current.planExpiresAt, facts.checkoutSessions)
  const creatorActive = planExpiresAt !== null && Date.parse(planExpiresAt) > now.getTime()

  let plan: SnapshotPlan
  if (current.plan === 'lifetime') plan = 'lifetime'
  else if (sub !== null && isPro(sub)) plan = 'studio'
  else if (creatorActive) plan = 'creator'
  else if (sub !== null) plan = 'studio' // lapsed, informational
  else if (planExpiresAt !== null) plan = 'creator' // lapsed, informational
  else plan = 'explorer'

  return {
    plan,
    stripe_subscription_id: sub?.id ?? null,
    subscription_status: sub?.status ?? null,
    current_period_end: sub ? toIso(periodEndSeconds(sub)) : null,
    cancel_at: sub ? toIso(cancelAtSeconds(sub)) : null,
    plan_expires_at: planExpiresAt,
  }
}
