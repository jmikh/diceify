// `syncAppleFromRevenueCat` against the LOCAL stack with a stubbed RevenueCat: the columns land, `effective_plan`
// (SQL) agrees with `effectivePlan` (TS) and `deriveEntitlements` (core), a lapsed grant drops the plan, an unknown
// user is a no-op. Skipped unless SUPABASE_TEST=1 (see lib/supabase/projects.integration.test.ts for the command).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deriveEntitlements } from '@/core/billing/entitlements'
import { toBillingState, type ProfileRow } from '@/lib/supabase/profile'
import { syncAppleFromRevenueCat } from './apple-sync.ts'
import { effectivePlan } from './billing-snapshot.ts'

const ENABLED = process.env.SUPABASE_TEST === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const NOW = new Date('2026-09-30T12:00:00.000Z')
const DAY = 86_400_000
const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString()

describe.skipIf(!ENABLED)('syncAppleFromRevenueCat (local stack)', () => {
  let admin: SupabaseClient
  let userId = ''

  const profile = async () => {
    const { data, error } = await admin.from('profiles').select('*, effective_plan').eq('id', userId).single()
    if (error) throw error
    return data as ProfileRow & { effective_plan: string }
  }

  beforeAll(async () => {
    expect(SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required').not.toBe('')
    admin = createClient(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await admin.auth.admin.createUser({ email: `apple-${Date.now()}@test.dev`, password: 'pass1234', email_confirm: true })
    if (error) throw error
    userId = data.user.id
  })

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  it('stores an active studio and every layer agrees on the plan', async () => {
    const result = await syncAppleFromRevenueCat(
      admin,
      async () => ({ subscriptions: { studio_yearly: { expires_date: iso(300 * DAY), purchase_date: iso(-65 * DAY), unsubscribe_detected_at: null, billing_issues_detected_at: null, is_sandbox: true } } }),
      userId,
      NOW,
    )
    expect(result?.snapshot).toEqual({ apple_plan: 'studio', apple_product_id: 'studio_yearly', apple_expires_at: iso(300 * DAY), apple_will_renew: true, apple_environment: 'sandbox' })
    expect(effectivePlan(result!.profile, NOW)).toBe('studio')
    const row = await profile()
    expect(row).toMatchObject({ plan: 'explorer', apple_plan: 'studio', apple_will_renew: true, apple_environment: 'sandbox', effective_plan: 'studio' })
    expect(Date.parse(row.apple_synced_at!)).toBe(NOW.getTime()) // PostgREST spells the offset as +00:00
    expect(deriveEntitlements(toBillingState(row), NOW)).toMatchObject({ plan: 'studio', source: 'apple', renews: true })
  })

  it('a lapsed history drops back to explorer (columns keep the lapsed grant)', async () => {
    await syncAppleFromRevenueCat(
      admin,
      async () => ({ subscriptions: { studio_yearly: { expires_date: iso(-1 * DAY), purchase_date: iso(-366 * DAY), unsubscribe_detected_at: iso(-30 * DAY), billing_issues_detected_at: null } } }),
      userId,
      NOW,
    )
    const row = await profile()
    expect(row).toMatchObject({ apple_plan: 'studio', apple_will_renew: false, effective_plan: 'explorer' })
    expect(Date.parse(row.apple_expires_at!)).toBe(NOW.getTime() - DAY)
    expect(deriveEntitlements(toBillingState(row), NOW).plan).toBe('explorer')
  })

  it('an empty subscriber clears the columns; an unknown user is null', async () => {
    const cleared = await syncAppleFromRevenueCat(admin, async () => ({}), userId, NOW)
    expect(cleared?.snapshot.apple_plan).toBeNull()
    expect((await profile()).apple_plan).toBeNull()
    expect(await syncAppleFromRevenueCat(admin, async () => ({}), crypto.randomUUID(), NOW)).toBeNull()
  })
})
