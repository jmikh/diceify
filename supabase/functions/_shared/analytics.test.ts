import { describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import { purchaseEvent, uuidFrom } from './analytics.ts'

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
