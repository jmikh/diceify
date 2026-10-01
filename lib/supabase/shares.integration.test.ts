// Browser-less proof of H1's data layer against the LOCAL Supabase: create (row → public image) → anonymous read
// through get_share and the public URL; nobody lists, overwrites, deletes or uploads for someone else's share.
// Skipped unless SUPABASE_TEST=1.
//
//   npm run db:start
//   SUPABASE_TEST=1 SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | grep '^SERVICE_ROLE_KEY' | cut -d= -f2 | tr -d '"') \
//     npx vitest run lib/supabase/shares.integration.test.ts

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDefaultDocument } from '@/core/dice'
import { SHARE_IMAGES_BUCKET, shareIdFromBytes, shareImageObject, shareImageUrl } from '@/core/share'
import type { Database } from './database.types'

const ENABLED = process.env.SUPABASE_TEST === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331'
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

process.env.NEXT_PUBLIC_SUPABASE_URL = URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY

const PASSWORD = 'pass1234'
const EMAIL_A = `h1-a-${Date.now()}@test.dev`
const EMAIL_B = `h1-b-${Date.now()}@test.dev`

// The smallest valid JPEG (1×1); storage-api sniffs the type from the bytes as well as the header
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='

const randomShareId = () => shareIdFromBytes(crypto.getRandomValues(new Uint8Array(10)))
const newClient = () => createClient<Database>(URL, ANON_KEY, { auth: { persistSession: false } })

describe.skipIf(!ENABLED)('shares + share-images (local stack)', () => {
  const jpeg = new Blob([Buffer.from(TINY_JPEG_BASE64, 'base64')], { type: 'image/jpeg' })
  let admin: SupabaseClient<Database>
  let anon: SupabaseClient<Database>
  let userB: SupabaseClient<Database>
  let userAId = ''
  let userBId = ''
  let shareId = ''
  /** A row of user A without an image (as a failed upload leaves it). */
  let bareId = ''

  beforeAll(async () => {
    expect(SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required').not.toBe('')
    admin = createClient<Database>(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    for (const email of [EMAIL_A, EMAIL_B]) {
      const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
      if (error) throw error
      if (email === EMAIL_A) userAId = data.user.id
      else userBId = data.user.id
    }
    const { getSupabase } = await import('./client')
    expect((await getSupabase().auth.signInWithPassword({ email: EMAIL_A, password: PASSWORD })).error).toBeNull()
    userB = newClient()
    expect((await userB.auth.signInWithPassword({ email: EMAIL_B, password: PASSWORD })).error).toBeNull()
    anon = newClient()
  })

  afterAll(async () => {
    const { signOut } = await import('./auth')
    await signOut()
    const objects = [shareId, bareId].filter(Boolean).map(shareImageObject)
    if (objects.length) await admin.storage.from(SHARE_IMAGES_BUCKET).remove(objects)
    for (const id of [userAId, userBId]) if (id) await admin.auth.admin.deleteUser(id)
  })

  it('createShare inserts the row and uploads the public image', async () => {
    const { createShare } = await import('./shares')
    shareId = await createShare({ projectId: null, cols: 48, rows: 36, image: jpeg })

    const res = await fetch(shareImageUrl(URL, shareId))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
    expect(res.headers.get('cache-control')).toContain('max-age=31536000')
  })

  it('get_share answers anonymous callers with the public fields only', async () => {
    const { data, error } = await anon.rpc('get_share', { share_id: shareId })
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(Object.keys(data![0]).sort()).toEqual(['created_at', 'grid_cols', 'grid_rows', 'id'])
    expect(data![0]).toMatchObject({ id: shareId, grid_cols: 48, grid_rows: 36 })

    const unknown = await anon.rpc('get_share', { share_id: randomShareId() })
    expect(unknown.data).toEqual([])
  })

  it('anonymous callers and other users cannot list shares; the owner sees their own', async () => {
    expect((await anon.from('shares').select('*')).data).toEqual([])
    expect((await userB.from('shares').select('*')).data).toEqual([])
    const { getSupabase } = await import('./client')
    expect((await getSupabase().from('shares').select('id')).data).toEqual([{ id: shareId }])
    // Nobody can list the bucket either
    expect((await anon.storage.from(SHARE_IMAGES_BUCKET).list()).data ?? []).toEqual([])
  })

  it('a row without its image stays hidden from get_share', async () => {
    const { getSupabase } = await import('./client')
    bareId = randomShareId()
    const { error } = await getSupabase().from('shares').insert({ id: bareId, owner_id: userAId, grid_cols: 10, grid_rows: 10 })
    expect(error).toBeNull()
    expect((await anon.rpc('get_share', { share_id: bareId })).data).toEqual([])
  })

  it("another user cannot upload the image of someone else's share, nor insert a row as them", async () => {
    const upload = await userB.storage.from(SHARE_IMAGES_BUCKET).upload(shareImageObject(bareId), jpeg, { contentType: 'image/jpeg' })
    expect(upload.error).not.toBeNull()
    const anonUpload = await anon.storage.from(SHARE_IMAGES_BUCKET).upload(shareImageObject(bareId), jpeg, { contentType: 'image/jpeg' })
    expect(anonUpload.error).not.toBeNull()
    expect((await anon.rpc('get_share', { share_id: bareId })).data).toEqual([])

    const asA = await userB.from('shares').insert({ id: randomShareId(), owner_id: userAId, grid_cols: 1, grid_rows: 1 })
    expect(asA.error).not.toBeNull()
  })

  it("a share cannot point at someone else's project", async () => {
    const projectId = crypto.randomUUID()
    const { error: projectError } = await admin.from('projects').insert({
      id: projectId,
      owner_id: userBId,
      document: createDefaultDocument() as unknown as Database['public']['Tables']['projects']['Insert']['document'],
      image_path: `${userBId}/${projectId}/original.jpg`,
    })
    expect(projectError).toBeNull()
    const { getSupabase } = await import('./client')
    const { error } = await getSupabase().from('shares').insert({ id: randomShareId(), owner_id: userAId, project_id: projectId, grid_cols: 1, grid_rows: 1 })
    expect(error).not.toBeNull()
  })

  it('shares are immutable: no overwrite of the image, no update, no delete', async () => {
    const { getSupabase } = await import('./client')
    const overwrite = await getSupabase()
      .storage.from(SHARE_IMAGES_BUCKET)
      .upload(shareImageObject(shareId), jpeg, { contentType: 'image/jpeg', upsert: true })
    expect(overwrite.error).not.toBeNull()

    const updated = await getSupabase().from('shares').update({ grid_cols: 1 }).eq('id', shareId).select('id')
    expect(updated.data ?? []).toEqual([])
    const deleted = await getSupabase().from('shares').delete().eq('id', shareId).select('id')
    expect(deleted.data ?? []).toEqual([])
    const removed = await getSupabase().storage.from(SHARE_IMAGES_BUCKET).remove([shareImageObject(shareId)])
    expect(removed.data ?? []).toEqual([])

    expect((await anon.rpc('get_share', { share_id: shareId })).data).toMatchObject([{ id: shareId, grid_cols: 48 }])
    expect((await fetch(shareImageUrl(URL, shareId))).status).toBe(200)
  })
})
