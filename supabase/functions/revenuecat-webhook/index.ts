// RevenueCat webhook (config.toml: verify_jwt = false — RevenueCat carries no Supabase JWT; it sends the
// `Authorization` header value configured in its dashboard, which must equal REVENUECAT_WEBHOOK_SECRET).
//
// Like `stripe-webhook`: no per-event state machine. Any event about a user refetches the whole subscriber from the
// RevenueCat API and recomputes the `apple_*` columns (`_shared/apple-sync.ts`). Idempotent and order-independent.
// A TRANSFER (purchases restored on another account) recomputes both accounts.
// Responses: 200 for anything handled or deliberately ignored (RevenueCat stops retrying), 401 for a bad secret,
// 500 when RevenueCat or the database failed (RevenueCat retries).

import { applePurchaseEvent, capture } from '../_shared/analytics.ts'
import { userIdsOf, type RevenueCatEvent } from '../_shared/apple-snapshot.ts'
import { revenueCatFetcher, syncAppleFromRevenueCat } from '../_shared/apple-sync.ts'
import { effectivePlan } from '../_shared/billing-snapshot.ts'
import { error, json } from '../_shared/http.ts'
import { getAdmin } from '../_shared/supabase-admin.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not set`)
  return value
}

const WEBHOOK_SECRET = requireEnv('REVENUECAT_WEBHOOK_SECRET')
const fetchSubscriber = revenueCatFetcher(requireEnv('REVENUECAT_SECRET_KEY'), Deno.env.get('REVENUECAT_API_URL') || undefined)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return error('VALIDATION', 'POST only', 405)
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== WEBHOOK_SECRET && auth !== `Bearer ${WEBHOOK_SECRET}`) return error('INVALID_SIGNATURE', 'Bad webhook secret', 401)

  let event: RevenueCatEvent
  try {
    const body = (await req.json()) as { event?: RevenueCatEvent }
    if (!body.event || typeof body.event.type !== 'string') throw new Error('no event')
    event = body.event
  } catch {
    return error('VALIDATION', 'Invalid payload', 400)
  }

  if (event.type === 'TEST') return json({ received: true, test: true })
  const userIds = userIdsOf(event)
  if (userIds.length === 0) {
    console.warn(`revenuecat-webhook: ${event.type} ${event.id}: no Supabase user id in ${event.app_user_id ?? event.transferred_to?.join(',')} — ignored`)
    return json({ received: true, ignored: true })
  }

  try {
    let synced = 0
    for (const userId of userIds) {
      const result = await syncAppleFromRevenueCat(getAdmin(), fetchSubscriber, userId)
      if (!result) {
        console.warn(`revenuecat-webhook: ${event.type} ${event.id}: unknown user ${userId} — no profile, ignored`)
        continue
      }
      synced++
      const plan = effectivePlan(result.profile, new Date())
      console.log(`revenuecat-webhook: ${event.type} ${event.id}: ${userId} → apple=${result.snapshot.apple_plan ?? '-'} plan=${plan}`)
      const purchase = await applePurchaseEvent(event, userId, plan)
      if (purchase) await capture(purchase)
    }
    return json(synced > 0 ? { received: true } : { received: true, unknownUser: true })
  } catch (err) {
    console.error(`revenuecat-webhook: ${event.type} ${event.id}: sync failed:`, err)
    return error('INTERNAL', 'Apple billing sync failed', 500)
  }
})
