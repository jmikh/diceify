// Calls into the `billing` edge function (supabase/functions/billing). D1: sync only; D2 adds checkout, portal,
// cancel, resume. Entitlements are NOT taken from here — the caller refreshes the profile row (`useUser().refresh()`)
// and `deriveEntitlements` stays the single gating source.

import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Plan } from '@/core/billing'
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
  ) {
    super(message)
    this.name = 'BillingError'
  }
}

async function toBillingError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } }
      return new BillingError(body.error?.code ?? 'INTERNAL', body.error?.message ?? error.message, response.status)
    } catch {
      return new BillingError('INTERNAL', error.message, response.status)
    }
  }
  return error instanceof Error ? error : new Error(String(error))
}

/** Recompute the signed-in user's billing snapshot from Stripe (rate-limited server-side to one call per 30 s). */
export async function syncBilling(): Promise<BillingView> {
  const { data, error } = await getSupabase().functions.invoke<{ billing: BillingView }>('billing/sync', { method: 'GET' })
  if (error) throw await toBillingError(error)
  if (!data?.billing) throw new BillingError('INTERNAL', 'Empty billing response', 200)
  return data.billing
}
