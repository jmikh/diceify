import { describe, expect, it } from 'vitest'
import { deriveEntitlements, EXPLORER_ENTITLEMENTS, PRO_SUBSCRIPTION_STATUSES, type BillingState } from './entitlements'
import { PLAN_LIMITS, PLANS, PRICING, STUDIO_YEARLY_MONTHLY_EFFECTIVE, STUDIO_YEARLY_SAVINGS_PERCENT, type Plan } from './plans'

const NOW = new Date('2026-09-30T12:00:00.000Z')
const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString()
const DAY = 86_400_000

const state = (overrides: Partial<BillingState> = {}): BillingState => ({
  plan: 'explorer',
  planExpiresAt: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  cancelAt: null,
  hasStripeCustomer: false,
  ...overrides,
})

describe('PLAN_LIMITS / PRICING', () => {
  it('pins the limits table (null, never Infinity)', () => {
    expect(PLAN_LIMITS).toEqual({
      explorer: { builderRowLimit: 5, hasSvgExport: false },
      creator: { builderRowLimit: null, hasSvgExport: true },
      studio: { builderRowLimit: null, hasSvgExport: true },
      lifetime: { builderRowLimit: null, hasSvgExport: true },
    })
    for (const plan of PLANS) expect(PLAN_LIMITS[plan].builderRowLimit).not.toBe(Infinity)
  })

  it('pins the prices', () => {
    expect(PRICING.creator.price).toBe(19)
    expect(PRICING.creator.accessDays).toBe(30)
    expect(PRICING.studio.monthlyPrice).toBe(9)
    expect(PRICING.studio.yearlyPrice).toBe(36)
    expect(STUDIO_YEARLY_MONTHLY_EFFECTIVE).toBe(3)
    expect(STUDIO_YEARLY_SAVINGS_PERCENT).toBe(67)
  })
})

describe('deriveEntitlements: every plan × status × expiry × cancelAt', () => {
  const statuses = [null, 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']
  const expiries: { label: string; value: string | null; live: boolean }[] = [
    { label: 'null', value: null, live: false },
    { label: '30 days ago', value: iso(-30 * DAY), live: false },
    { label: '1 s ago', value: iso(-1000), live: false },
    { label: 'now', value: iso(0), live: false },
    { label: '1 s ahead', value: iso(1000), live: true },
    { label: '30 days ahead', value: iso(30 * DAY), live: true },
  ]
  const cancelAts = [null, iso(20 * DAY)]
  const periodEnd = iso(25 * DAY)

  for (const plan of PLANS) {
    for (const status of statuses) {
      it(`${plan} / ${status ?? 'no status'} across every expiry × cancelAt × customer`, () => {
        for (const expiry of expiries) {
          for (const cancelAt of cancelAts) {
            for (const hasStripeCustomer of [false, true]) {
              const label = `expires ${expiry.label}, cancelAt ${cancelAt ? 'set' : 'null'}, customer ${hasStripeCustomer}`
              const b = state({ plan, subscriptionStatus: status, planExpiresAt: expiry.value, currentPeriodEnd: periodEnd, cancelAt, hasStripeCustomer })
              const e = deriveEntitlements(b, NOW)

              const studioLive = plan === 'studio' && status !== null && PRO_SUBSCRIPTION_STATUSES.has(status)
              const expected: Plan = plan === 'lifetime' ? 'lifetime' : studioLive ? 'studio' : plan === 'creator' && expiry.live ? 'creator' : 'explorer'

              expect(e, label).toEqual({
                plan: expected,
                isPro: expected !== 'explorer',
                ...PLAN_LIMITS[expected],
                canManageBilling: hasStripeCustomer,
                ...(expected === 'studio'
                  ? { accessUntil: cancelAt ?? periodEnd, cancelAt, renews: cancelAt === null }
                  : { accessUntil: expected === 'creator' ? expiry.value : null, cancelAt: null, renews: false }),
              })
            }
          }
        }
      })
    }
  }
})

describe('deriveEntitlements: pinned cases', () => {
  it('past_due keeps studio access', () => {
    expect(deriveEntitlements(state({ plan: 'studio', subscriptionStatus: 'past_due' }), NOW).plan).toBe('studio')
  })

  it('a canceled studio subscription is explorer even with a future period end', () => {
    const e = deriveEntitlements(state({ plan: 'studio', subscriptionStatus: 'canceled', currentPeriodEnd: iso(DAY) }), NOW)
    expect(e.plan).toBe('explorer')
    expect(e.accessUntil).toBeNull()
  })

  it('creator expired by one second is explorer; one second left is creator', () => {
    expect(deriveEntitlements(state({ plan: 'creator', planExpiresAt: iso(-1000) }), NOW).plan).toBe('explorer')
    expect(deriveEntitlements(state({ plan: 'creator', planExpiresAt: iso(0) }), NOW).plan).toBe('explorer')
    expect(deriveEntitlements(state({ plan: 'creator', planExpiresAt: iso(1000) }), NOW).plan).toBe('creator')
  })

  it('creator ignores subscription status; studio ignores planExpiresAt', () => {
    expect(deriveEntitlements(state({ plan: 'creator', subscriptionStatus: 'active' }), NOW).plan).toBe('explorer')
    expect(deriveEntitlements(state({ plan: 'studio', subscriptionStatus: 'active', planExpiresAt: iso(-DAY) }), NOW).plan).toBe('studio')
  })

  it('cancel_at set: still pro, renews false, access until the cancel date', () => {
    const e = deriveEntitlements(state({ plan: 'studio', subscriptionStatus: 'active', currentPeriodEnd: iso(25 * DAY), cancelAt: iso(20 * DAY) }), NOW)
    expect(e).toMatchObject({ plan: 'studio', isPro: true, renews: false, cancelAt: iso(20 * DAY), accessUntil: iso(20 * DAY) })
  })

  it('lifetime never expires and has no access-until', () => {
    const e = deriveEntitlements(state({ plan: 'lifetime', subscriptionStatus: 'canceled', planExpiresAt: iso(-DAY) }), NOW)
    expect(e).toMatchObject({ plan: 'lifetime', isPro: true, builderRowLimit: null, accessUntil: null, renews: false })
  })

  it('an unparseable expiry counts as expired', () => {
    expect(deriveEntitlements(state({ plan: 'creator', planExpiresAt: 'not a date' }), NOW).plan).toBe('explorer')
  })

  it('survives a JSON round-trip without losing the unlimited row limit', () => {
    const e = deriveEntitlements(state({ plan: 'studio', subscriptionStatus: 'active' }), NOW)
    expect(e.builderRowLimit).toBeNull()
    expect(JSON.parse(JSON.stringify(e))).toEqual(e)
  })

  it('EXPLORER_ENTITLEMENTS is the signed-out default', () => {
    expect(EXPLORER_ENTITLEMENTS).toEqual(deriveEntitlements(state(), NOW))
    expect(EXPLORER_ENTITLEMENTS.builderRowLimit).toBe(5)
  })
})
