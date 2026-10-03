// Backfill against the LOCAL stack: a v1 project (crop, grid size, progress, no dice) gets its rows; dry run writes
// nothing; a second run skips it. Skipped unless SUPABASE_TEST=1 (needs `npm run db:start` and the service-role key):
//
//   SUPABASE_TEST=1 SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | grep '^SERVICE_ROLE_KEY' | cut -d= -f2 | tr -d '"') \
//     npx vitest run scripts/backfill/run.integration.test.ts

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { computeGridSize, decodeStoredGrid, DEFAULT_DICE_PARAMS, migrateDocument } from '../../core/dice'
import type { Database } from '../../lib/supabase/database.types'
import { backfillGrids } from './run'

const ENABLED = process.env.SUPABASE_TEST === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const WIDTH = 64
const HEIGHT = 48
const NUM_ROWS = 24

/** Left half black, right half white. */
async function halves(): Promise<Buffer> {
  const raw = Buffer.alloc(WIDTH * HEIGHT * 3)
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) raw.fill(x < WIDTH / 2 ? 0 : 255, (y * WIDTH + x) * 3, (y * WIDTH + x) * 3 + 3)
  return sharp(raw, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } }).jpeg({ quality: 95 }).toBuffer()
}

describe.skipIf(!ENABLED)('backfillGrids (local stack)', () => {
  let admin: SupabaseClient<Database>
  let userId = ''
  let projectId = ''
  let imagePath = ''
  const logs: string[] = []
  const { cols, rows } = computeGridSize(WIDTH, HEIGHT, NUM_ROWS)
  const v1 = {
    schemaVersion: 1,
    step: 'build',
    crop: { x: 0, y: 0, width: WIDTH, height: HEIGHT, rotation: 0, aspectRatio: '4:3' },
    dice: { ...DEFAULT_DICE_PARAMS, numRows: NUM_ROWS },
    grid: { width: cols, height: rows },
    buildProgress: { x: 3, y: 1 },
  }

  beforeAll(async () => {
    expect(SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required').not.toBe('')
    admin = createClient<Database>(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await admin.auth.admin.createUser({ email: `backfill-${Date.now()}@test.dev`, password: 'pass1234', email_confirm: true })
    if (error) throw error
    userId = data.user.id
    projectId = crypto.randomUUID()
    imagePath = `${userId}/${projectId}/original.jpg`
    const upload = await admin.storage.from('project-images').upload(imagePath, await halves(), { contentType: 'image/jpeg' })
    if (upload.error) throw upload.error
    const insert = await admin.from('projects').insert({
      id: projectId,
      owner_id: userId,
      name: 'Backfill me',
      document: v1,
      image_path: imagePath,
      total_dice: cols * rows,
      completed_dice: cols + 3,
    })
    if (insert.error) throw insert.error
  })

  afterAll(async () => {
    if (!userId) return
    await admin.storage.from('project-images').remove([imagePath])
    await admin.auth.admin.deleteUser(userId)
  })

  const row = async () => {
    const { data } = await admin.from('projects').select('document, cloud_version, total_dice, completed_dice').eq('id', projectId).single()
    return data!
  }

  it('dry run plans the write but leaves the row alone', async () => {
    const counts = await backfillGrids(admin, { dryRun: true, force: false, only: projectId, log: (l) => logs.push(l) })
    expect(counts).toMatchObject({ total: 1, planned: 1, written: 0, hadProgress: 1, errors: 0, mismatches: 0 })
    expect(logs.at(-1)).toMatch(/^would write .*\(had 35 dice placed\)/)
    const r = await row()
    expect(r.document).toEqual(v1)
    expect(r.cloud_version).toBe(1)
  })

  it('writes the dice (v2) with a CAS on cloud_version, keeping progress', async () => {
    const counts = await backfillGrids(admin, { dryRun: false, force: false, only: projectId, log: (l) => logs.push(l) })
    expect(counts).toMatchObject({ total: 1, planned: 1, written: 1, conflicts: 0, errors: 0 })
    const r = await row()
    const doc = migrateDocument(r.document)
    expect(doc.schemaVersion).toBe(2)
    expect(doc.grid).toMatchObject({ width: cols, height: rows })
    expect(doc.grid?.rows).toHaveLength(rows)
    const grid = decodeStoredGrid(doc.grid)!
    expect(grid.rows[0][0].color).toBe('black')
    expect(grid.rows[0][cols - 1].color).toBe('white')
    expect(doc.buildProgress).toEqual({ x: 3, y: 1 })
    expect(r.cloud_version).toBe(2)
    expect([r.total_dice, r.completed_dice]).toEqual([cols * rows, cols + 3])
  })

  it('replaces a stale grid size without progress, leaves one with progress alone', async () => {
    const insert = async (name: string, completed: number) => {
      const id = crypto.randomUUID()
      const path = `${userId}/${id}/original.jpg`
      const upload = await admin.storage.from('project-images').upload(path, await halves(), { contentType: 'image/jpeg' })
      if (upload.error) throw upload.error
      const stale = { ...v1, grid: { width: 10, height: 10 }, buildProgress: completed > 0 ? { x: 1, y: 0 } : { x: 0, y: 0 } }
      const { error } = await admin.from('projects').insert({ id, owner_id: userId, name, document: stale, image_path: path, total_dice: 100, completed_dice: completed })
      if (error) throw error
      return id
    }
    const fresh = await insert('Stale size, no progress', 0)
    const started = await insert('Stale size, progress', 1)
    const logs: string[] = []
    const a = await backfillGrids(admin, { dryRun: false, force: false, only: fresh, log: (l) => logs.push(l) })
    expect(a).toMatchObject({ written: 1, resized: 1, mismatches: 0 })
    expect(logs.at(-1)).toMatch(/stale size replaced/)
    const { data } = await admin.from('projects').select('document, total_dice').eq('id', fresh).single()
    expect(migrateDocument(data!.document).grid).toMatchObject({ width: cols, height: rows })
    expect(data!.total_dice).toBe(cols * rows)
    const b = await backfillGrids(admin, { dryRun: false, force: false, only: started, log: (l) => logs.push(l) })
    expect(b).toMatchObject({ written: 0, planned: 0, mismatches: 1 })
    expect(logs.at(-1)).toMatch(/^MISMATCH .*1 dice placed/)
  })

  it('skips a project that already has rows unless forced', async () => {
    const skip = await backfillGrids(admin, { dryRun: false, force: false, only: projectId, log: () => {} })
    expect(skip).toMatchObject({ total: 1, skippedHasRows: 1, written: 0 })
    const forced = await backfillGrids(admin, { dryRun: false, force: true, only: projectId, log: () => {} })
    expect(forced).toMatchObject({ total: 1, written: 1 })
    expect((await row()).cloud_version).toBe(3)
  })
})
