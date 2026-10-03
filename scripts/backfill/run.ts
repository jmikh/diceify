// Fills `document.grid.rows` (schema v2) for every project that has a crop but no stored dice: download the
// original, crop it like the browser does (sharp), run the dice core, write the document back with a compare-and-set
// on `cloud_version` (a project being edited right now is skipped, not clobbered). Pure orchestration over an admin
// client so the integration test can drive it; the CLI is scripts/backfill-grids.ts.

import type { SupabaseClient } from '@supabase/supabase-js'
import { documentStats, encodeGrid, generateDiceGrid, migrateDocument, type ProjectDocument } from '../../core/dice'
import type { Database, Json } from '../../lib/supabase/database.types'
import { cropWithSharp } from './cropImage'

const BUCKET = 'project-images'
const PAGE = 200

export interface BackfillOptions {
  /** Read, crop and generate, but write nothing. */
  dryRun: boolean
  /** Regenerate projects that already carry rows. */
  force: boolean
  /** One project id. */
  only?: string
  log: (line: string) => void
}

export interface BackfillCounts {
  total: number
  /** Would be written (dry run) or were written. */
  planned: number
  written: number
  skippedHasRows: number
  skippedNoCrop: number
  /** The regenerated grid's size differs from the stored one AND dice were placed on the stored one: left untouched. */
  mismatches: number
  /** Same, but nothing was placed yet: the stale size is simply replaced. */
  resized: number
  /** `cloud_version` moved while the project was being processed (someone is editing it). */
  conflicts: number
  errors: number
  /** Planned projects whose owner had placed dice already (their grid may differ by a cell or two). */
  hadProgress: number
}

type Row = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name' | 'document' | 'image_path' | 'cloud_version' | 'completed_dice'>

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e))

async function* projects(admin: SupabaseClient<Database>, only: string | undefined): AsyncGenerator<Row> {
  for (let from = 0; ; from += PAGE) {
    let query = admin
      .from('projects')
      .select('id, name, document, image_path, cloud_version, completed_dice')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (only) query = query.eq('id', only)
    const { data, error } = await query
    if (error) throw new Error(`projects list: ${error.message}`)
    for (const row of data) yield row
    if (data.length < PAGE) return
  }
}

async function download(admin: SupabaseClient<Database>, path: string): Promise<Buffer> {
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error) throw new Error(`download ${path}: ${error.message}`)
  return Buffer.from(await data.arrayBuffer())
}

type Regenerated = { next: ProjectDocument; resized: boolean } | { skip: 'mismatch'; detail: string }

/**
 * The document with its dice filled in. A stored grid size that differs from the regenerated one (seen on legacy
 * rows whose size predates their last crop) is replaced when nothing was placed on it; with progress on it, the
 * project is left alone and reported, since the progress would point at the wrong dice.
 */
async function regenerate(admin: SupabaseClient<Database>, row: Row, doc: ProjectDocument): Promise<Regenerated> {
  const pixels = await cropWithSharp(await download(admin, row.image_path), doc.crop!)
  const grid = generateDiceGrid(pixels, doc.dice)
  const resized = doc.grid !== null && (doc.grid.width !== grid.width || doc.grid.height !== grid.height)
  if (resized && row.completed_dice > 0) {
    return { skip: 'mismatch', detail: `stored ${doc.grid!.width}×${doc.grid!.height}, regenerated ${grid.width}×${grid.height}, ${row.completed_dice} dice placed` }
  }
  return { next: { ...doc, grid: { width: grid.width, height: grid.height, rows: encodeGrid(grid) } }, resized }
}

export async function backfillGrids(admin: SupabaseClient<Database>, opts: BackfillOptions): Promise<BackfillCounts> {
  const counts: BackfillCounts = { total: 0, planned: 0, written: 0, skippedHasRows: 0, skippedNoCrop: 0, mismatches: 0, resized: 0, conflicts: 0, errors: 0, hadProgress: 0 }
  const { log } = opts
  for await (const row of projects(admin, opts.only)) {
    counts.total++
    const tag = `${row.id} "${row.name}"`
    try {
      const doc = migrateDocument(row.document)
      if (doc.grid?.rows && !opts.force) {
        counts.skippedHasRows++
        continue
      }
      if (!doc.crop) {
        counts.skippedNoCrop++
        continue
      }
      const result = await regenerate(admin, row, doc)
      if ('skip' in result) {
        counts.mismatches++
        log(`MISMATCH ${tag}: ${result.detail}`)
        continue
      }
      counts.planned++
      if (result.resized) counts.resized++
      const progress = (row.completed_dice > 0 ? ` (had ${row.completed_dice} dice placed)` : '') + (result.resized ? ' (stale size replaced)' : '')
      if (row.completed_dice > 0) counts.hadProgress++
      if (opts.dryRun) {
        log(`would write ${tag}: ${result.next.grid!.width}×${result.next.grid!.height}${progress}`)
        continue
      }
      const stats = documentStats(result.next)
      const { data, error } = await admin
        .from('projects')
        .update({ document: JSON.parse(JSON.stringify(result.next)) as Json, total_dice: stats.totalDice, completed_dice: stats.completedDice })
        .eq('id', row.id)
        .eq('cloud_version', row.cloud_version)
        .select('id')
      if (error) throw new Error(`update: ${error.message}`)
      if (data.length === 0) {
        counts.conflicts++
        log(`CONFLICT ${tag}: cloud_version moved, skipped (rerun later)`)
        continue
      }
      counts.written++
      log(`wrote ${tag}: ${result.next.grid!.width}×${result.next.grid!.height}${progress}`)
    } catch (error) {
      counts.errors++
      log(`ERROR ${tag}: ${message(error)}`)
    }
  }
  return counts
}

export function formatCounts(c: BackfillCounts, dryRun: boolean): string {
  return [
    `${c.total} projects`,
    `${dryRun ? 'would write' : 'wrote'} ${dryRun ? c.planned : c.written} (${c.hadProgress} with progress)`,
    `skipped: ${c.skippedHasRows} already had rows, ${c.skippedNoCrop} without a crop`,
    `${c.resized} stale sizes replaced, ${c.mismatches} size mismatches with progress (untouched), ${c.conflicts} conflicts, ${c.errors} errors`,
  ].join('; ')
}
