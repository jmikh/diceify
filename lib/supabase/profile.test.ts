import { describe, expect, it } from 'vitest'
import { deriveEntitlements } from '@/core/billing'
import { toBillingState, type ProfileRow } from './profile'

const row = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'a@test.dev',
  name: 'A',
  avatar_url: null,
  plan: 'explorer',
  plan_expires_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_status: null,
  current_period_end: null,
  cancel_at: null,
  synced_at: null,
  apple_plan: null,
  apple_product_id: null,
  apple_expires_at: null,
  apple_will_renew: false,
  apple_environment: null,
  apple_synced_at: null,
  legacy_id: null,
  created_at: '2026-09-30T00:00:00.000Z',
  updated_at: '2026-09-30T00:00:00.000Z',
  ...overrides,
})

describe('toBillingState', () => {
  it('maps the snake_case columns one to one', () => {
    expect(
      toBillingState(
        row({
          plan: 'studio',
          plan_expires_at: '2026-10-30T00:00:00.000Z',
          subscription_status: 'active',
          current_period_end: '2026-10-15T00:00:00.000Z',
          cancel_at: '2026-10-15T00:00:00.000Z',
          stripe_customer_id: 'cus_123',
        }),
      ),
    ).toEqual({
      plan: 'studio',
      planExpiresAt: '2026-10-30T00:00:00.000Z',
      subscriptionStatus: 'active',
      currentPeriodEnd: '2026-10-15T00:00:00.000Z',
      cancelAt: '2026-10-15T00:00:00.000Z',
      hasStripeCustomer: true,
      applePlan: null,
      appleExpiresAt: null,
      appleWillRenew: false,
    })
  })

  it('maps the Apple columns and drops an unknown apple_plan', () => {
    const apple = toBillingState(row({ apple_plan: 'studio', apple_expires_at: '2026-11-01T00:00:00.000Z', apple_will_renew: true }))
    expect(apple).toMatchObject({ applePlan: 'studio', appleExpiresAt: '2026-11-01T00:00:00.000Z', appleWillRenew: true })
    expect(toBillingState(row({ apple_plan: 'gold' })).applePlan).toBeNull()
  })

  it('has no Stripe customer for null or empty ids', () => {
    expect(toBillingState(row()).hasStripeCustomer).toBe(false)
    expect(toBillingState(row({ stripe_customer_id: '' })).hasStripeCustomer).toBe(false)
  })

  it('falls back to explorer for a plan value it does not know', () => {
    expect(toBillingState(row({ plan: 'enterprise' })).plan).toBe('explorer')
  })

  it('feeds deriveEntitlements: an active studio row gets studio limits', () => {
    const ent = deriveEntitlements(
      toBillingState(row({ plan: 'studio', subscription_status: 'active', current_period_end: '2026-10-15T00:00:00.000Z' })),
      new Date('2026-09-30T12:00:00.000Z'),
    )
    expect(ent.plan).toBe('studio')
    expect(ent.builderRowLimit).toBeNull()
    expect(ent.accessUntil).toBe('2026-10-15T00:00:00.000Z')
  })

  it('feeds deriveEntitlements: an unexpired Apple studio row gets studio from the apple source', () => {
    const ent = deriveEntitlements(
      toBillingState(row({ apple_plan: 'studio', apple_expires_at: '2026-10-15T00:00:00.000Z', apple_will_renew: true })),
      new Date('2026-09-30T12:00:00.000Z'),
    )
    expect(ent).toMatchObject({ plan: 'studio', source: 'apple', renews: true, accessUntil: '2026-10-15T00:00:00.000Z', canManageBilling: false })
  })
})
