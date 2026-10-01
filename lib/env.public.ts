// Public (browser-safe) environment. Every value is read as a literal `process.env.NEXT_PUBLIC_*`
// property access so Next.js inlines it into the static bundle at build time.
//
// Validation is lazy: importing this module never throws (the build runs without the values), the
// first access of `publicEnv.<key>` does, with a message naming the missing variables.

import { z } from 'zod'

// NEXT_PUBLIC_SENTRY_DSN is not here: instrumentation-client.ts reads it literally so a build without the
// Supabase values still boots the (inert) SDK.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

export interface PublicEnv {
  supabaseUrl: string
  supabaseAnonKey: string
}

let cached: PublicEnv | undefined

function load(): PublicEnv {
  if (cached) return cached
  const result = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => String(i.path[0])))].join(', ')
    throw new Error(`Missing or invalid public env: ${names} (see README.md, "Env files")`)
  }
  const v = result.data
  cached = {
    supabaseUrl: v.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: v.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
  return cached
}

export const publicEnv: PublicEnv = {
  get supabaseUrl() {
    return load().supabaseUrl
  },
  get supabaseAnonKey() {
    return load().supabaseAnonKey
  },
}
