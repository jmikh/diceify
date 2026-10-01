// Entitlements derived from the profile's billing snapshot. THE gating source for the client.
//
// MUST be mirrored by the SQL function `effective_plan` in supabase/migrations/*_initial_schema.sql (C1): same
// priority, same statuses, same strict `>` on expiry. (Projects are unlimited since G1: no SQL limit any more.)

import { PLAN_LIMITS, type Plan } from './plans'

/** Stripe subscription statuses that keep Studio access (past_due = payment grace period). */
export const PRO_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due'])

/** Billing columns of a profile row (timestamps as ISO strings). */
export interface BillingState {
  plan: Plan
  /** Creator pass end. */
  planExpiresAt: string | null
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  cancelAt: string | null
  hasStripeCustomer: boolean
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
  /** The user has a Stripe customer, so portal/cancel/resume can be offered. */
  canManageBilling: boolean
}

function withLimits(plan: Plan, rest: Pick<Entitlements, 'accessUntil' | 'cancelAt' | 'renews' | 'canManageBilling'>): Entitlements {
  return { plan, isPro: plan !== 'explorer', ...PLAN_LIMITS[plan], ...rest }
}

/** Signed-out / unknown-profile default. */
export const EXPLORER_ENTITLEMENTS: Entitlements = withLimits('explorer', {
  accessUntil: null,
  cancelAt: null,
  renews: false,
  canManageBilling: false,
})

const isAfter = (iso: string | null, now: Date): boolean => iso !== null && Date.parse(iso) > now.getTime()

/** Priority: lifetime → studio with a PRO status → creator pass not yet expired → explorer. */
export function deriveEntitlements(b: BillingState, now: Date): Entitlements {
  const canManageBilling = b.hasStripeCustomer
  if (b.plan === 'lifetime') {
    return withLimits('lifetime', { accessUntil: null, cancelAt: null, renews: false, canManageBilling })
  }
  if (b.plan === 'studio' && b.subscriptionStatus !== null && PRO_SUBSCRIPTION_STATUSES.has(b.subscriptionStatus)) {
    return withLimits('studio', {
      accessUntil: b.cancelAt ?? b.currentPeriodEnd,
      cancelAt: b.cancelAt,
      renews: b.cancelAt === null,
      canManageBilling,
    })
  }
  if (b.plan === 'creator' && isAfter(b.planExpiresAt, now)) {
    return withLimits('creator', { accessUntil: b.planExpiresAt, cancelAt: null, renews: false, canManageBilling })
  }
  return withLimits('explorer', { accessUntil: null, cancelAt: null, renews: false, canManageBilling })
}
