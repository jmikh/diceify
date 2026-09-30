// Stripe → profiles: fetch the customer's subscriptions and checkout sessions, recompute the snapshot, write it
// with the service role. Used by the webhook (by customer id) and the billing function (by profile id).
// Only type imports here so vitest can load `shouldSync` without Deno.

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeBillingSnapshot,
  type BillingSnapshot,
  type CheckoutSessionFacts,
  type SnapshotPlan,
  type SubscriptionFacts,
} from './billing-snapshot.ts'

/** What the client shows (camelCase). Mirrored in lib/supabase/billing.ts. */
export interface BillingView {
  plan: SnapshotPlan
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  cancelAt: string | null
  planExpiresAt: string | null
  hasStripeCustomer: boolean
  syncedAt: string | null
}

/** The profile columns the sync reads and writes. */
export interface ProfileBillingRow {
  id: string
  plan: string
  plan_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  current_period_end: string | null
  cancel_at: string | null
  synced_at: string | null
}

export const PROFILE_BILLING_COLUMNS =
  'id, plan, plan_expires_at, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, cancel_at, synced_at'

export type SyncTarget = { profileId: string } | { stripeCustomerId: string }

/** `GET /billing/sync` re-reads Stripe at most this often per profile. */
export const SYNC_MIN_INTERVAL_MS = 30_000

/** True when the last sync is missing, unparsable, or at least `minIntervalMs` old. */
export function shouldSync(syncedAt: string | null, now: Date, minIntervalMs: number): boolean {
  if (syncedAt === null) return true
  const at = Date.parse(syncedAt)
  if (Number.isNaN(at)) return true
  return now.getTime() - at >= minIntervalMs
}

const PLANS: readonly string[] = ['explorer', 'creator', 'studio', 'lifetime']
const asPlan = (value: string): SnapshotPlan => (PLANS.includes(value) ? (value as SnapshotPlan) : 'explorer')

export function toBillingView(row: ProfileBillingRow): BillingView {
  return {
    plan: asPlan(row.plan),
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: row.current_period_end,
    cancelAt: row.cancel_at,
    planExpiresAt: row.plan_expires_at,
    hasStripeCustomer: row.stripe_customer_id !== null && row.stripe_customer_id !== '',
    syncedAt: row.synced_at,
  }
}

export async function loadProfile(admin: SupabaseClient, by: SyncTarget): Promise<ProfileBillingRow | null> {
  const column = 'profileId' in by ? 'id' : 'stripe_customer_id'
  const value = 'profileId' in by ? by.profileId : by.stripeCustomerId
  const { data, error } = await admin.from('profiles').select(PROFILE_BILLING_COLUMNS).eq(column, value).maybeSingle()
  if (error) throw new Error(`profiles select failed: ${error.message}`)
  return (data as ProfileBillingRow | null) ?? null
}

async function writeProfile(
  admin: SupabaseClient,
  id: string,
  patch: Partial<BillingSnapshot> & { synced_at: string },
): Promise<ProfileBillingRow> {
  const { data, error } = await admin.from('profiles').update(patch).eq('id', id).select(PROFILE_BILLING_COLUMNS).single()
  if (error) throw new Error(`profiles update failed: ${error.message}`)
  return data as ProfileBillingRow
}

const subscriptionFacts = (s: Stripe.Subscription): SubscriptionFacts => ({
  id: s.id,
  status: s.status,
  created: s.created,
  cancel_at: s.cancel_at,
  cancel_at_period_end: s.cancel_at_period_end,
  // Not in the current API version's type; present in older webhook payloads.
  current_period_end: (s as unknown as { current_period_end?: number }).current_period_end,
  items: { data: s.items.data.map((item) => ({ current_period_end: item.current_period_end })) },
})

const sessionFacts = (s: Stripe.Checkout.Session): CheckoutSessionFacts => ({
  id: s.id,
  created: s.created,
  mode: s.mode,
  status: s.status,
  metadata: s.metadata,
})

/**
 * Recompute and store the profile's billing snapshot from Stripe. `null` when no profile matches `by`.
 * A profile without a Stripe customer only gets `synced_at` stamped (nothing to ask Stripe).
 */
export async function syncBillingFromStripe(
  admin: SupabaseClient,
  stripe: Stripe,
  by: SyncTarget,
  now: Date = new Date(),
): Promise<BillingView | null> {
  const profile = await loadProfile(admin, by)
  if (!profile) return null
  const syncedAt = now.toISOString()

  const customer = profile.stripe_customer_id
  if (!customer) return toBillingView(await writeProfile(admin, profile.id, { synced_at: syncedAt }))

  const [subscriptions, checkoutSessions] = await Promise.all([
    stripe.subscriptions.list({ customer, status: 'all', limit: 10 }),
    stripe.checkout.sessions.list({ customer, limit: 20 }),
  ])
  const snapshot = computeBillingSnapshot(
    { plan: asPlan(profile.plan), planExpiresAt: profile.plan_expires_at },
    { subscriptions: subscriptions.data.map(subscriptionFacts), checkoutSessions: checkoutSessions.data.map(sessionFacts) },
    now,
  )
  console.log(`billing-sync: ${profile.id} ← ${customer}: plan=${snapshot.plan} status=${snapshot.subscription_status ?? '-'}`)
  return toBillingView(await writeProfile(admin, profile.id, { ...snapshot, synced_at: syncedAt }))
}
