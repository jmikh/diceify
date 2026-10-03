// Recompute and store a profile's Apple billing columns from RevenueCat. The fetcher is injected (Deno: `fetch`
// against api.revenuecat.com; tests: a stub), the rest is Node-compatible. Written by the `revenuecat-webhook`
// function (any event) and `POST /billing/apple-sync` (the app, right after a purchase).

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeAppleSnapshot, EMPTY_APPLE_SNAPSHOT, type AppleSnapshot, type RevenueCatSubscriber } from './apple-snapshot.ts'
import { loadProfile, PROFILE_BILLING_COLUMNS, type ProfileBillingRow } from './billing-sync.ts'

/** The subscriber's purchase history; RevenueCat creates an empty subscriber for an unknown id (201), never 404. */
export type SubscriberFetcher = (appUserId: string) => Promise<RevenueCatSubscriber>

const DEFAULT_API_URL = 'https://api.revenuecat.com'

/** `GET /v1/subscribers/{id}` with the project's secret API key. */
export function revenueCatFetcher(secretKey: string, apiUrl = DEFAULT_API_URL): SubscriberFetcher {
  const base = apiUrl.replace(/\/+$/, '')
  return async (appUserId) => {
    const res = await fetch(`${base}/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`RevenueCat subscriber ${appUserId}: HTTP ${res.status}`)
    const body = (await res.json()) as { subscriber?: RevenueCatSubscriber }
    return body.subscriber ?? {}
  }
}

export interface AppleSyncResult {
  snapshot: AppleSnapshot
  /** The profile's billing columns after the write (Stripe + Apple), for `effectivePlan`. */
  profile: ProfileBillingRow
}

/**
 * Recompute the Apple snapshot for the profile `userId` and store it. `null` when there is no such profile (an
 * app user id that is not a Supabase user, e.g. a RevenueCat anonymous id that slipped through).
 */
export async function syncAppleFromRevenueCat(
  admin: SupabaseClient,
  fetchSubscriber: SubscriberFetcher,
  userId: string,
  now: Date = new Date(),
): Promise<AppleSyncResult | null> {
  const profile = await loadProfile(admin, { profileId: userId })
  if (!profile) return null
  let snapshot: AppleSnapshot
  try {
    snapshot = computeAppleSnapshot(await fetchSubscriber(userId), now)
  } catch (error) {
    throw new Error(`apple-sync: ${userId}: ${error instanceof Error ? error.message : String(error)}`)
  }
  const { data, error } = await admin
    .from('profiles')
    .update({ ...snapshot, apple_synced_at: now.toISOString() })
    .eq('id', userId)
    .select(PROFILE_BILLING_COLUMNS)
    .single()
  if (error) throw new Error(`profiles update failed: ${error.message}`)
  console.log(`apple-sync: ${userId}: plan=${snapshot.apple_plan ?? '-'} until=${snapshot.apple_expires_at ?? '-'} renew=${snapshot.apple_will_renew}`)
  return { snapshot, profile: data as ProfileBillingRow }
}

export { EMPTY_APPLE_SNAPSHOT }
