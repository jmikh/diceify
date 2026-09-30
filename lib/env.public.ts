// Public (browser-safe) environment. Every value is read as a literal `process.env.NEXT_PUBLIC_*`
// property access so Next.js inlines it into the static bundle at build time.
//
// Validation is lazy: importing this module never throws (the build runs without the values), the
// first access of `publicEnv.<key>` does, with a message naming the missing variables.

import { z } from 'zod'

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SENTRY_DSN: optionalString,
})

export interface PublicEnv {
  supabaseUrl: string
  supabaseAnonKey: string
  appUrl: string
  /** Undefined (Sentry inert) when unset. */
  sentryDsn: string | undefined
}

let cached: PublicEnv | undefined

function load(): PublicEnv {
  if (cached) return cached
  const result = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  })
  if (!result.success) {
    const names = Array.from(new Set(result.error.issues.map((i) => String(i.path[0])))).join(', ')
    throw new Error(`Missing or invalid public env: ${names} (see .env.example)`)
  }
  const v = result.data
  cached = {
    supabaseUrl: v.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: v.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    appUrl: v.NEXT_PUBLIC_APP_URL,
    sentryDsn: v.NEXT_PUBLIC_SENTRY_DSN,
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
  get appUrl() {
    return load().appUrl
  },
  get sentryDsn() {
    return load().sentryDsn
  },
}
