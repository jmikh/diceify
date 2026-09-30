// The browser Supabase client (anon key + the signed-in user's JWT). Created lazily so importing this module
// during static prerender never touches `publicEnv`; only client components call `getSupabase()`, from effects
// and handlers. Sessions persist in localStorage; OAuth uses the PKCE flow and the code in the redirect URL is
// exchanged automatically (`detectSessionInUrl`).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env.public'
import type { Database } from './database.types'

export type DiceifySupabaseClient = SupabaseClient<Database>

let client: DiceifySupabaseClient | undefined

export function getSupabase(): DiceifySupabaseClient {
  if (!client) {
    client = createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  }
  return client
}
