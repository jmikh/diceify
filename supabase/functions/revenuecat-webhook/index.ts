// RevenueCat webhook (config.toml: verify_jwt = false — RevenueCat carries no Supabase JWT; it sends the
// `Authorization` header value configured in its dashboard, which must equal REVENUECAT_WEBHOOK_SECRET).
//
// Like `stripe-webhook`: no per-event state machine. Any event about a user refetches the whole subscriber from the
// RevenueCat API and recomputes the `apple_*` columns (`_shared/apple-sync.ts`). Idempotent and order-independent.
// Responses: 200 for anything handled or deliberately ignored (RevenueCat stops retrying), 401 for a bad secret,
// 500 when RevenueCat or the database failed (RevenueCat retries).

import { applePurchaseEvent, capture } from '../_shared/analytics.ts'
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The payload's `event` (RevenueCat webhooks v1). */
export interface RevenueCatEvent {
  id: string
  type: string
  app_user_id: string
  original_app_user_id?: string
  aliases?: string[]
  product_id?: string
  environment?: string
  store?: string
  price?: number | null
  currency?: string | null
  event_timestamp_ms?: number
}

/** The Supabase user id among the event's ids (the app sets `appUserID` = uid; anonymous ids are `$RCAnonymousID:…`). */
export function userIdOf(event: RevenueCatEvent): string | null {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]
  return candidates.find((id): id is string => typeof id === 'string' && UUID.test(id)) ?? null
}

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
  const userId = userIdOf(event)
  if (!userId) {
    console.warn(`revenuecat-webhook: ${event.type} ${event.id}: no Supabase user id in ${event.app_user_id} — ignored`)
    return json({ received: true, ignored: true })
  }

  try {
    const result = await syncAppleFromRevenueCat(getAdmin(), fetchSubscriber, userId)
    if (!result) {
      console.warn(`revenuecat-webhook: ${event.type} ${event.id}: unknown user ${userId} — no profile, ignored`)
      return json({ received: true, unknownUser: true })
    }
    const plan = effectivePlan(result.profile, new Date())
    console.log(`revenuecat-webhook: ${event.type} ${event.id}: ${userId} → apple=${result.snapshot.apple_plan ?? '-'} plan=${plan}`)
    const purchase = await applePurchaseEvent(event, userId, plan)
    if (purchase) await capture(purchase)
    return json({ received: true })
  } catch (err) {
    console.error(`revenuecat-webhook: ${event.type} ${event.id}: sync failed:`, err)
    return error('INTERNAL', 'Apple billing sync failed', 500)
  }
})
