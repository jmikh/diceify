// Billing API for the signed-in user (config.toml: verify_jwt = true — the gateway already rejects requests
// without a valid Supabase JWT; `requireUser` then resolves the user or answers 401 for the bare anon key).
//
// Routes (pathname after `/billing`):
//   GET  /sync      recompute the caller's billing snapshot from Stripe (at most every SYNC_MIN_INTERVAL_MS)
//                   → { billing: BillingView }. The client refreshes its profile row for entitlements.
// TODO(D2): POST /checkout { plan }, POST /portal { returnPath? }, POST /cancel, POST /resume.

import {
  loadProfile,
  shouldSync,
  syncBillingFromStripe,
  SYNC_MIN_INTERVAL_MS,
  toBillingView,
  type BillingView,
} from '../_shared/billing-sync.ts'
import { error, handleOptions, json, requireUser } from '../_shared/http.ts'
import { assertStripeEnv, getStripe } from '../_shared/stripe.ts'
import { getAdmin } from '../_shared/supabase-admin.ts'

assertStripeEnv()

function routeOf(req: Request): string {
  const pathname = new URL(req.url).pathname.replace(/\/+$/, '')
  const marker = '/billing'
  const at = pathname.lastIndexOf(marker)
  return at === -1 ? pathname : pathname.slice(at + marker.length) || '/'
}

async function handleSync(userId: string): Promise<Response> {
  const admin = getAdmin()
  const now = new Date()
  const profile = await loadProfile(admin, { profileId: userId })
  if (!profile) return error('NOT_FOUND', 'No profile for this user', 404)

  let billing: BillingView
  if (shouldSync(profile.synced_at, now, SYNC_MIN_INTERVAL_MS)) {
    billing = (await syncBillingFromStripe(admin, getStripe(), { profileId: userId }, now)) ?? toBillingView(profile)
  } else {
    const ageS = Math.round((now.getTime() - Date.parse(profile.synced_at!)) / 1000)
    console.log(`billing/sync: ${userId}: skipped (synced ${ageS}s ago)`)
    billing = toBillingView(profile)
  }
  return json({ billing })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()

  const user = await requireUser(req, getAdmin())
  if (!user) return error('UNAUTHORIZED', 'Sign in required', 401)

  const route = routeOf(req)
  try {
    if (req.method === 'GET' && route === '/sync') return await handleSync(user.id)
    return error('NOT_FOUND', `No route ${req.method} ${route}`, 404)
  } catch (err) {
    console.error(`billing: ${req.method} ${route} failed for ${user.id}:`, err)
    return error('INTERNAL', 'Billing request failed', 500)
  }
})
