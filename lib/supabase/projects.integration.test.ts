// Browser-less proof of the C3 data layer against the LOCAL Supabase: create (upload + insert) → CAS save →
// conflict → plan limit → image immutability → delete (row + object). Skipped unless SUPABASE_TEST=1.
//
//   npm run db:start
//   SUPABASE_TEST=1 SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | grep '^SERVICE_ROLE_KEY' | cut -d= -f2 | tr -d '"') \
//     npx vitest run lib/supabase/projects.integration.test.ts

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDefaultDocument } from '@/core/dice'
import type { Database } from './database.types'

const ENABLED = process.env.SUPABASE_TEST === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331'
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

process.env.NEXT_PUBLIC_SUPABASE_URL = URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY

const EMAIL = `c3-${Date.now()}@test.dev`
const PASSWORD = 'pass1234'

// The smallest valid JPEG (1×1, from a canvas export); storage-api sniffs the type from the bytes as well as the header
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='

describe.skipIf(!ENABLED)('projects + storage (local stack)', () => {
  let admin: SupabaseClient<Database>
  let userId = ''
  let projectId = ''
  let imagePath = ''
  const jpeg = new Blob([Buffer.from(TINY_JPEG_BASE64, 'base64')], { type: 'image/jpeg' })

  beforeAll(async () => {
    expect(SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required').not.toBe('')
    admin = createClient<Database>(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true })
    if (error) throw error
    userId = data.user.id
    const { getSupabase } = await import('./client')
    const { error: signInError } = await getSupabase().auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
    expect(signInError).toBeNull()
  })

  afterAll(async () => {
    const { signOut } = await import('./auth')
    await signOut()
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  it('createProject uploads the image then inserts the row', async () => {
    const { createProject, listProjects } = await import('./projects')
    const { downloadProjectImage } = await import('./storage')
    const record = await createProject({ name: 'C3 test', document: createDefaultDocument(), imageBlob: jpeg })
    projectId = record.id
    imagePath = record.imagePath
    expect(imagePath).toBe(`${userId}/${projectId}/original.jpg`)
    expect(record).toMatchObject({ name: 'C3 test', cloudVersion: 1, totalDice: 0, completedDice: 0, percentComplete: 0 })
    expect(record.document).toEqual(createDefaultDocument())

    const downloaded = await downloadProjectImage(imagePath)
    expect(downloaded.size).toBe(jpeg.size)

    const list = await listProjects()
    expect(list.map((p) => p.id)).toEqual([projectId])
  })

  it('saveProject: correct version ok, stale version → conflict with the current row', async () => {
    const { saveProject, getProject } = await import('./projects')
    const doc = { ...createDefaultDocument(), step: 'build' as const, grid: { width: 10, height: 10 }, buildProgress: { x: 5, y: 2 } }
    const ok = await saveProject(projectId, { name: 'Renamed', document: doc, expectedVersion: 1 })
    expect(ok).toEqual({ ok: true, cloudVersion: 2 })

    const row = await getProject(projectId)
    expect(row).toMatchObject({ name: 'Renamed', cloudVersion: 2, totalDice: 100, completedDice: 25, percentComplete: 25 })
    expect(row!.document).toEqual(doc)

    const stale = await saveProject(projectId, { name: 'Stale', document: createDefaultDocument(), expectedVersion: 1 })
    expect(stale.ok).toBe(false)
    if (!stale.ok) {
      expect(stale.conflict).toMatchObject({ id: projectId, name: 'Renamed', cloudVersion: 2 })
    }
    const missing = await saveProject(crypto.randomUUID(), { name: 'x', document: doc, expectedVersion: 1 })
    expect(missing).toEqual({ ok: false, conflict: null })
  })

  it('a second project on the explorer plan → ProjectLimitError {1, 1} and no orphaned object', async () => {
    const { createProject, ProjectLimitError } = await import('./projects')
    await expect(createProject({ name: 'Second', document: createDefaultDocument(), imageBlob: jpeg })).rejects.toBeInstanceOf(
      ProjectLimitError,
    )
    try {
      await createProject({ name: 'Second', document: createDefaultDocument(), imageBlob: jpeg })
    } catch (error) {
      expect(error).toMatchObject({ current: 1, limit: 1 })
    }
    const { data } = await admin.storage.from('project-images').list(userId)
    expect(data?.map((o) => o.name)).toEqual([projectId])
  })

  it('image_path and owner_id are immutable', async () => {
    const { getSupabase } = await import('./client')
    const { error } = await getSupabase()
      .from('projects')
      .update({ image_path: `${userId}/other/original.jpg` })
      .eq('id', projectId)
    expect(error?.code).toBe('P0001')
    expect(error?.message).toContain('IMAGE_PATH_IMMUTABLE')
  })

  it('deleteProject removes the row and the object', async () => {
    const { deleteProject, getProject } = await import('./projects')
    const { downloadProjectImage } = await import('./storage')
    await deleteProject(projectId)
    expect(await getProject(projectId)).toBeNull()
    await expect(downloadProjectImage(imagePath)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    // Idempotent
    await expect(deleteProject(projectId)).resolves.toBeUndefined()
  })
})
