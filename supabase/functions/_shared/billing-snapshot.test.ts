import { describe, expect, it } from 'vitest'
// Test-only import: pins that a lapsed snapshot maps to explorer entitlements on the client. The module under
// test itself has zero imports.
import { deriveEntitlements, PRO_SUBSCRIPTION_STATUSES as CORE_PRO_STATUSES } from '@/core/billing/entitlements'
import { PRICING } from '@/core/billing/plans'
import { shouldSync, SYNC_MIN_INTERVAL_MS } from './billing-sync.ts'
import {
  computeBillingSnapshot,
  creatorExpiry,
  CREATOR_PASS_DAYS,
  effectivePlan,
  hasPaidAccess,
  pickSubscription,
  PRO_SUBSCRIPTION_STATUSES,
  type BillingSnapshot,
  type CheckoutSessionFacts,
  type SubscriptionFacts,
} from './billing-snapshot.ts'

const NOW = new Date('2026-09-30T12:00:00.000Z')
const T0 = Math.floor(NOW.getTime() / 1000)
const DAY = 86_400

const sub = (overrides: Partial<SubscriptionFacts> = {}): SubscriptionFacts => ({
  id: 'sub_active',
  status: 'active',
  created: T0 - 10 * DAY,
  cancel_at: null,
  items: { data: [{ current_period_end: T0 + 20 * DAY }] },
  ...overrides,
})

const session = (overrides: Partial<CheckoutSessionFacts> = {}): CheckoutSessionFacts => ({
  id: 'cs_creator',
  created: T0 - 5 * DAY,
  mode: 'payment',
  status: 'complete',
  metadata: { plan: 'creator' },
  ...overrides,
})

const iso = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString()
const explorer = { plan: 'explorer' as const, planExpiresAt: null }
const none = { subscriptions: [], checkoutSessions: [] }

/** What the client does with the row: snapshot columns → BillingState → entitlements. */
const entitlementsOf = (s: BillingSnapshot, { now = NOW, hasStripeCustomer = true } = {}) =>
  deriveEntitlements(
    {
      plan: s.plan,
      planExpiresAt: s.plan_expires_at,
      subscriptionStatus: s.subscription_status,
      currentPeriodEnd: s.current_period_end,
      cancelAt: s.cancel_at,
      hasStripeCustomer,
    },
    now,
  )

describe('mirrors of core/billing', () => {
  it('uses the same PRO statuses and creator pass length as the client', () => {
    expect([...PRO_SUBSCRIPTION_STATUSES].sort()).toEqual([...CORE_PRO_STATUSES].sort())
    expect(CREATOR_PASS_DAYS).toBe(PRICING.creator.accessDays)
  })
})

describe('hasPaidAccess', () => {
  it('equals deriveEntitlements().isPro for every plan/status/expiry combination', () => {
    const future = iso(T0 + 1 * DAY)
    const past = iso(T0 - 1 * DAY)
    const plans = ['explorer', 'creator', 'studio', 'lifetime', 'bogus'] as const
    const statuses = [null, 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete']
    const expiries = [null, future, past, NOW.toISOString()]
    let checked = 0
    for (const plan of plans) {
      for (const subscription_status of statuses) {
        for (const plan_expires_at of expiries) {
          const row = { plan, plan_expires_at, subscription_status }
          const expected = deriveEntitlements(
            {
              plan: plan === 'bogus' ? 'explorer' : plan,
              planExpiresAt: plan_expires_at,
              subscriptionStatus: subscription_status,
              currentPeriodEnd: null,
              cancelAt: null,
              hasStripeCustomer: true,
            },
            NOW,
          ).isPro
          expect(hasPaidAccess(row, NOW), JSON.stringify(row)).toBe(expected)
          checked++
        }
      }
    }
    expect(checked).toBe(plans.length * statuses.length * expiries.length)
    expect(hasPaidAccess({ plan: 'lifetime', plan_expires_at: null, subscription_status: 'canceled' }, NOW)).toBe(true)
    expect(hasPaidAccess({ plan: 'studio', plan_expires_at: null, subscription_status: 'past_due' }, NOW)).toBe(true)
    expect(hasPaidAccess({ plan: 'creator', plan_expires_at: future, subscription_status: null }, NOW)).toBe(true)
    expect(hasPaidAccess({ plan: 'creator', plan_expires_at: past, subscription_status: 'active' }, NOW)).toBe(false)
  })

  it('counts an unexpired Apple grant, with the same priority as deriveEntitlements', () => {
    const future = iso(T0 + 1 * DAY)
    const past = iso(T0 - 1 * DAY)
    const explorer = { plan: 'explorer', plan_expires_at: null, subscription_status: null }
    for (const [apple, expires, expected] of [
      ['studio', future, 'studio'],
      ['creator', future, 'creator'],
      ['studio', past, 'explorer'],
      ['creator', null, 'explorer'],
      [null, future, 'explorer'],
    ] as const) {
      const row = { ...explorer, apple_plan: apple, apple_expires_at: expires }
      expect(effectivePlan(row, NOW), JSON.stringify(row)).toBe(expected)
      expect(hasPaidAccess(row, NOW)).toBe(expected !== 'explorer')
      const core = deriveEntitlements(
        { plan: 'explorer', planExpiresAt: null, subscriptionStatus: null, currentPeriodEnd: null, cancelAt: null, hasStripeCustomer: false, applePlan: apple, appleExpiresAt: expires, appleWillRenew: false },
        NOW,
      )
      expect(core.plan).toBe(expected)
    }
    // Stripe creator pass + Apple studio → studio (Apple studio outranks a creator pass from either source)
    expect(effectivePlan({ plan: 'creator', plan_expires_at: future, subscription_status: null, apple_plan: 'studio', apple_expires_at: future }, NOW)).toBe('studio')
  })
})

describe('pickSubscription', () => {
  it('prefers the newest PRO subscription over a newer canceled one', () => {
    const canceled = sub({ id: 'sub_canceled', status: 'canceled', created: T0 - 1 * DAY })
    const active = sub({ id: 'sub_active', created: T0 - 10 * DAY })
    expect(pickSubscription([canceled, active])?.id).toBe('sub_active')
    expect(pickSubscription([active, canceled])?.id).toBe('sub_active')
  })

  it('picks the newest PRO one when several qualify, and the newest overall when none does', () => {
    const older = sub({ id: 'sub_old', status: 'past_due', created: T0 - 40 * DAY })
    const newer = sub({ id: 'sub_new', status: 'trialing', created: T0 - 2 * DAY })
    expect(pickSubscription([older, newer])?.id).toBe('sub_new')
    const c1 = sub({ id: 'c1', status: 'canceled', created: T0 - 30 * DAY })
    const c2 = sub({ id: 'c2', status: 'unpaid', created: T0 - 3 * DAY })
    expect(pickSubscription([c1, c2])?.id).toBe('c2')
    expect(pickSubscription([])).toBeNull()
  })
})

describe('creatorExpiry', () => {
  it('accepts `plan` or the legacy `planType` metadata key, only for complete one-time sessions', () => {
    const created = T0 - 5 * DAY
    expect(creatorExpiry(null, [session({ metadata: { planType: 'creator' } })])).toBe(iso(created + 30 * DAY))
    expect(creatorExpiry(null, [session({ metadata: { plan: 'studio_monthly' } })])).toBeNull()
    expect(creatorExpiry(null, [session({ mode: 'subscription' })])).toBeNull()
    expect(creatorExpiry(null, [session({ status: 'open' })])).toBeNull()
    expect(creatorExpiry(null, [session({ metadata: null })])).toBeNull()
  })

  it('is monotonic: keeps a later stored expiry, raises to a later purchase', () => {
    const stored = iso(T0 + 60 * DAY)
    expect(creatorExpiry(stored, [session()])).toBe(stored)
    const later = session({ id: 'cs_later', created: T0 - 1 * DAY })
    expect(creatorExpiry(iso(T0 + 1 * DAY), [session(), later])).toBe(iso(T0 - 1 * DAY + 30 * DAY))
    expect(creatorExpiry(null, [])).toBeNull()
  })
})

describe('computeBillingSnapshot', () => {
  it('active + canceled → the active one, studio with period end', () => {
    const canceled = sub({ id: 'sub_canceled', status: 'canceled', created: T0 - 1 * DAY, cancel_at: T0 - 1 * DAY })
    const s = computeBillingSnapshot(explorer, { subscriptions: [canceled, sub()], checkoutSessions: [] }, NOW)
    expect(s).toEqual({
      plan: 'studio',
      stripe_subscription_id: 'sub_active',
      subscription_status: 'active',
      current_period_end: iso(T0 + 20 * DAY),
      cancel_at: null,
      plan_expires_at: null,
    })
    const ent = entitlementsOf(s)
    expect(ent.plan).toBe('studio')
    expect(ent.renews).toBe(true)
    expect(ent.accessUntil).toBe(iso(T0 + 20 * DAY))
  })

  it('only canceled → plan studio (lapsed) but explorer entitlements', () => {
    const canceled = sub({ id: 'sub_canceled', status: 'canceled', cancel_at: T0 - 2 * DAY })
    const s = computeBillingSnapshot(explorer, { subscriptions: [canceled], checkoutSessions: [] }, NOW)
    expect(s.plan).toBe('studio')
    expect(s.subscription_status).toBe('canceled')
    expect(s.cancel_at).toBe(iso(T0 - 2 * DAY))
    const ent = entitlementsOf(s)
    expect(ent.plan).toBe('explorer')
    expect(ent.isPro).toBe(false)
    expect(ent.canManageBilling).toBe(true)
  })

  it('creator purchase (planType metadata) → creator until created + 30 d', () => {
    const facts = { subscriptions: [], checkoutSessions: [session({ metadata: { planType: 'creator' } })] }
    const s = computeBillingSnapshot(explorer, facts, NOW)
    expect(s).toEqual({
      plan: 'creator',
      stripe_subscription_id: null,
      subscription_status: null,
      current_period_end: null,
      cancel_at: null,
      plan_expires_at: iso(T0 - 5 * DAY + 30 * DAY),
    })
    expect(entitlementsOf(s).plan).toBe('creator')
    // 26 days later the same facts are a lapsed pass: plan creator (informational), entitlements explorer.
    const later = new Date(NOW.getTime() + 26 * DAY * 1000)
    const lapsed = computeBillingSnapshot(explorer, facts, later)
    expect(lapsed.plan).toBe('creator')
    expect(entitlementsOf(lapsed, { now: later }).plan).toBe('explorer')
  })

  it('plan_expires_at is monotonic across syncs', () => {
    const stored = { plan: 'creator' as const, planExpiresAt: iso(T0 + 40 * DAY) }
    const s = computeBillingSnapshot(stored, { subscriptions: [], checkoutSessions: [session()] }, NOW)
    expect(s.plan_expires_at).toBe(stored.planExpiresAt)
    expect(s.plan).toBe('creator')
  })

  it('an active studio subscription wins over an unexpired creator pass, and the pass is kept', () => {
    const s = computeBillingSnapshot(explorer, { subscriptions: [sub()], checkoutSessions: [session()] }, NOW)
    expect(s.plan).toBe('studio')
    expect(s.plan_expires_at).toBe(iso(T0 - 5 * DAY + 30 * DAY))
  })

  it('lifetime is never downgraded, the subscription facts are still recorded', () => {
    const lifetime = { plan: 'lifetime' as const, planExpiresAt: null }
    expect(computeBillingSnapshot(lifetime, none, NOW).plan).toBe('lifetime')
    const canceled = sub({ id: 'sub_canceled', status: 'canceled' })
    const s = computeBillingSnapshot(lifetime, { subscriptions: [canceled], checkoutSessions: [] }, NOW)
    expect(s.plan).toBe('lifetime')
    expect(s.stripe_subscription_id).toBe('sub_canceled')
    expect(s.subscription_status).toBe('canceled')
    expect(entitlementsOf(s).plan).toBe('lifetime')
  })

  it('period end comes from the first item, falling back to the root field', () => {
    const itemLevel = sub({ current_period_end: T0 + 1 * DAY, items: { data: [{ current_period_end: T0 + 20 * DAY }] } })
    expect(computeBillingSnapshot(explorer, { subscriptions: [itemLevel], checkoutSessions: [] }, NOW).current_period_end).toBe(
      iso(T0 + 20 * DAY),
    )
    const rootOnly = sub({ current_period_end: T0 + 1 * DAY, items: { data: [{}] } })
    expect(computeBillingSnapshot(explorer, { subscriptions: [rootOnly], checkoutSessions: [] }, NOW).current_period_end).toBe(
      iso(T0 + 1 * DAY),
    )
    const neither = sub({ items: { data: [] } })
    expect(computeBillingSnapshot(explorer, { subscriptions: [neither], checkoutSessions: [] }, NOW).current_period_end).toBeNull()
  })

  it('cancel_at falls back to the period end when only cancel_at_period_end is set', () => {
    const pending = sub({ cancel_at: null, cancel_at_period_end: true })
    const s = computeBillingSnapshot(explorer, { subscriptions: [pending], checkoutSessions: [] }, NOW)
    expect(s.cancel_at).toBe(iso(T0 + 20 * DAY))
    const ent = entitlementsOf(s)
    expect(ent.plan).toBe('studio')
    expect(ent.renews).toBe(false)
    expect(ent.cancelAt).toBe(iso(T0 + 20 * DAY))
    // An explicit cancel_at wins over the fallback.
    const explicit = sub({ cancel_at: T0 + 3 * DAY, cancel_at_period_end: true })
    expect(computeBillingSnapshot(explorer, { subscriptions: [explicit], checkoutSessions: [] }, NOW).cancel_at).toBe(iso(T0 + 3 * DAY))
  })

  it('no facts → explorer with every column null', () => {
    const s = computeBillingSnapshot(explorer, none, NOW)
    expect(s).toEqual({
      plan: 'explorer',
      stripe_subscription_id: null,
      subscription_status: null,
      current_period_end: null,
      cancel_at: null,
      plan_expires_at: null,
    })
    expect(entitlementsOf(s, { hasStripeCustomer: false }).plan).toBe('explorer')
    expect(entitlementsOf(s, { hasStripeCustomer: false }).canManageBilling).toBe(false)
  })
})

describe('shouldSync', () => {
  it('syncs without a timestamp, with an unparsable one, or once the interval has passed', () => {
    expect(shouldSync(null, NOW, SYNC_MIN_INTERVAL_MS)).toBe(true)
    expect(shouldSync('not a date', NOW, SYNC_MIN_INTERVAL_MS)).toBe(true)
    expect(shouldSync(new Date(NOW.getTime() - 31_000).toISOString(), NOW, SYNC_MIN_INTERVAL_MS)).toBe(true)
    expect(shouldSync(new Date(NOW.getTime() - 30_000).toISOString(), NOW, SYNC_MIN_INTERVAL_MS)).toBe(true)
  })

  it('skips a sync younger than the interval (including a clock-skewed future one)', () => {
    expect(shouldSync(new Date(NOW.getTime() - 29_999).toISOString(), NOW, SYNC_MIN_INTERVAL_MS)).toBe(false)
    expect(shouldSync(NOW.toISOString(), NOW, SYNC_MIN_INTERVAL_MS)).toBe(false)
    expect(shouldSync(new Date(NOW.getTime() + 5_000).toISOString(), NOW, SYNC_MIN_INTERVAL_MS)).toBe(false)
  })
})
