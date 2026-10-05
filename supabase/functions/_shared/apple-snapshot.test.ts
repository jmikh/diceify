import { describe, expect, it } from 'vitest'
import { PRICING } from '@/core/billing/plans'
import { APPLE_CREATOR_PASS_DAYS, computeAppleSnapshot, EMPTY_APPLE_SNAPSHOT, planOfProduct, userIdsOf, type RevenueCatSubscriber } from './apple-snapshot.ts'

const NOW = new Date('2026-09-30T12:00:00.000Z')
const DAY = 86_400_000
const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString()

const studio = (over: Partial<RevenueCatSubscriber['subscriptions'] extends infer S ? (S extends Record<string, infer V> ? V : never) : never> = {}) => ({
  expires_date: iso(20 * DAY),
  purchase_date: iso(-10 * DAY),
  unsubscribe_detected_at: null,
  billing_issues_detected_at: null,
  is_sandbox: false,
  store: 'app_store',
  ...over,
})

describe('planOfProduct', () => {
  it('maps the product ids (bare or reverse-DNS) and ignores others', () => {
    expect(planOfProduct('studio_monthly')).toBe('studio')
    expect(planOfProduct('studio_yearly')).toBe('studio')
    expect(planOfProduct('creator_30d')).toBe('creator')
    expect(planOfProduct('art.diceify.app.studio_yearly')).toBe('studio')
    expect(planOfProduct('art.diceify.app.Creator30')).toBe('creator')
    expect(planOfProduct('tip_jar')).toBeNull()
  })

  it('pins the pass length to the plan catalogue', () => {
    expect(APPLE_CREATOR_PASS_DAYS).toBe(PRICING.creator.accessDays)
  })
})

describe('computeAppleSnapshot', () => {
  it('is empty without purchases', () => {
    expect(computeAppleSnapshot({}, NOW)).toEqual(EMPTY_APPLE_SNAPSHOT)
    expect(computeAppleSnapshot({ subscriptions: {}, non_subscriptions: { tip_jar: [{ id: 't', purchase_date: iso(0) }] } }, NOW)).toEqual(EMPTY_APPLE_SNAPSHOT)
  })

  it('an active auto-renewable studio: expiry, renewing, environment', () => {
    expect(computeAppleSnapshot({ subscriptions: { studio_monthly: studio() } }, NOW)).toEqual({
      apple_plan: 'studio',
      apple_product_id: 'studio_monthly',
      apple_expires_at: iso(20 * DAY),
      apple_will_renew: true,
      apple_environment: 'production',
    })
    const cancelled = computeAppleSnapshot({ subscriptions: { studio_yearly: studio({ unsubscribe_detected_at: iso(-1 * DAY), is_sandbox: true }) } }, NOW)
    expect(cancelled).toMatchObject({ apple_plan: 'studio', apple_will_renew: false, apple_environment: 'sandbox', apple_expires_at: iso(20 * DAY) })
  })

  it('a creator pass ends 30 days after the latest purchase', () => {
    const subscriber = { non_subscriptions: { creator_30d: [{ id: 'a', purchase_date: iso(-40 * DAY) }, { id: 'b', purchase_date: iso(-5 * DAY) }] } }
    expect(computeAppleSnapshot(subscriber, NOW)).toEqual({
      apple_plan: 'creator',
      apple_product_id: 'creator_30d',
      apple_expires_at: iso(25 * DAY),
      apple_will_renew: false,
      apple_environment: 'production',
    })
  })

  it('an unexpired studio outranks an unexpired pass; a lapsed grant is kept as information', () => {
    const both = { subscriptions: { studio_monthly: studio({ expires_date: iso(2 * DAY) }) }, non_subscriptions: { creator_30d: [{ id: 'p', purchase_date: iso(-1 * DAY) }] } }
    expect(computeAppleSnapshot(both, NOW)).toMatchObject({ apple_plan: 'studio', apple_expires_at: iso(2 * DAY) })
    const lapsedStudio = { subscriptions: { studio_monthly: studio({ expires_date: iso(-3 * DAY) }) }, non_subscriptions: { creator_30d: [{ id: 'p', purchase_date: iso(-1 * DAY) }] } }
    expect(computeAppleSnapshot(lapsedStudio, NOW)).toMatchObject({ apple_plan: 'creator', apple_expires_at: iso(29 * DAY) })
    const allLapsed = { subscriptions: { studio_monthly: studio({ expires_date: iso(-3 * DAY) }), studio_yearly: studio({ expires_date: iso(-50 * DAY) }) } }
    expect(computeAppleSnapshot(allLapsed, NOW)).toMatchObject({ apple_plan: 'studio', apple_product_id: 'studio_monthly', apple_expires_at: iso(-3 * DAY), apple_will_renew: false })
  })

  it('between two live studios keeps the one ending later', () => {
    const two = { subscriptions: { studio_monthly: studio({ expires_date: iso(5 * DAY) }), studio_yearly: studio({ expires_date: iso(300 * DAY) }) } }
    expect(computeAppleSnapshot(two, NOW)).toMatchObject({ apple_product_id: 'studio_yearly', apple_expires_at: iso(300 * DAY) })
  })

  it('ignores unparsable dates and subscriptions without an end', () => {
    expect(computeAppleSnapshot({ subscriptions: { studio_monthly: studio({ expires_date: null }) } }, NOW)).toEqual(EMPTY_APPLE_SNAPSHOT)
    expect(computeAppleSnapshot({ non_subscriptions: { creator_30d: [{ id: 'x', purchase_date: 'never' }] } }, NOW)).toEqual(EMPTY_APPLE_SNAPSHOT)
  })
})

describe('userIdsOf', () => {
  const A = '0b3c8e7a-1f2d-4c5b-9a8e-7d6c5b4a3f21'
  const B = '9f8e7d6c-5b4a-4f3e-8d2c-1b0a9f8e7d6c'

  it('the Supabase user among the event ids; anonymous ids are not users', () => {
    expect(userIdsOf({ id: 'e', type: 'INITIAL_PURCHASE', app_user_id: A })).toEqual([A])
    expect(userIdsOf({ id: 'e', type: 'RENEWAL', app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc', B] })).toEqual([B])
    expect(userIdsOf({ id: 'e', type: 'EXPIRATION', app_user_id: '$RCAnonymousID:abc' })).toEqual([])
  })

  it('a TRANSFER (no app_user_id) names both accounts, once each', () => {
    expect(userIdsOf({ id: 'e', type: 'TRANSFER', transferred_from: [A, '$RCAnonymousID:x'], transferred_to: [B, A] })).toEqual([A, B])
    expect(userIdsOf({ id: 'e', type: 'TRANSFER', transferred_from: ['$RCAnonymousID:x'], transferred_to: [] })).toEqual([])
  })
})
