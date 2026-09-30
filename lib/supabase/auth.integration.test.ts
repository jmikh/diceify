// Browser-less proof of the C2 client stack against the LOCAL Supabase: sign in → own profile through RLS →
// billing mapping → entitlements. Skipped unless SUPABASE_TEST=1 (needs the stack up and the service-role key).
//
//   npm run db:start
//   SUPABASE_TEST=1 SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | grep '^SERVICE_ROLE_KEY' | cut -d= -f2 | tr -d '"') \
//     npx vitest run lib/supabase/auth.integration.test.ts

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { deriveEntitlements } from '@/core/billing'
import type { Database } from './database.types'

const ENABLED = process.env.SUPABASE_TEST === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331'
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// lib/env.public.ts reads these lazily; set them before the client module is first used.
process.env.NEXT_PUBLIC_SUPABASE_URL = URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY

const EMAIL = `c2-${Date.now()}@test.dev`
const PASSWORD = 'pass1234'

describe.skipIf(!ENABLED)('client auth + profile + entitlements (local stack)', () => {
  // Built in beforeAll: createClient throws on an empty key, and the key is only set when the suite runs.
  let admin: SupabaseClient<Database>
  let userId = ''

  beforeAll(async () => {
    expect(SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required').not.toBe('')
    admin = createClient<Database>(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'C2 Test' },
    })
    if (error) throw error
    userId = data.user.id
  })

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  it('anonymous fetchProfile() sees no row', async () => {
    const { fetchProfile } = await import('./profile')
    expect(await fetchProfile()).toBeNull()
  })

  it('signs in, reads the own profile, and follows a plan change into the entitlements', async () => {
    const { getSupabase } = await import('./client')
    const { fetchProfile, toBillingState } = await import('./profile')
    const { getAccessToken, signOut } = await import('./auth')

    const { error } = await getSupabase().auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
    expect(error).toBeNull()
    expect(await getAccessToken()).toBeTypeOf('string')

    const explorer = await fetchProfile()
    expect(explorer).not.toBeNull()
    expect(explorer!.id).toBe(userId)
    expect(explorer!.email).toBe(EMAIL)
    expect(explorer!.name).toBe('C2 Test')
    const now = new Date()
    expect(deriveEntitlements(toBillingState(explorer!), now)).toMatchObject({
      plan: 'explorer',
      projectLimit: 1,
      builderRowLimit: 5,
      hasSvgExport: false,
    })

    // Billing columns are written only with the service role (the client cannot: no UPDATE policy)
    const periodEnd = new Date(now.getTime() + 30 * 86_400_000).toISOString()
    const { error: updateError } = await admin
      .from('profiles')
      .update({ plan: 'studio', subscription_status: 'active', current_period_end: periodEnd, stripe_customer_id: 'cus_test' })
      .eq('id', userId)
    expect(updateError).toBeNull()

    const studio = await fetchProfile()
    expect(deriveEntitlements(toBillingState(studio!), now)).toMatchObject({
      plan: 'studio',
      isPro: true,
      projectLimit: 5,
      builderRowLimit: null,
      hasSvgExport: true,
      renews: true,
      canManageBilling: true,
    })

    // The client may not touch billing columns: the update is filtered out by RLS (0 rows)
    const { data: forbidden } = await getSupabase().from('profiles').update({ plan: 'lifetime' }).eq('id', userId).select()
    expect(forbidden).toEqual([])

    await signOut()
    expect(await getAccessToken()).toBeNull()
    expect(await fetchProfile()).toBeNull()
  })
})
