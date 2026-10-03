// The signed-in user's profile row and its mapping onto the core billing model.

import {
  type ApplePlan, PLANS, type BillingState, type Plan } from '@/core/billing'
import { getSupabase } from './client'
import type { Tables } from './database.types'

export type ProfileRow = Tables<'profiles'>

/** The own profile row (RLS: a signed-in user sees exactly one row, anonymous sees none → `null`). */
export async function fetchProfile(): Promise<ProfileRow | null> {
  const { data, error } = await getSupabase().from('profiles').select('*').maybeSingle()
  if (error) throw error
  return data
}

const isPlan = (value: string): value is Plan => (PLANS as readonly string[]).includes(value)

/** snake_case profile columns → `BillingState` for `deriveEntitlements`. */
export function toBillingState(row: ProfileRow): BillingState {
  return {
    plan: isPlan(row.plan) ? row.plan : 'explorer',
    planExpiresAt: row.plan_expires_at,
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: row.current_period_end,
    cancelAt: row.cancel_at,
    hasStripeCustomer: row.stripe_customer_id !== null && row.stripe_customer_id !== '',
    applePlan: isApplePlan(row.apple_plan) ? row.apple_plan : null,
    appleExpiresAt: row.apple_expires_at,
    appleWillRenew: row.apple_will_renew,
  }
}

const isApplePlan = (value: string | null): value is ApplePlan => value === 'creator' || value === 'studio'
