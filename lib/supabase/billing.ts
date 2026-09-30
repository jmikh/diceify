// Calls into the `billing` edge function (supabase/functions/billing). Entitlements are NOT taken from here — the
// caller refreshes the profile row (`useUser().refresh()`) and `deriveEntitlements` stays the single gating source.
// Navigation (to Checkout / the portal) is the caller's job so these wrappers stay testable.

import { FunctionsHttpError } from '@supabase/supabase-js'
import type { BillingState, CheckoutPlan, Plan } from '@/core/billing'
import { getSupabase } from './client'

/** Mirror of `BillingView` in supabase/functions/_shared/billing-sync.ts (Deno code cannot be imported here). */
export interface BillingView {
  plan: Plan
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  cancelAt: string | null
  planExpiresAt: string | null
  hasStripeCustomer: boolean
  syncedAt: string | null
}

/** The functions' error envelope `{ error: { code, message, details? } }` surfaced as an Error. */
export class BillingError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'BillingError'
  }
}

async function toBillingError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string; details?: unknown } }
      return new BillingError(body.error?.code ?? 'INTERNAL', body.error?.message ?? error.message, response.status, body.error?.details)
    } catch {
      return new BillingError('INTERNAL', error.message, response.status)
    }
  }
  return error instanceof Error ? error : new Error(String(error))
}

async function invoke<T extends object>(route: string, options: { method: 'GET' | 'POST'; body?: object }): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke<T>(`billing/${route}`, options)
  if (error) throw await toBillingError(error)
  if (!data) throw new BillingError('INTERNAL', `Empty response from billing/${route}`, 200)
  return data
}

const view = async (route: string): Promise<BillingView> => (await invoke<{ billing: BillingView }>(route, { method: 'POST' })).billing

/** Recompute the signed-in user's billing snapshot from Stripe (rate-limited server-side to one call per 30 s). */
export async function syncBilling(): Promise<BillingView> {
  return (await invoke<{ billing: BillingView }>('sync', { method: 'GET' })).billing
}

/** A Stripe Checkout URL for the plan; 409 `ALREADY_SUBSCRIBED` while any paid plan is active. */
export function startCheckout(plan: CheckoutPlan): Promise<{ url: string }> {
  return invoke('checkout', { method: 'POST', body: { plan } })
}

/** A Stripe Customer Portal URL that returns to `returnPath`; 404 `NO_SUBSCRIPTION` without a Stripe customer. */
export function openBillingPortal(returnPath = '/account'): Promise<{ url: string }> {
  return invoke('portal', { method: 'POST', body: { returnPath } })
}

/** Schedule the Studio subscription to end at the period end (409 `ALREADY_SCHEDULED` when it already is). */
export const cancelSubscription = (): Promise<BillingView> => view('cancel')

/** Undo a scheduled cancellation (409 `NOT_SCHEDULED` when there is none). */
export const resumeSubscription = (): Promise<BillingView> => view('resume')

/** A sync result as core's `BillingState`, for deriving entitlements before the profile row is refetched. */
export function viewToBillingState(v: BillingView): BillingState {
  return {
    plan: v.plan,
    planExpiresAt: v.planExpiresAt,
    subscriptionStatus: v.subscriptionStatus,
    currentPeriodEnd: v.currentPeriodEnd,
    cancelAt: v.cancelAt,
    hasStripeCustomer: v.hasStripeCustomer,
  }
}
