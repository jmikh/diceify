import { describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import { applePurchaseEvent, purchaseEvent, uuidFrom } from './analytics.ts'

function checkoutCompleted(session: Partial<Stripe.Checkout.Session>, type = 'checkout.session.completed'): Stripe.Event {
  return {
    id: 'evt_123',
    type,
    created: 1_790_000_000,
    data: {
      object: {
        client_reference_id: 'user-1',
        payment_status: 'paid',
        mode: 'payment',
        amount_total: 1900,
        currency: 'usd',
        metadata: { userId: 'user-1', plan: 'creator' },
        ...session,
      },
    },
  } as unknown as Stripe.Event
}

describe('uuidFrom', () => {
  it('is a deterministic version-8 UUID', async () => {
    const a = await uuidFrom('evt_123')
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(await uuidFrom('evt_123')).toBe(a)
    expect(await uuidFrom('evt_124')).not.toBe(a)
  })
})

describe('purchaseEvent', () => {
  it('maps a paid checkout to purchase_completed for the user, timed by Stripe', async () => {
    const e = await purchaseEvent(checkoutCompleted({}), 'creator')
    expect(e).toEqual({
      event: 'purchase_completed',
      distinctId: 'user-1',
      timestamp: new Date(1_790_000_000 * 1000).toISOString(),
      uuid: await uuidFrom('evt_123'),
      properties: {
        checkout_plan: 'creator',
        mode: 'payment',
        revenue: 19,
        currency: 'usd',
        $set: { plan: 'creator' },
      },
    })
  })

  it('counts a fully discounted checkout (no payment required)', async () => {
    const e = await purchaseEvent(checkoutCompleted({ payment_status: 'no_payment_required', amount_total: 0 }), 'studio')
    expect(e?.properties).toMatchObject({ revenue: 0, $set: { plan: 'studio' } })
  })

  it('ignores unpaid sessions, sessions without a user and other events', async () => {
    expect(await purchaseEvent(checkoutCompleted({ payment_status: 'unpaid' }), 'explorer')).toBeNull()
    expect(await purchaseEvent(checkoutCompleted({ client_reference_id: null }), 'creator')).toBeNull()
    expect(await purchaseEvent(checkoutCompleted({}, 'invoice.paid'), 'creator')).toBeNull()
  })
})

describe('applePurchaseEvent', () => {
  const event = (over: Partial<Parameters<typeof applePurchaseEvent>[0]> = {}) => ({
    id: 'rc_1',
    type: 'INITIAL_PURCHASE',
    product_id: 'studio_monthly',
    environment: 'SANDBOX',
    price: 9,
    currency: 'USD',
    event_timestamp_ms: 1_790_000_000_000,
    ...over,
  })

  it('records a payment with the store, environment and the plan after the sync', async () => {
    const e = await applePurchaseEvent(event(), 'user-1', 'studio')
    expect(e).toMatchObject({
      event: 'purchase_completed',
      distinctId: 'user-1',
      timestamp: '2026-09-21T14:13:20.000Z',
      properties: { checkout_plan: 'studio_monthly', mode: 'subscription', revenue: 9, currency: 'usd', store: 'app_store', environment: 'sandbox', revenuecat_event: 'INITIAL_PURCHASE', $set: { plan: 'studio' } },
    })
    expect(e?.uuid).toBe(await uuidFrom('revenuecat:rc_1'))
    expect((await applePurchaseEvent(event({ type: 'NON_RENEWING_PURCHASE', product_id: 'creator_30d', price: 19 }), 'u', 'creator'))?.properties).toMatchObject({ mode: 'payment', revenue: 19 })
  })

  it('ignores state changes and tolerates missing price fields', async () => {
    for (const type of ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE', 'TRANSFER', 'TEST']) {
      expect(await applePurchaseEvent(event({ type }), 'u', 'explorer')).toBeNull()
    }
    const bare = await applePurchaseEvent({ id: 'rc_2', type: 'RENEWAL' }, 'u', 'studio')
    expect(bare?.properties).toMatchObject({ checkout_plan: null, revenue: 0, currency: 'usd', environment: 'production' })
  })
})
