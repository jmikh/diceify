// Stripe webhook (config.toml: verify_jwt = false — Stripe signs, it does not carry a Supabase JWT).
//
// No per-event state machine: every relevant event only names the customer, and the whole billing snapshot is
// recomputed from Stripe (`syncBillingFromStripe`). Idempotent and order-independent by construction.
// Responses: 200 for anything handled or deliberately ignored (Stripe stops retrying), 400 for a bad signature,
// 500 when Stripe or the database failed (Stripe retries with backoff).

import type Stripe from 'stripe'
import { syncBillingFromStripe } from '../_shared/billing-sync.ts'
import { error, json } from '../_shared/http.ts'
import { assertStripeEnv, getStripe, stripeCryptoProvider } from '../_shared/stripe.ts'
import { getAdmin } from '../_shared/supabase-admin.ts'

assertStripeEnv()
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
if (!WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not set')

/** Events after which the customer's snapshot may have changed. */
const SYNC_EVENTS: ReadonlySet<string> = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
])

/** `customer` on checkout sessions, subscriptions and invoices: an id or an expanded object. */
function customerIdOf(object: unknown): string | null {
  const customer = (object as { customer?: unknown } | null)?.customer
  if (typeof customer === 'string') return customer
  if (customer && typeof customer === 'object' && typeof (customer as { id?: unknown }).id === 'string') {
    return (customer as { id: string }).id
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return error('VALIDATION', 'POST only', 405)
  const signature = req.headers.get('stripe-signature')
  if (!signature) return error('INVALID_SIGNATURE', 'Missing stripe-signature header', 400)

  // The raw body: any re-serialisation breaks the signature.
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(raw, signature, WEBHOOK_SECRET, undefined, stripeCryptoProvider)
  } catch (err) {
    console.warn(`stripe-webhook: signature rejected: ${err instanceof Error ? err.message : String(err)}`)
    return error('INVALID_SIGNATURE', 'Invalid signature', 400)
  }

  if (!SYNC_EVENTS.has(event.type)) return json({ received: true, ignored: true })

  const customerId = customerIdOf(event.data.object)
  if (!customerId) {
    console.warn(`stripe-webhook: ${event.type} ${event.id} carries no customer — ignored`)
    return json({ received: true, ignored: true })
  }

  try {
    const view = await syncBillingFromStripe(getAdmin(), getStripe(), { stripeCustomerId: customerId })
    if (!view) {
      console.warn(`stripe-webhook: ${event.type} ${event.id}: unknown customer ${customerId} — no profile, ignored`)
      return json({ received: true, unknownCustomer: true })
    }
    console.log(`stripe-webhook: ${event.type} ${event.id}: ${customerId} → plan=${view.plan}`)
    return json({ received: true })
  } catch (err) {
    console.error(`stripe-webhook: ${event.type} ${event.id}: sync failed:`, err)
    return error('INTERNAL', 'Billing sync failed', 500)
  }
})
