// Browser-less proof of the D2 billing routes against the LOCAL stack + Stripe test mode: checkout URL, one customer
// per user, sync after a real (API-created) subscription, 409 while pro, cancel/resume, portal URL. Skipped unless
// SUPABASE_TEST=1 and STRIPE_TEST=1 (needs `npm run db:start`, `npm run functions:serve`, the service-role key and
// the Stripe test key + monthly price id from supabase/functions/.env).
//
//   set -a; source supabase/functions/.env; set +a
//   SUPABASE_TEST=1 STRIPE_TEST=1 SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | grep '^SERVICE_ROLE_KEY' | cut -d= -f2 | tr -d '"') \
//     npx vitest run lib/supabase/billing.integration.test.ts
//
// The Creator pass (a completed `mode=payment` Checkout) cannot be simulated without a browser: docs/STRIPE_TESTING.md.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const ENABLED = process.env.SUPABASE_TEST === '1' && process.env.STRIPE_TEST === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331'
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const MONTHLY_PRICE = process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID ?? ''

process.env.NEXT_PUBLIC_SUPABASE_URL = URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY

const EMAIL = `d2-${Date.now()}@test.dev`
const PASSWORD = 'pass1234'

/** Minimal Stripe REST call (form-encoded) — the `stripe` package is a Deno-only dependency now. */
async function stripe<T>(method: 'GET' | 'POST' | 'DELETE', path: string, params: Record<string, string> = {}): Promise<T> {
  const body = new URLSearchParams(params).toString()
  const response = await fetch(`https://api.stripe.com/v1${path}${method === 'GET' && body ? `?${body}` : ''}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${STRIPE_KEY}:`).toString('base64')}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? body : undefined,
  })
  const json = (await response.json()) as T & { error?: { message: string } }
  if (!response.ok) throw new Error(`Stripe ${method} ${path}: ${json.error?.message ?? response.status}`)
  return json
}

describe.skipIf(!ENABLED)('billing routes (local stack + Stripe test mode)', () => {
  let admin: SupabaseClient<Database>
  let userId = ''
  let customerId = ''

  const customerOf = async () => {
    const { data } = await admin.from('profiles').select('stripe_customer_id').eq('id', userId).single()
    return data?.stripe_customer_id ?? null
  }

  beforeAll(async () => {
    expect(SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required').not.toBe('')
    expect(STRIPE_KEY.startsWith('sk_test_'), 'STRIPE_SECRET_KEY must be a test key').toBe(true)
    expect(MONTHLY_PRICE, 'STRIPE_STUDIO_MONTHLY_PRICE_ID is required').not.toBe('')
    admin = createClient<Database>(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true })
    if (error) throw error
    userId = data.user.id
    const { getSupabase } = await import('./client')
    const { error: signInError } = await getSupabase().auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
    expect(signInError).toBeNull()
  }, 30_000)

  afterAll(async () => {
    // Deleting the customer cancels its subscriptions; then the auth user (profile cascades).
    if (customerId) await stripe('DELETE', `/customers/${customerId}`).catch((err) => console.warn(err))
    if (userId) await admin.auth.admin.deleteUser(userId)
  }, 30_000)

  it('checkout → Stripe Checkout URL, creates exactly one customer, 409 once pro; cancel/resume; portal', async () => {
    const { BillingError, cancelSubscription, openBillingPortal, resumeSubscription, startCheckout, syncBilling } = await import('./billing')

    // 1. First checkout creates the customer and a session.
    const first = await startCheckout('studio_monthly')
    expect(first.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    customerId = (await customerOf()) ?? ''
    expect(customerId).toMatch(/^cus_/)

    // 2. A second checkout (still not pro) reuses that customer.
    const second = await startCheckout('creator')
    expect(second.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    expect(await customerOf()).toBe(customerId)
    const customers = await stripe<{ data: { id: string }[] }>('GET', '/customers', { email: EMAIL })
    expect(customers.data.map((c) => c.id)).toEqual([customerId])

    // 3. Simulate the purchase: a real subscription on that customer through the Stripe API.
    // `pm_card_visa` is a test token: attaching it yields a fresh payment method id.
    const card = await stripe<{ id: string }>('POST', '/payment_methods/pm_card_visa/attach', { customer: customerId })
    const sub = await stripe<{ id: string; status: string }>('POST', '/subscriptions', {
      customer: customerId,
      'items[0][price]': MONTHLY_PRICE,
      default_payment_method: card.id,
      'metadata[userId]': userId,
      'metadata[plan]': 'studio_monthly',
    })
    expect(sub.status).toBe('active')

    // 4. Sync → studio/active with a period end.
    const synced = await syncBilling()
    expect(synced).toMatchObject({ plan: 'studio', subscriptionStatus: 'active', cancelAt: null, hasStripeCustomer: true })
    expect(synced.currentPeriodEnd).not.toBeNull()

    // 5. Checkout while pro → 409.
    await expect(startCheckout('studio_yearly')).rejects.toMatchObject({ code: 'ALREADY_SUBSCRIBED', status: 409 })
    await expect(startCheckout('creator')).rejects.toBeInstanceOf(BillingError)

    // 6. Cancel at period end → cancel_at set, still studio; again → 409.
    const canceled = await cancelSubscription()
    expect(canceled.plan).toBe('studio')
    expect(canceled.subscriptionStatus).toBe('active')
    expect(canceled.cancelAt).not.toBeNull()
    await expect(cancelSubscription()).rejects.toMatchObject({ code: 'ALREADY_SCHEDULED', status: 409 })

    // 7. Resume → cleared; again → 409.
    const resumed = await resumeSubscription()
    expect(resumed.cancelAt).toBeNull()
    expect(resumed.plan).toBe('studio')
    await expect(resumeSubscription()).rejects.toMatchObject({ code: 'NOT_SCHEDULED', status: 409 })

    // 8. Portal (requires the Customer Portal to be configured once in the Stripe test dashboard).
    const portal = await openBillingPortal('/account')
    expect(portal.url).toMatch(/^https:\/\/billing\.stripe\.com\//)
  }, 90_000)

  it('portal needs a Stripe customer (404 NO_SUBSCRIPTION for a fresh profile)', async () => {
    const { openBillingPortal } = await import('./billing')
    // The main test may have run first: clear the customer id on the row (service role) to reproduce a fresh profile.
    const { error } = await admin.from('profiles').update({ stripe_customer_id: null }).eq('id', userId)
    expect(error).toBeNull()
    await expect(openBillingPortal()).rejects.toMatchObject({ code: 'NO_SUBSCRIPTION', status: 404 })
    await admin.from('profiles').update({ stripe_customer_id: customerId || null }).eq('id', userId)
  }, 30_000)
})
