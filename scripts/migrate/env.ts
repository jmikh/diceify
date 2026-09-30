// Environment resolution for the migration script: which file/variable each value may come from, and the
// target guards. `pickEnv` is pure (tested); `loadEnv` does the file reads and the `supabase status` call.
//
// Sources (in priority order):
//   LEGACY_DATABASE_URL       process env → .env.local (falls back to DATABASE_URL with a warning)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / TARGET_DATABASE_URL
//                             process env → `supabase status -o env` (local target only)
//   STRIPE_SECRET_KEY         process env → supabase/functions/.env   (never .env.local: that one is the legacy key)

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'

export type Target = 'local' | 'hosted'
export type StripeMode = 'test' | 'live' | 'unknown'

export interface MigrationEnv {
  legacyDatabaseUrl: string
  supabaseUrl: string
  serviceRoleKey: string
  targetDatabaseUrl: string
  /** null = no key → Stripe sync disabled. */
  stripeSecretKey: string | null
}

export interface EnvSources {
  processEnv: Record<string, string | undefined>
  /** Parsed `.env.local`. */
  localEnv: Record<string, string | undefined>
  /** Parsed `supabase/functions/.env`. */
  functionsEnv: Record<string, string | undefined>
  /** Parsed `supabase status -o env`; called lazily and only for a local target. */
  statusEnv: () => Record<string, string | undefined>
}

export interface EnvResult {
  env: MigrationEnv | null
  warnings: string[]
  errors: string[]
}

const LOCAL_HOSTS = ['http://127.0.0.1', 'http://localhost', 'http://kong']

export function isLocalSupabaseUrl(url: string): boolean {
  return LOCAL_HOSTS.some((prefix) => url.startsWith(prefix))
}

export function stripeMode(key: string | null): StripeMode {
  if (key?.startsWith('sk_test_')) return 'test'
  if (key?.startsWith('sk_live_')) return 'live'
  return 'unknown'
}

const nonEmpty = (v: string | undefined): string | null => (v && v.trim() !== '' ? v.trim() : null)

/** Resolve every value from the sources and apply the target guards. Pure. */
export function pickEnv(sources: EnvSources, target: Target): EnvResult {
  const warnings: string[] = []
  const errors: string[] = []
  const { processEnv, localEnv, functionsEnv } = sources
  let status: Record<string, string | undefined> | null = null
  const fromStatus = (key: string): string | null => {
    if (target !== 'local') return null
    status ??= sources.statusEnv()
    return nonEmpty(status[key])
  }

  let legacy = nonEmpty(processEnv.LEGACY_DATABASE_URL) ?? nonEmpty(localEnv.LEGACY_DATABASE_URL)
  if (!legacy) {
    legacy = nonEmpty(processEnv.DATABASE_URL) ?? nonEmpty(localEnv.DATABASE_URL)
    if (legacy) warnings.push('LEGACY_DATABASE_URL is not set; falling back to DATABASE_URL')
  }
  if (!legacy) errors.push('LEGACY_DATABASE_URL (or DATABASE_URL in .env.local) is required')

  const supabaseUrl = nonEmpty(processEnv.SUPABASE_URL) ?? fromStatus('API_URL')
  const serviceRoleKey = nonEmpty(processEnv.SUPABASE_SERVICE_ROLE_KEY) ?? fromStatus('SERVICE_ROLE_KEY')
  const targetDatabaseUrl = nonEmpty(processEnv.TARGET_DATABASE_URL) ?? fromStatus('DB_URL')
  const stripeSecretKey = nonEmpty(processEnv.STRIPE_SECRET_KEY) ?? nonEmpty(functionsEnv.STRIPE_SECRET_KEY)

  if (!supabaseUrl) errors.push('SUPABASE_URL is required (local: printed by `supabase status`)')
  if (!serviceRoleKey) errors.push('SUPABASE_SERVICE_ROLE_KEY is required')
  if (!targetDatabaseUrl) errors.push('TARGET_DATABASE_URL is required (the Supabase Postgres URL as `postgres`)')
  if (!stripeSecretKey) warnings.push('STRIPE_SECRET_KEY not found (process env or supabase/functions/.env): Stripe sync disabled')

  if (supabaseUrl) {
    const local = isLocalSupabaseUrl(supabaseUrl)
    if (target === 'local' && !local) errors.push(`refusing to write to ${supabaseUrl}: not a local stack (pass --target=hosted on purpose)`)
    if (target === 'hosted' && local) errors.push('--target=hosted but SUPABASE_URL is a local stack')
  }
  if (target === 'hosted' && stripeMode(stripeSecretKey) === 'test') errors.push('--target=hosted with an sk_test_ Stripe key')

  if (errors.length > 0 || !legacy || !supabaseUrl || !serviceRoleKey || !targetDatabaseUrl) {
    return { env: null, warnings, errors }
  }
  return { env: { legacyDatabaseUrl: legacy, supabaseUrl, serviceRoleKey, targetDatabaseUrl, stripeSecretKey }, warnings, errors }
}

const readEnvFile = (file: string): Record<string, string | undefined> => (existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {})

/** Read the env files under `root` and resolve; `supabase status` is only invoked for a local target. */
export function loadEnv(root: string, processEnv: NodeJS.ProcessEnv, target: Target): EnvResult {
  return pickEnv(
    {
      processEnv,
      localEnv: readEnvFile(path.join(root, '.env.local')),
      functionsEnv: readEnvFile(path.join(root, 'supabase/functions/.env')),
      statusEnv: () => parseEnv(execFileSync('supabase', ['status', '-o', 'env'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })),
    },
    target,
  )
}
