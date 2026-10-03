// One-time backfill of `document.grid.rows` (schema v2, plans/ios/ios-app-plan.md § 5). Run: npm run backfill:grids -- [flags]
//
//   --dry-run          read, crop and generate everything, write nothing
//   --force            regenerate projects that already carry rows
//   --only=<id>        one project
//   --target=hosted    allow a non-local SUPABASE_URL (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment)
//
// Local target: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY come from the environment or `supabase status -o env`.
// Deploy the web first (it reads v2); projects opened in the browser meanwhile fill their own rows and are skipped here.

import { execFileSync } from 'node:child_process'
import { parseArgs, parseEnv } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import { backfillGrids, formatCounts } from './backfill/run'
import { isLocalSupabaseUrl } from './migrate/env'

function resolveEnv(target: 'local' | 'hosted'): { url: string; key: string } {
  let url = process.env.SUPABASE_URL
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if ((!url || !key) && target === 'local') {
    const status = parseEnv(execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' }))
    url ??= status.API_URL
    key ??= status.SERVICE_ROLE_KEY
  }
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (hosted target: set them explicitly)')
  if (target === 'local' && !isLocalSupabaseUrl(url)) throw new Error(`${url} is not a local stack; pass --target=hosted on purpose`)
  if (target === 'hosted' && isLocalSupabaseUrl(url)) throw new Error(`--target=hosted but SUPABASE_URL is local (${url})`)
  return { url, key }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      only: { type: 'string' },
      target: { type: 'string', default: 'local' },
    },
  })
  const target = values.target === 'hosted' ? 'hosted' : 'local'
  const { url, key } = resolveEnv(target)
  const dryRun = values['dry-run']
  console.log(`backfill grids → ${url} (${target}${dryRun ? ', dry run' : ''}${values.force ? ', force' : ''})`)
  const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const counts = await backfillGrids(admin, { dryRun, force: values.force, only: values.only, log: (line) => console.log(line) })
  console.log(formatCounts(counts, dryRun))
  if (counts.errors > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
