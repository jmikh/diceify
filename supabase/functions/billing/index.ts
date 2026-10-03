// Billing API for the signed-in user (config.toml: verify_jwt = true — the gateway already rejects requests
// without a valid Supabase JWT; `requireUser` then resolves the user or answers 401 for the bare anon key).
//
// Routes (pathname after `/billing`; request/response shapes in plans/revamp/revamp-step-D2.md):
//   GET  /sync       recompute the caller's snapshot from Stripe (at most every SYNC_MIN_INTERVAL_MS) → { billing }
//   POST /checkout   { plan } → { url }   409 ALREADY_SUBSCRIBED while any paid plan is active
//   POST /portal     { returnPath? } → { url }   404 NO_SUBSCRIPTION without a Stripe customer
//   POST /cancel     → { billing }   schedules cancel_at_period_end; 404 NO_SUBSCRIPTION / 409 ALREADY_SCHEDULED
//   POST /resume     → { billing }   clears it; 404 NO_SUBSCRIPTION / 409 NOT_SCHEDULED
//   POST /apple-sync → { billing }   recompute the caller's Apple columns from RevenueCat (the app, after a purchase);
//                                    503 NOT_CONFIGURED without REVENUECAT_SECRET_KEY
// The client refreshes its profile row afterwards: entitlements are derived there, never from these views.

import { error, handleOptions, requireUser } from '../_shared/http.ts'
import { assertStripeEnv } from '../_shared/stripe.ts'
import { getAdmin } from '../_shared/supabase-admin.ts'
import { handleAppleSync, handleCancel, handleCheckout, handlePortal, handleResume, handleSync } from './handlers.ts'

assertStripeEnv()

function routeOf(req: Request): string {
  const pathname = new URL(req.url).pathname.replace(/\/+$/, '')
  const marker = '/billing'
  const at = pathname.lastIndexOf(marker)
  return at === -1 ? pathname : pathname.slice(at + marker.length) || '/'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()

  const user = await requireUser(req, getAdmin())
  if (!user) return error('UNAUTHORIZED', 'Sign in required', 401)

  const route = routeOf(req)
  try {
    switch (`${req.method} ${route}`) {
      case 'GET /sync':
        return await handleSync(user)
      case 'POST /checkout':
        return await handleCheckout(req, user)
      case 'POST /portal':
        return await handlePortal(req, user)
      case 'POST /cancel':
        return await handleCancel(user)
      case 'POST /resume':
        return await handleResume(user)
      case 'POST /apple-sync':
        return await handleAppleSync(user)
      default:
        return error('NOT_FOUND', `No route ${req.method} ${route}`, 404)
    }
  } catch (err) {
    console.error(`billing: ${req.method} ${route} failed for ${user.id}:`, err)
    return error('INTERNAL', 'Billing request failed', 500)
  }
})
