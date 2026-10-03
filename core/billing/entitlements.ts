// Entitlements derived from the profile's billing snapshot. THE gating source for the client.
//
// Two sources: Stripe (the web: `plan` + subscription/pass columns) and Apple (the iOS app's in-app purchases,
// reported by RevenueCat: `apple_*` columns). Priority: lifetime → Studio from either → Creator from either →
// Explorer. MUST be mirrored by the SQL function `effective_plan` (supabase/migrations/*_apple_billing.sql): same
// priority, same statuses, same strict `>` on expiry. (Projects are unlimited since G1: no SQL limit any more.)

import { PLAN_LIMITS, type Plan } from './plans'

/** Stripe subscription statuses that keep Studio access (past_due = payment grace period). */
export const PRO_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due'])

/** What an Apple purchase grants (`apple_plan`). */
export type ApplePlan = 'creator' | 'studio'

/** Who granted the current plan; null for Explorer and the legacy lifetime grant. */
export type BillingSource = 'stripe' | 'apple'

/** Billing columns of a profile row (timestamps as ISO strings). */
export interface BillingState {
  plan: Plan
  /** Creator pass end (Stripe). */
  planExpiresAt: string | null
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  cancelAt: string | null
  hasStripeCustomer: boolean
  /** The latest Apple purchase: what it grants and until when (`apple_will_renew` for an auto-renewable). */
  applePlan: ApplePlan | null
  appleExpiresAt: string | null
  appleWillRenew: boolean
}

export interface Entitlements {
  plan: Plan
  isPro: boolean
  /** `null` = unlimited (never `Infinity`). */
  builderRowLimit: number | null
  hasSvgExport: boolean
  /** When paid access ends (creator expiry, or the studio period/cancel date); null for lifetime and explorer. */
  accessUntil: string | null
  cancelAt: string | null
  /** Studio subscription that will renew (no pending cancellation). */
  renews: boolean
  /** The user has a Stripe customer, so the Stripe portal can be offered. */
  canManageBilling: boolean
  /** Where the current plan comes from: Stripe (cancel/resume here) or Apple (managed in the App Store). */
  source: BillingSource | null
}

function withLimits(plan: Plan, rest: Pick<Entitlements, 'accessUntil' | 'cancelAt' | 'renews' | 'canManageBilling' | 'source'>): Entitlements {
  return { plan, isPro: plan !== 'explorer', ...PLAN_LIMITS[plan], ...rest }
}

/** Signed-out / unknown-profile default. */
export const EXPLORER_ENTITLEMENTS: Entitlements = withLimits('explorer', {
  accessUntil: null,
  cancelAt: null,
  renews: false,
  canManageBilling: false,
  source: null,
})

const isAfter = (iso: string | null, now: Date): boolean => iso !== null && Date.parse(iso) > now.getTime()

/** An Apple grant for `plan` that has not ended. */
const appleGrants = (b: BillingState, plan: ApplePlan, now: Date): boolean => b.applePlan === plan && isAfter(b.appleExpiresAt, now)

/**
 * Priority: lifetime → Studio (Stripe PRO status, else an unexpired Apple Studio) → Creator (whichever of the Stripe
 * pass and an Apple pass ends later) → Explorer. With both sources granting Studio, Stripe wins (it is the one that
 * can be managed here); access dates then come from Stripe.
 */
export function deriveEntitlements(b: BillingState, now: Date): Entitlements {
  const canManageBilling = b.hasStripeCustomer
  if (b.plan === 'lifetime') {
    return withLimits('lifetime', { accessUntil: null, cancelAt: null, renews: false, canManageBilling, source: null })
  }
  if (b.plan === 'studio' && b.subscriptionStatus !== null && PRO_SUBSCRIPTION_STATUSES.has(b.subscriptionStatus)) {
    return withLimits('studio', {
      accessUntil: b.cancelAt ?? b.currentPeriodEnd,
      cancelAt: b.cancelAt,
      renews: b.cancelAt === null,
      canManageBilling,
      source: 'stripe',
    })
  }
  if (appleGrants(b, 'studio', now)) {
    return withLimits('studio', { accessUntil: b.appleExpiresAt, cancelAt: null, renews: b.appleWillRenew, canManageBilling, source: 'apple' })
  }
  const stripePass = b.plan === 'creator' && isAfter(b.planExpiresAt, now) ? b.planExpiresAt : null
  const applePass = appleGrants(b, 'creator', now) ? b.appleExpiresAt : null
  if (stripePass !== null || applePass !== null) {
    const appleWins = applePass !== null && (stripePass === null || Date.parse(applePass) > Date.parse(stripePass))
    return withLimits('creator', {
      accessUntil: appleWins ? applePass : stripePass,
      cancelAt: null,
      renews: false,
      canManageBilling,
      source: appleWins ? 'apple' : 'stripe',
    })
  }
  return withLimits('explorer', { accessUntil: null, cancelAt: null, renews: false, canManageBilling, source: null })
}
