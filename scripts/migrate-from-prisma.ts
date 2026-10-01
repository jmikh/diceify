// Legacy Prisma/Postgres → Supabase migration (plans/revamp/revamp-step-F1.md). Run: npm run migrate:legacy -- [flags]
//
//   --dry-run            every read (selection, image decode, mapping, existing-row lookups), no write
//   --since=YYYY-MM-DD   activity cut-off for unpaid users (default: 30 days ago)
//   --only=<email>       one legacy user
//   --no-sync-stripe     skip the Stripe sync after the profile update (default: on when a key is available)
//   --report=<file.json> per-user results (legacy ids; --report-emails adds emails)
//   --target=hosted      allow a non-local SUPABASE_URL (F2); refused with an sk_test_ key
//
// The legacy database is READ ONLY (default_transaction_read_only on the connection). Writes go to the Supabase
// stack named by SUPABASE_URL / TARGET_DATABASE_URL: auth users through the Admin API, profile + project rows
// through pg (explicit created_at), images through the admin storage client. Idempotent by
// profiles.legacy_id / lower(email) and projects.legacy_id. Env resolution: scripts/migrate/env.ts.

import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient, types as pgTypes } from 'pg'
import sharp from 'sharp'
import Stripe from 'stripe'
import { syncBillingFromStripe } from '../supabase/functions/_shared/billing-sync'
import { loadEnv, stripeMode, type MigrationEnv, type StripeMode, type Target } from './migrate/env'
import { authUserInput, mapUserToProfile, normalizeEmail, type LegacyUserRow, type ProfilePatch } from './migrate/mapUser'
import {
  JPEG_QUALITY,
  MAX_IMAGE_SIDE,
  hasImage,
  imageScaleFactor,
  isDocumentError,
  mapProjectDocument,
  parseDataUrl,
  projectName,
  type LegacyProjectFull,
} from './migrate/mapProject'
import { decideProject, decideUser } from './migrate/plan'
import { emptyCounts, formatBytes, formatSummary, type Counts, type ProjectReport, type RunReport, type UserReport } from './migrate/report'
import { buildProjectSelection, buildUserSelection, parseLegacyTimestamp, parseSince } from './migrate/select'

const ROOT = path.resolve(__dirname, '..')
const BUCKET = 'project-images'
/** The `_shared/stripe.ts` pin (stripe@20.4.1 types the literal, so a drift fails `typecheck`). */
const STRIPE_API_VERSION = '2026-02-25.clover'

interface Options {
  dryRun: boolean
  since: Date
  only: string | undefined
  syncStripe: boolean
  report: string | undefined
  reportEmails: boolean
  target: Target
}

interface Ctx {
  legacy: PgClient
  target: PgClient
  admin: SupabaseClient
  stripe: Stripe | null
  stripeMode: StripeMode
  opts: Options
  counts: Counts
  now: Date
}

const log = (line: string) => console.log(line)
const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e))

function parseOptions(argv: string[], now: Date): Options {
  const { values } = parseArgs({
    args: argv,
    allowNegative: true,
    options: {
      'dry-run': { type: 'boolean', default: false },
      since: { type: 'string' },
      only: { type: 'string' },
      'sync-stripe': { type: 'boolean', default: true },
      report: { type: 'string' },
      'report-emails': { type: 'boolean', default: false },
      target: { type: 'string', default: 'local' },
    },
  })
  if (values.target !== 'local' && values.target !== 'hosted') throw new Error('--target must be local or hosted')
  return {
    dryRun: values['dry-run'],
    since: parseSince(values.since, now),
    only: values.only,
    syncStripe: values['sync-stripe'],
    report: values.report,
    reportEmails: values['report-emails'],
    target: values.target,
  }
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

const isLoopback = (url: string) => /@(127\.0\.0\.1|localhost)[:/]/.test(url)

function pgClient(url: string): PgClient {
  if (isLoopback(url)) return new PgClient({ connectionString: url })
  // Hosted Postgres needs TLS. The explicit `ssl` option is what counts; `sslmode` is dropped from the URL so
  // pg-connection-string does not also warn about its own (changing) interpretation of it.
  const parsed = new URL(url)
  parsed.searchParams.delete('sslmode')
  return new PgClient({ connectionString: parsed.toString(), ssl: { rejectUnauthorized: false } })
}

async function connectLegacy(url: string): Promise<PgClient> {
  // Legacy `timestamp(3)` columns are UTC without a zone; the default parser would read them as local time.
  // (Global for the process; the target only has timestamptz columns, which use a different OID.)
  pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMP, parseLegacyTimestamp)
  const client = pgClient(url)
  await client.connect()
  await client.query('set default_transaction_read_only = on')
  const { rows } = await client.query<{ ro: string }>("select current_setting('transaction_read_only') as ro")
  if (rows[0]?.ro !== 'on') throw new Error('legacy connection is not read-only; aborting')
  return client
}

function stripeClient(env: MigrationEnv, opts: Options): Stripe | null {
  if (!opts.syncStripe || !env.stripeSecretKey) return null
  return new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION })
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function findProfile(target: PgClient, legacyId: string, email: string) {
  const { rows } = await target.query<{ id: string; legacy_id: string | null; email: string }>(
    'select id, legacy_id, email from public.profiles where legacy_id = $1 or lower(email) = $2',
    [legacyId, email],
  )
  return {
    byLegacyId: rows.find((r) => r.legacy_id === legacyId)?.id ?? null,
    byEmail: rows.find((r) => r.email.toLowerCase() === email)?.id ?? null,
  }
}

/** Admin-create the auth user (profile row via trigger); adopt an auth user that already carries the email. */
async function createAuthUser(ctx: Ctx, user: LegacyUserRow): Promise<string> {
  const input = authUserInput(user)
  const { data, error } = await ctx.admin.auth.admin.createUser(input)
  let id = data.user?.id ?? null
  if (error) {
    if (error.code !== 'email_exists') throw new Error(`auth.admin.createUser: ${error.message}`)
    const { rows } = await ctx.target.query<{ id: string }>('select id from auth.users where lower(email) = $1', [input.email])
    id = rows[0]?.id ?? null
    if (!id) throw new Error('auth.admin.createUser: email_exists but no auth.users row found')
    log(`    auth user already existed without a profile; adopted`)
  }
  if (!id) throw new Error('auth.admin.createUser returned no user')
  // The trigger created the profile for a fresh user; an adopted auth user may lack one.
  await ctx.target.query('insert into public.profiles (id, email) values ($1, $2) on conflict (id) do nothing', [id, input.email])
  return id
}

async function updateProfile(target: PgClient, profileId: string, patch: ProfilePatch): Promise<void> {
  await target.query(
    `update public.profiles
       set legacy_id = $2, plan = $3, plan_expires_at = $4, stripe_customer_id = $5, stripe_subscription_id = $6,
           subscription_status = $7, current_period_end = $8, created_at = $9
     where id = $1`,
    [
      profileId,
      patch.legacy_id,
      patch.plan,
      patch.plan_expires_at,
      patch.stripe_customer_id,
      patch.stripe_subscription_id,
      patch.subscription_status,
      patch.current_period_end,
      patch.created_at,
    ],
  )
}

const isCustomerMissing = (e: unknown): boolean =>
  e instanceof Stripe.errors.StripeInvalidRequestError && e.code === 'resource_missing'

async function syncStripe(ctx: Ctx, profileId: string): Promise<UserReport['stripe']> {
  if (!ctx.stripe) {
    ctx.counts.stripe.skipped++
    return 'skipped'
  }
  try {
    const view = await syncBillingFromStripe(ctx.admin, ctx.stripe, { profileId }, ctx.now)
    ctx.counts.stripe.synced++
    log(`    stripe: synced → plan=${view?.plan ?? '?'} status=${view?.subscriptionStatus ?? '-'} cancel_at=${view?.cancelAt ?? '-'}`)
    return 'synced'
  } catch (e) {
    if (isCustomerMissing(e)) {
      ctx.counts.stripe.notFound++
      log(`    stripe: customer not found in this Stripe mode (${ctx.stripeMode}); legacy-mapped columns kept`)
      return 'not-found'
    }
    ctx.counts.stripe.errors++
    log(`    stripe: ERROR ${errorMessage(e)}; legacy-mapped columns kept`)
    return 'error'
  }
}

async function migrateUser(ctx: Ctx, user: LegacyUserRow, index: number, total: number): Promise<UserReport> {
  const email = normalizeEmail(user.email)
  const patch = mapUserToProfile(user)
  const report: UserReport = {
    legacyId: user.id,
    ...(ctx.opts.reportEmails ? { email } : {}),
    profileId: null,
    action: 'failed',
    plan: patch.plan,
    stripe: 'no-customer',
    projects: [],
  }
  const decision = decideUser(await findProfile(ctx.target, user.id, email))
  let profileId: string | null = null
  if (decision.action === 'create') {
    ctx.counts.users.created++
    if (!ctx.opts.dryRun) profileId = await createAuthUser(ctx, user)
  } else {
    profileId = decision.profileId
    if (decision.action === 'existing-by-legacy-id') ctx.counts.users.existedByLegacyId++
    else ctx.counts.users.existedByEmail++
  }
  report.action = decision.action === 'create' ? 'created' : decision.action
  report.profileId = profileId
  log(`[${index}/${total}] legacy=${user.id} ${report.action} → profile ${profileId ?? '(dry-run)'} plan=${patch.plan}`)

  if (profileId) {
    await updateProfile(ctx.target, profileId, patch)
    ctx.counts.users.updated++
    if (patch.stripe_customer_id) {
      report.stripe = ctx.opts.dryRun ? 'skipped' : await syncStripe(ctx, profileId)
      if (ctx.opts.dryRun) ctx.counts.stripe.skipped++
    }
  } else if (patch.stripe_customer_id) {
    // Dry run of a user that does not exist yet.
    ctx.counts.stripe.skipped++
    report.stripe = 'skipped'
  }

  const { text, values } = buildProjectSelection(user.id)
  const { rows } = await ctx.legacy.query<LegacyProjectFull>(text, values)
  ctx.counts.projects.selected += rows.length
  for (const row of rows) report.projects.push(await migrateProject(ctx, profileId, row))
  const tally = report.projects.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.action]: (acc[p.action] ?? 0) + 1 }), {})
  log(`    projects: ${rows.length} (${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'})`)
  return report
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

interface Transcoded {
  jpeg: Buffer
  factor: number
  width: number
  height: number
}

/** EXIF-rotate, fit inside 2048², JPEG q85; the factor is against the auto-rotated original (browser space). */
async function transcode(data: Buffer): Promise<Transcoded> {
  const meta = await sharp(data).metadata()
  if (!meta.width || !meta.height) throw new Error('image has no dimensions')
  const { data: jpeg, info } = await sharp(data)
    .rotate()
    .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer({ resolveWithObject: true })
  const factor = imageScaleFactor({ width: meta.width, height: meta.height, orientation: meta.orientation }, info)
  return { jpeg, factor, width: info.width, height: info.height }
}

async function insertProject(ctx: Ctx, row: LegacyProjectFull, id: string, ownerId: string, imagePath: string, documentJson: string, totalDice: number, completedDice: number) {
  await ctx.target.query(
    `insert into public.projects (id, owner_id, name, document, image_path, total_dice, completed_dice, legacy_id, created_at, updated_at)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
    [id, ownerId, projectName(row.name), documentJson, imagePath, totalDice, completedDice, row.id, row.createdAt, row.updatedAt],
  )
}

async function migrateProject(ctx: Ctx, ownerId: string | null, row: LegacyProjectFull): Promise<ProjectReport> {
  const { counts, opts, admin } = ctx
  const fail = (reason: string): ProjectReport => {
    counts.projects.failed++
    log(`    project ${row.id}: FAILED ${reason}`)
    return { legacyId: row.id, projectId: null, action: 'failed', reason }
  }

  const { rows } = await ctx.target.query<{ id: string }>('select id from public.projects where legacy_id = $1', [row.id])
  const decision = decideProject({ hasImage: hasImage(row), existingByLegacyId: rows.length > 0 })
  if (decision === 'skip-existing') {
    counts.projects.skippedExisting++
    return { legacyId: row.id, projectId: rows[0].id, action: 'skipped-existing' }
  }
  if (decision === 'skip-no-image') {
    counts.projects.skippedNoImage++
    return { legacyId: row.id, projectId: null, action: 'skipped-no-image' }
  }

  const parsed = parseDataUrl(row.originalImage ?? '')
  if (!parsed) return fail('unparsable image data URL')
  let image: Transcoded
  try {
    image = await transcode(parsed.data)
  } catch (e) {
    return fail(`image decode (${parsed.mime}): ${errorMessage(e)}`)
  }
  let mapped
  try {
    mapped = mapProjectDocument(row, image.factor)
  } catch (e) {
    return fail(isDocumentError(e) ? `document: ${e.message}` : errorMessage(e))
  }
  if (mapped.cropDropped) log(`    project ${row.id}: crop did not survive scaling; dropped`)

  if (opts.dryRun || !ownerId) {
    counts.projects.migrated++
    counts.bytesPlanned += image.jpeg.length
    return { legacyId: row.id, projectId: null, action: 'migrated' }
  }

  const id = randomUUID()
  const imagePath = `${ownerId}/${id}/original.jpg`
  const upload = await admin.storage.from(BUCKET).upload(imagePath, image.jpeg, { contentType: 'image/jpeg', upsert: true })
  if (upload.error) return fail(`storage upload: ${upload.error.message}`)
  try {
    await insertProject(ctx, row, id, ownerId, imagePath, JSON.stringify(mapped.document), mapped.totalDice, mapped.completedDice)
  } catch (e) {
    await admin.storage.from(BUCKET).remove([imagePath])
    return fail(`insert: ${errorMessage(e)}`)
  }
  counts.projects.migrated++
  counts.bytesUploaded += image.jpeg.length
  log(`    project ${row.id} → ${id} (${image.width}×${image.height}, ${formatBytes(image.jpeg.length)}, factor ${image.factor.toFixed(4)})`)
  return { legacyId: row.id, projectId: id, action: 'migrated' }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const now = new Date()
  const opts = parseOptions(process.argv.slice(2), now)
  const { env, warnings, errors } = loadEnv(ROOT, process.env, opts.target)
  for (const w of warnings) console.warn(`warning: ${w}`)
  if (!env) {
    for (const e of errors) console.error(`error: ${e}`)
    return 2
  }
  log(`target: ${opts.target} (${env.supabaseUrl})${opts.dryRun ? ' — DRY RUN' : ''}`)
  log(`since: ${opts.since.toISOString()}${opts.only ? ' — only one user' : ''}`)
  const stripe = stripeClient(env, opts)
  log(`stripe: ${stripe ? `${stripeMode(env.stripeSecretKey)} mode` : 'sync disabled'}`)

  const legacy = await connectLegacy(env.legacyDatabaseUrl)
  log('legacy: connected read-only')
  const target = pgClient(env.targetDatabaseUrl)
  await target.connect()
  const admin = createClient(env.supabaseUrl, env.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const ctx: Ctx = { legacy, target, admin, stripe, stripeMode: stripeMode(env.stripeSecretKey), opts, counts: emptyCounts(), now }
  const report: RunReport = { generatedAt: now.toISOString(), dryRun: opts.dryRun, since: opts.since.toISOString(), counts: ctx.counts, users: [] }

  try {
    const selection = buildUserSelection({ since: opts.since, only: opts.only })
    const { rows: users } = await legacy.query<LegacyUserRow>(selection.text, selection.values)
    ctx.counts.users.selected = users.length
    log(`selected ${users.length} legacy users`)
    for (const [i, user] of users.entries()) {
      try {
        report.users.push(await migrateUser(ctx, user, i + 1, users.length))
      } catch (e) {
        ctx.counts.users.failed++
        const message = errorMessage(e)
        log(`[${i + 1}/${users.length}] legacy=${user.id} FAILED: ${message}`)
        report.users.push({ legacyId: user.id, profileId: null, action: 'failed', plan: '?', stripe: 'skipped', error: message, projects: [] })
      }
    }
  } finally {
    await legacy.end()
    await target.end()
  }

  const stripeSkippedReason = opts.dryRun ? 'dry-run' : stripe ? null : 'no key / --no-sync-stripe'
  log('')
  log(formatSummary(ctx.counts, { dryRun: opts.dryRun, stripeSkippedReason }))
  if (opts.report) {
    writeFileSync(opts.report, JSON.stringify(report, null, 2))
    log(`report written to ${opts.report}${opts.reportEmails ? ' (with emails)' : ''}`)
  }
  return ctx.counts.users.failed > 0 || ctx.counts.projects.failed > 0 ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`fatal: ${errorMessage(e)}`)
    process.exit(2)
  },
)
