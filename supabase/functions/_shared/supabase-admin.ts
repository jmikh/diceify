// Service-role Supabase client (bypasses RLS). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the
// edge runtime, locally and hosted. Used for the billing columns nobody else may write.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

export function getAdmin(): SupabaseClient {
  if (!client) {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client
}
