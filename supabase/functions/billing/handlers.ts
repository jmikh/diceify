// Route handlers of the `billing` function. Each one takes the resolved caller and answers with the shared
// envelope (`_shared/http.ts`). Stripe is the source of truth: every mutation ends with a full re-sync of the
// profile's snapshot and returns the resulting BillingView.

import Stripe from 'stripe'
import type { z } from 'zod'
import { revenueCatFetcher, syncAppleFromRevenueCat, type SubscriberFetcher } from '../_shared/apple-sync.ts'
import { hasPaidAccess, PRO_SUBSCRIPTION_STATUSES } from '../_shared/billing-snapshot.ts'
import { CheckoutBody, PortalBody } from '../_shared/billing-schemas.ts'
import {
  loadProfile,
  shouldSync,
  syncBillingFromStripe,
  SYNC_MIN_INTERVAL_MS,
  toBillingView,
  type BillingView,
  type ProfileBillingRow,
} from '../_shared/billing-sync.ts'
import { error, json, readJsonBody, type CallerUser } from '../_shared/http.ts'
import { getStripe } from '../_shared/stripe.ts'
import { getAdmin } from '../_shared/supabase-admin.ts'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not set`)
  return value
}

// Resolved at boot so a misconfigured deployment fails on start, not on the first purchase.
const APP_URL = requireEnv('APP_URL').replace(/\/+$/, '')
const PRICE_IDS: Record<CheckoutBody['plan'], string> = {
  creator: requireEnv('STRIPE_CREATOR_PRICE_ID'),
  studio_monthly: requireEnv('STRIPE_STUDIO_MONTHLY_PRICE_ID'),
  studio_yearly: requireEnv('STRIPE_STUDIO_YEARLY_PRICE_ID'),
}

// RevenueCat is optional for the web deployment: without the key the route answers 503 and nothing else changes.
const REVENUECAT_KEY = Deno.env.get('REVENUECAT_SECRET_KEY')
const fetchSubscriber: SubscriberFetcher | null = REVENUECAT_KEY ? revenueCatFetcher(REVENUECAT_KEY, Deno.env.get('REVENUECAT_API_URL') || undefined) : null

/** The validated body or a 400 response. */
async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<{ body: z.infer<T> } | { response: Response }> {
  const raw = await readJsonBody(req)
  const result = schema.safeParse(raw)
  if (!result.success) return { response: error('VALIDATION', 'Invalid request body', 400, result.error.issues) }
  return { body: result.data }
}

async function requireProfile(userId: string): Promise<{ profile: ProfileBillingRow } | { response: Response }> {
  const profile = await loadProfile(getAdmin(), { profileId: userId })
  return profile ? { profile } : { response: error('NOT_FOUND', 'No profile for this user', 404) }
}

export async function handleSync(user: CallerUser): Promise<Response> {
  const found = await requireProfile(user.id)
  if ('response' in found) return found.response
  const now = new Date()
  let billing: BillingView
  if (shouldSync(found.profile.synced_at, now, SYNC_MIN_INTERVAL_MS)) {
    billing = (await syncBillingFromStripe(getAdmin(), getStripe(), { profileId: user.id }, now)) ?? toBillingView(found.profile)
  } else {
    const ageS = Math.round((now.getTime() - Date.parse(found.profile.synced_at!)) / 1000)
    console.log(`billing/sync: ${user.id}: skipped (synced ${ageS}s ago)`)
    billing = toBillingView(found.profile)
  }
  return json({ billing })
}

/**
 * The profile's Stripe customer, created on first use. The id is persisted with a compare-and-set on `null`; when a
 * concurrent checkout won that race the fresh customer is deleted again, so a user never ends up with two.
 */
async function ensureCustomer(user: CallerUser, profile: ProfileBillingRow): Promise<string> {
  if (profile.stripe_customer_id) return profile.stripe_customer_id
  const stripe = getStripe()
  const admin = getAdmin()
  const created = await stripe.customers.create({ email: user.email ?? undefined, metadata: { userId: user.id } })
  const { data, error: dbError } = await admin
    .from('profiles')
    .update({ stripe_customer_id: created.id })
    .eq('id', user.id)
    .is('stripe_customer_id', null)
    .select('stripe_customer_id')
  if (dbError) throw new Error(`profiles update failed: ${dbError.message}`)
  if (data.length === 1) return created.id
  // Lost the race: keep the id that landed first.
  await stripe.customers.del(created.id)
  const current = await loadProfile(admin, { profileId: user.id })
  if (!current?.stripe_customer_id) throw new Error('stripe_customer_id vanished after a concurrent write')
  console.warn(`billing/checkout: ${user.id}: concurrent customer creation, dropped ${created.id}`)
  return current.stripe_customer_id
}

export async function handleCheckout(req: Request, user: CallerUser): Promise<Response> {
  const parsed = await parseBody(req, CheckoutBody)
  if ('response' in parsed) return parsed.response
  const found = await requireProfile(user.id)
  if ('response' in found) return found.response
  const { plan } = parsed.body

  if (hasPaidAccess(found.profile, new Date())) {
    return error('ALREADY_SUBSCRIBED', 'You already have an active plan', 409)
  }
  const customer = await ensureCustomer(user, found.profile)
  const metadata = { userId: user.id, plan }
  const mode = plan === 'creator' ? 'payment' : 'subscription'
  const session = await getStripe().checkout.sessions.create({
    customer,
    mode,
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    client_reference_id: user.id,
    metadata,
    subscription_data: mode === 'subscription' ? { metadata } : undefined,
    success_url: `${APP_URL}/account?checkout=success`,
    cancel_url: `${APP_URL}/#pricing`,
  })
  if (!session.url) throw new Error(`checkout session ${session.id} has no url`)
  console.log(`billing/checkout: ${user.id}: ${plan} → ${session.id}`)
  return json({ url: session.url })
}

export async function handlePortal(req: Request, user: CallerUser): Promise<Response> {
  const parsed = await parseBody(req, PortalBody)
  if ('response' in parsed) return parsed.response
  const found = await requireProfile(user.id)
  if ('response' in found) return found.response
  const customer = found.profile.stripe_customer_id
  if (!customer) return error('NO_SUBSCRIPTION', 'No billing account yet', 404)
  const session = await getStripe().billingPortal.sessions.create({
    customer,
    return_url: `${APP_URL}${parsed.body.returnPath ?? '/account'}`,
  })
  return json({ url: session.url })
}

/** The subscription the row points at, if it still grants access. */
function activeSubscriptionId(profile: ProfileBillingRow): string | null {
  const status = profile.subscription_status
  if (!profile.stripe_subscription_id || status === null || !PRO_SUBSCRIPTION_STATUSES.has(status)) return null
  return profile.stripe_subscription_id
}

/** Cancel or resume: flip `cancel_at_period_end` on the stored subscription, then re-sync and return the view. */
async function updateCancelAtPeriodEnd(user: CallerUser, cancelAtPeriodEnd: boolean): Promise<Response> {
  const found = await requireProfile(user.id)
  if ('response' in found) return found.response
  const subscriptionId = activeSubscriptionId(found.profile)
  if (!subscriptionId) return error('NO_SUBSCRIPTION', 'No active subscription', 404)
  const scheduled = found.profile.cancel_at !== null
  if (cancelAtPeriodEnd && scheduled) return error('ALREADY_SCHEDULED', 'Cancellation is already scheduled', 409)
  if (!cancelAtPeriodEnd && !scheduled) return error('NOT_SCHEDULED', 'No cancellation to resume', 409)

  const stripe = getStripe()
  const admin = getAdmin()
  try {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancelAtPeriodEnd })
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeInvalidRequestError)) throw err
    // The stored snapshot no longer matches Stripe (subscription ended elsewhere): refresh it and let the client reload.
    console.warn(`billing/${cancelAtPeriodEnd ? 'cancel' : 'resume'}: ${user.id}: ${subscriptionId} rejected: ${err.message}`)
    await syncBillingFromStripe(admin, stripe, { profileId: user.id })
    return error('STALE', 'Your subscription changed elsewhere; the page has been refreshed', 409)
  }
  const billing = await syncBillingFromStripe(admin, stripe, { profileId: user.id })
  console.log(`billing/${cancelAtPeriodEnd ? 'cancel' : 'resume'}: ${user.id}: ${subscriptionId} → cancel_at=${billing?.cancelAt ?? '-'}`)
  return json({ billing })
}

/** The app after a StoreKit purchase/restore: refetch the subscriber from RevenueCat and store the Apple columns. */
export async function handleAppleSync(user: CallerUser): Promise<Response> {
  if (!fetchSubscriber) return error('NOT_CONFIGURED', 'In-app purchases are not configured', 503)
  const result = await syncAppleFromRevenueCat(getAdmin(), fetchSubscriber, user.id)
  if (!result) return error('NOT_FOUND', 'No profile for this user', 404)
  return json({ billing: toBillingView(result.profile) })
}

export const handleCancel = (user: CallerUser): Promise<Response> => updateCancelAtPeriodEnd(user, true)
export const handleResume = (user: CallerUser): Promise<Response> => updateCancelAtPeriodEnd(user, false)
