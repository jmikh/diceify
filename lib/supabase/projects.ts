// Project rows under RLS: list, get, create (client uuid → upload → insert), compare-and-set save, delete.
// See plans/revamp/revamp-tiered-plan.md → "Data model" and "Client data access".

import { documentStats, migrateDocument, type ProjectDocument } from '@/core/dice'
import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabase } from './client'
import type { Json, Tables } from './database.types'
import { projectImagePath, removeProjectImage, uploadProjectImage } from './storage'

export interface ProjectSummary {
  id: string
  name: string
  totalDice: number
  completedDice: number
  percentComplete: number
  cloudVersion: number
  createdAt: string
  updatedAt: string
}

export interface ProjectRecord extends ProjectSummary {
  document: ProjectDocument
  imagePath: string
}

export type SaveResult = { ok: true; cloudVersion: number } | { ok: false; conflict: ProjectRecord | null }

/** The insert trigger refused a new project (plan limit). Counts are null when the detail could not be parsed. */
export class ProjectLimitError extends Error {
  constructor(
    readonly current: number | null,
    readonly limit: number | null,
  ) {
    super('PROJECT_LIMIT')
    this.name = 'ProjectLimitError'
  }
}

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in')
    this.name = 'NotSignedInError'
  }
}

const SUMMARY_COLUMNS = 'id,name,total_dice,completed_dice,percent_complete,cloud_version,created_at,updated_at'

type SummaryRow = Pick<
  Tables<'projects'>,
  'id' | 'name' | 'total_dice' | 'completed_dice' | 'percent_complete' | 'cloud_version' | 'created_at' | 'updated_at'
>

function toSummary(row: SummaryRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    totalDice: row.total_dice,
    completedDice: row.completed_dice,
    percentComplete: row.percent_complete ?? 0,
    cloudVersion: row.cloud_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Throws `DocumentError` when the stored document is not readable. */
function toRecord(row: Tables<'projects'>): ProjectRecord {
  return { ...toSummary(row), document: migrateDocument(row.document), imagePath: row.image_path }
}

/** A document as the `Json` column type (the round trip also drops `undefined` members). */
export function documentJson(doc: ProjectDocument): Json {
  return JSON.parse(JSON.stringify(doc)) as Json
}

/**
 * The trigger's detail: PostgREST forwards it as a JSON *string* (`'{"current":1,"limit":1}'`, C1 finding);
 * an object is accepted too. Anything else → null.
 */
export function parseProjectLimit(details: unknown): { current: number; limit: number } | null {
  let value: unknown = details
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (typeof value !== 'object' || value === null) return null
  const { current, limit } = value as Record<string, unknown>
  if (typeof current !== 'number' || typeof limit !== 'number') return null
  return { current, limit }
}

/** PostgREST error → the typed error the UI branches on (the trigger's `P0001 PROJECT_LIMIT`), else as-is. */
export function toProjectError(error: Pick<PostgrestError, 'code' | 'message' | 'details'>): Error {
  if (error.code === 'P0001' && error.message.includes('PROJECT_LIMIT')) {
    const parsed = parseProjectLimit(error.details)
    return new ProjectLimitError(parsed?.current ?? null, parsed?.limit ?? null)
  }
  return error instanceof Error ? error : Object.assign(new Error(error.message), error)
}

async function currentUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new NotSignedInError()
  return id
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await getSupabase()
    .from('projects')
    .select(SUMMARY_COLUMNS)
    .order('updated_at', { ascending: false })
  if (error) throw toProjectError(error)
  return data.map(toSummary)
}

/** The full row, or null when it does not exist (or belongs to someone else — RLS hides it). */
export async function getProject(id: string): Promise<ProjectRecord | null> {
  const { data, error } = await getSupabase().from('projects').select('*').eq('id', id).maybeSingle()
  if (error) throw toProjectError(error)
  return data ? toRecord(data) : null
}

export interface CreateProjectInput {
  name: string
  document: ProjectDocument
  imageBlob: Blob
}

/**
 * Upload first, then insert: an orphaned object is cheap and invisible, an orphaned row would point at nothing.
 * When the insert fails (limit, network) the uploaded object is removed again.
 */
export async function createProject({ name, document, imageBlob }: CreateProjectInput): Promise<ProjectRecord> {
  const ownerId = await currentUserId()
  const id = crypto.randomUUID()
  const imagePath = projectImagePath(ownerId, id)
  await uploadProjectImage(imagePath, imageBlob)

  const { totalDice, completedDice } = documentStats(document)
  const { data, error } = await getSupabase()
    .from('projects')
    .insert({
      id,
      owner_id: ownerId,
      name,
      document: documentJson(document),
      image_path: imagePath,
      total_dice: totalDice,
      completed_dice: completedDice,
    })
    .select('*')
    .single()
  if (error) {
    await removeProjectImage(imagePath).catch(() => {
      /* best effort: the row does not exist, the object is unreachable through the app */
    })
    throw toProjectError(error)
  }
  return toRecord(data)
}

export interface SaveProjectInput {
  name: string
  document: ProjectDocument
  expectedVersion: number
}

/**
 * Compare-and-set on `cloud_version`: zero updated rows means someone else saved first (or the project is gone),
 * and the caller gets the current row (or null) to reload from. The trigger bumps the version; the returned one
 * becomes the client's new `expectedVersion`.
 */
export async function saveProject(id: string, { name, document, expectedVersion }: SaveProjectInput): Promise<SaveResult> {
  const { totalDice, completedDice } = documentStats(document)
  const { data, error } = await getSupabase()
    .from('projects')
    .update({ name, document: documentJson(document), total_dice: totalDice, completed_dice: completedDice })
    .eq('id', id)
    .eq('cloud_version', expectedVersion)
    .select('cloud_version')
    .maybeSingle()
  if (error) throw toProjectError(error)
  if (data) return { ok: true, cloudVersion: data.cloud_version }
  return { ok: false, conflict: await getProject(id) }
}

/** Delete the row, then its image. A row that is already gone is a no-op. */
export async function deleteProject(id: string): Promise<void> {
  const { data, error } = await getSupabase().from('projects').delete().eq('id', id).select('image_path').maybeSingle()
  if (error) throw toProjectError(error)
  if (data) await removeProjectImage(data.image_path)
}
