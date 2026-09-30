import { describe, expect, it, vi } from 'vitest'
import { isLocalSupabaseUrl, pickEnv, stripeMode, type EnvSources } from './env'

const LOCAL_STATUS = {
  API_URL: 'http://127.0.0.1:54331',
  SERVICE_ROLE_KEY: 'service-role',
  DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54332/postgres',
}

const sources = (over: Partial<EnvSources> = {}): EnvSources => ({
  processEnv: {},
  localEnv: { LEGACY_DATABASE_URL: 'postgresql://legacy/db?sslmode=require', STRIPE_SECRET_KEY: 'sk_live_LEGACY' },
  functionsEnv: { STRIPE_SECRET_KEY: 'sk_test_abc' },
  statusEnv: () => LOCAL_STATUS,
  ...over,
})

describe('pickEnv (local)', () => {
  it('reads the legacy URL from .env.local, the stack from supabase status and Stripe from functions/.env', () => {
    const r = pickEnv(sources(), 'local')
    expect(r.errors).toEqual([])
    expect(r.env).toEqual({
      legacyDatabaseUrl: 'postgresql://legacy/db?sslmode=require',
      supabaseUrl: LOCAL_STATUS.API_URL,
      serviceRoleKey: 'service-role',
      targetDatabaseUrl: LOCAL_STATUS.DB_URL,
      stripeSecretKey: 'sk_test_abc',
    })
  })

  it('never takes STRIPE_SECRET_KEY from .env.local', () => {
    const r = pickEnv(sources({ functionsEnv: {} }), 'local')
    expect(r.env?.stripeSecretKey).toBeNull()
    expect(r.warnings.join()).toMatch(/Stripe sync disabled/)
  })

  it('process env wins over files and status', () => {
    const r = pickEnv(
      sources({ processEnv: { LEGACY_DATABASE_URL: 'postgresql://x', SUPABASE_URL: 'http://localhost:9999', SUPABASE_SERVICE_ROLE_KEY: 'k', TARGET_DATABASE_URL: 'postgresql://t', STRIPE_SECRET_KEY: 'sk_test_env' } }),
      'local',
    )
    expect(r.env).toEqual({ legacyDatabaseUrl: 'postgresql://x', supabaseUrl: 'http://localhost:9999', serviceRoleKey: 'k', targetDatabaseUrl: 'postgresql://t', stripeSecretKey: 'sk_test_env' })
  })

  it('falls back to DATABASE_URL with a warning', () => {
    const r = pickEnv(sources({ localEnv: { DATABASE_URL: 'postgresql://legacy' } }), 'local')
    expect(r.env?.legacyDatabaseUrl).toBe('postgresql://legacy')
    expect(r.warnings).toContain('LEGACY_DATABASE_URL is not set; falling back to DATABASE_URL')
  })

  it('errors without any legacy URL', () => {
    const r = pickEnv(sources({ localEnv: {} }), 'local')
    expect(r.env).toBeNull()
    expect(r.errors.join()).toMatch(/LEGACY_DATABASE_URL/)
  })

  it('refuses a non-local SUPABASE_URL unless --target=hosted', () => {
    const r = pickEnv(sources({ processEnv: { SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', TARGET_DATABASE_URL: 'postgresql://t' } }), 'local')
    expect(r.env).toBeNull()
    expect(r.errors.join()).toMatch(/not a local stack/)
  })
})

describe('pickEnv (hosted)', () => {
  const hosted = { SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', TARGET_DATABASE_URL: 'postgresql://t' }

  it('never consults supabase status and refuses an sk_test_ key', () => {
    const statusEnv = vi.fn(() => LOCAL_STATUS)
    const r = pickEnv(sources({ processEnv: hosted, statusEnv }), 'hosted')
    expect(statusEnv).not.toHaveBeenCalled()
    expect(r.env).toBeNull()
    expect(r.errors.join()).toMatch(/sk_test_/)
  })

  it('accepts a live key', () => {
    const r = pickEnv(sources({ processEnv: { ...hosted, STRIPE_SECRET_KEY: 'sk_live_x' } }), 'hosted')
    expect(r.errors).toEqual([])
    expect(r.env?.supabaseUrl).toBe('https://abc.supabase.co')
  })

  it('refuses --target=hosted with a local URL', () => {
    const r = pickEnv(sources({ processEnv: { ...hosted, SUPABASE_URL: 'http://127.0.0.1:54331', STRIPE_SECRET_KEY: 'sk_live_x' } }), 'hosted')
    expect(r.errors.join()).toMatch(/local stack/)
  })

  it('requires the stack values explicitly', () => {
    const r = pickEnv(sources({ processEnv: { STRIPE_SECRET_KEY: 'sk_live_x' } }), 'hosted')
    expect(r.errors).toEqual(expect.arrayContaining([expect.stringMatching(/SUPABASE_URL/), expect.stringMatching(/SERVICE_ROLE/), expect.stringMatching(/TARGET_DATABASE_URL/)]))
  })
})

describe('helpers', () => {
  it('stripeMode', () => {
    expect(stripeMode('sk_test_1')).toBe('test')
    expect(stripeMode('sk_live_1')).toBe('live')
    expect(stripeMode('rk_live_1')).toBe('unknown')
    expect(stripeMode(null)).toBe('unknown')
  })
  it('isLocalSupabaseUrl', () => {
    expect(isLocalSupabaseUrl('http://127.0.0.1:54331')).toBe(true)
    expect(isLocalSupabaseUrl('http://localhost:54321')).toBe(true)
    expect(isLocalSupabaseUrl('http://kong:8000')).toBe(true)
    expect(isLocalSupabaseUrl('https://abc.supabase.co')).toBe(false)
  })
})
