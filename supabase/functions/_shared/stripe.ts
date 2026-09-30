// Stripe client for the edge functions. The SDK is pinned exactly in deno.json (npm:stripe@20.4.1) and the API
// version below is that SDK's own pin: bumping the SDK changes the literal type and `deno check` fails until this
// constant is updated on purpose. The dashboard webhook endpoint must use the same version (docs/DEPLOY.md).

import Stripe from 'stripe'

export const STRIPE_API_VERSION = '2026-02-25.clover' as const

const LOCAL_HOSTS = ['http://127.0.0.1', 'http://localhost', 'http://kong']

export function isLocalSupabase(url = Deno.env.get('SUPABASE_URL') ?? ''): boolean {
  return LOCAL_HOSTS.some((prefix) => url.startsWith(prefix))
}

/**
 * Boot guard: a test key may only talk to a local stack, a live key locally is (loudly) allowed for
 * production-data dry runs. Throws when the key is missing.
 */
export function assertStripeEnv(): void {
  const key = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  const local = isLocalSupabase()
  if (key.startsWith('sk_test_') && !local) {
    throw new Error('STRIPE_SECRET_KEY is a test key but SUPABASE_URL is not a local stack')
  }
  if (key.startsWith('sk_live_') && local) {
    console.warn('stripe: LIVE key against the local stack — real customers will be read')
  }
}

let client: Stripe | undefined

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: STRIPE_API_VERSION,
      // Deno's fetch; the SDK's default Node http client is not available in the edge runtime.
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return client
}

/** Webhook signature verification uses SubtleCrypto (async) — the sync variant needs Node's crypto. */
export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider()
