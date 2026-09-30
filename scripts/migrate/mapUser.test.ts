import { describe, expect, it } from 'vitest'
import { authUserInput, mapUserToProfile, normalizeEmail, type LegacyUserRow } from './mapUser'

const CREATED = new Date('2025-03-01T10:00:00Z')
const EXPIRES = new Date('2026-10-15T00:00:00Z')

const user = (over: Partial<LegacyUserRow> = {}): LegacyUserRow => ({
  id: 'clegacy1',
  email: 'Person@Example.com',
  name: 'Person',
  image: 'https://lh3.example/avatar.jpg',
  createdAt: CREATED,
  updatedAt: new Date('2026-09-20T00:00:00Z'),
  stripeCustomerId: 'cus_live1',
  stripeSubscriptionId: 'sub_live1',
  subscriptionStatus: null,
  subscriptionExpiresAt: EXPIRES,
  planType: 'explorer',
  isPro: false,
  ...over,
})

describe('mapUserToProfile', () => {
  const cases: { name: string; row: Partial<LegacyUserRow>; expected: Partial<ReturnType<typeof mapUserToProfile>> }[] = [
    {
      name: 'lifetime keeps only the customer id',
      row: { planType: 'lifetime', isPro: true, stripeSubscriptionId: null, subscriptionExpiresAt: null },
      expected: { plan: 'lifetime', plan_expires_at: null, stripe_customer_id: 'cus_live1', stripe_subscription_id: null, subscription_status: null, current_period_end: null },
    },
    {
      name: 'creator with creator_pass → creator pass with expiry, no subscription',
      row: { planType: 'creator', subscriptionStatus: 'creator_pass', isPro: true },
      expected: { plan: 'creator', plan_expires_at: EXPIRES.toISOString(), stripe_subscription_id: null, subscription_status: null, current_period_end: null },
    },
    {
      name: 'creator_pass status on an explorer planType still maps to creator',
      row: { planType: 'explorer', subscriptionStatus: 'creator_pass' },
      expected: { plan: 'creator', plan_expires_at: EXPIRES.toISOString(), subscription_status: null },
    },
    {
      name: 'creator without an expiry → creator with null expiry (lapsed, informational)',
      row: { planType: 'creator', subscriptionStatus: 'creator_pass', subscriptionExpiresAt: null },
      expected: { plan: 'creator', plan_expires_at: null },
    },
    {
      name: 'studio active → raw status, subscription id, period end',
      row: { planType: 'studio', subscriptionStatus: 'active', isPro: true },
      expected: { plan: 'studio', subscription_status: 'active', stripe_subscription_id: 'sub_live1', current_period_end: EXPIRES.toISOString(), plan_expires_at: null },
    },
    {
      name: 'studio canceled → still plan studio with the canceled status (entitlements derive explorer)',
      row: { planType: 'studio', subscriptionStatus: 'canceled', subscriptionExpiresAt: new Date('2026-01-01T00:00:00Z') },
      expected: { plan: 'studio', subscription_status: 'canceled', current_period_end: '2026-01-01T00:00:00.000Z' },
    },
    {
      name: 'studio past_due / trialing pass through',
      row: { planType: 'studio', subscriptionStatus: 'past_due' },
      expected: { plan: 'studio', subscription_status: 'past_due' },
    },
    {
      name: 'explorer with a Stripe customer keeps the customer id only',
      row: { planType: 'explorer' },
      expected: { plan: 'explorer', stripe_customer_id: 'cus_live1', stripe_subscription_id: null, subscription_status: null, current_period_end: null, plan_expires_at: null },
    },
    {
      name: 'explorer without Stripe',
      row: { planType: 'explorer', stripeCustomerId: null, stripeSubscriptionId: null, subscriptionExpiresAt: null },
      expected: { plan: 'explorer', stripe_customer_id: null },
    },
    {
      name: 'unknown planType falls back to explorer',
      row: { planType: 'enterprise' },
      expected: { plan: 'explorer' },
    },
  ]

  for (const c of cases) {
    it(c.name, () => {
      expect(mapUserToProfile(user(c.row))).toMatchObject(c.expected)
    })
  }

  it('always carries legacy_id and the original created_at', () => {
    const patch = mapUserToProfile(user())
    expect(patch.legacy_id).toBe('clegacy1')
    expect(patch.created_at).toBe(CREATED.toISOString())
  })

  it('treats blank ids as null', () => {
    expect(mapUserToProfile(user({ stripeCustomerId: '  ' })).stripe_customer_id).toBeNull()
  })
})

describe('authUserInput', () => {
  it('lower-cases the email, confirms it and carries name/avatar/legacy id', () => {
    expect(authUserInput(user())).toEqual({
      email: 'person@example.com',
      email_confirm: true,
      user_metadata: { full_name: 'Person', avatar_url: 'https://lh3.example/avatar.jpg', legacy_id: 'clegacy1' },
    })
  })

  it('omits empty name/avatar', () => {
    expect(authUserInput(user({ name: null, image: '' })).user_metadata).toEqual({ legacy_id: 'clegacy1' })
  })

  it('normalizeEmail trims and lower-cases', () => {
    expect(normalizeEmail('  A@B.Co ')).toBe('a@b.co')
  })
})
