// `deleteAccount` against the LOCAL stack: a user with a project (original + thumbnail), a share (row + card) and a
// stored "active" subscription → Stripe cancel called, every object gone, user gone (rows cascade). Skipped unless
// SUPABASE_TEST=1 (needs `npm run db:start` and the service-role key, see lib/supabase/projects.integration.test.ts).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteAccount } from './account-delete'

const ENABLED = process.env.SUPABASE_TEST === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54331'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
)

describe.skipIf(!ENABLED)('deleteAccount (local stack)', () => {
  let admin: SupabaseClient
  let userId = ''
  const shareId = 'abcdefghjk'
  const paths = { original: '', preview: '' }

  const exists = async (bucket: string, path: string) => {
    const { error } = await admin.storage.from(bucket).download(path)
    return !error
  }

  beforeAll(async () => {
    expect(SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required').not.toBe('')
    admin = createClient(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await admin.auth.admin.createUser({ email: `delete-${Date.now()}@test.dev`, password: 'pass1234', email_confirm: true })
    if (error) throw error
    userId = data.user.id
    const projectId = crypto.randomUUID()
    paths.original = `${userId}/${projectId}/original.jpg`
    paths.preview = `${userId}/${projectId}/preview.jpg`
    for (const path of [paths.original, paths.preview]) {
      const { error: uploadError } = await admin.storage.from('project-images').upload(path, TINY_JPEG, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
    }
    const doc = { schemaVersion: 2, step: 'crop', crop: null, dice: { numRows: 70, colorMode: 'both', contrast: 25, gamma: 1, edgeSharpening: 5, rotate6: false, rotate3: false, rotate2: false }, grid: null, buildProgress: { x: 0, y: 0 } }
    const { error: projectError } = await admin.from('projects').insert({ id: projectId, owner_id: userId, name: 'Doomed', document: doc, image_path: paths.original })
    if (projectError) throw projectError
    const { error: shareError } = await admin.from('shares').insert({ id: shareId, owner_id: userId, project_id: projectId, grid_cols: 10, grid_rows: 10 })
    if (shareError) throw shareError
    const { error: cardError } = await admin.storage.from('share-images').upload(`${shareId}.jpg`, TINY_JPEG, { contentType: 'image/jpeg' })
    if (cardError) throw cardError
    const { error: billingError } = await admin
      .from('profiles')
      .update({ plan: 'studio', stripe_customer_id: 'cus_doomed', stripe_subscription_id: 'sub_doomed', subscription_status: 'active' })
      .eq('id', userId)
    if (billingError) throw billingError
  })

  afterAll(async () => {
    // Belt and braces when an assertion failed midway
    await admin.storage.from('project-images').remove([paths.original, paths.preview])
    await admin.storage.from('share-images').remove([`${shareId}.jpg`])
    if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {})
  })

  it('cancels the subscription, removes every object, deletes the user and its rows', async () => {
    const cancelled: string[] = []
    const result = await deleteAccount(admin, { cancelSubscription: async (id) => void cancelled.push(id) }, userId)
    expect(result).toEqual({ deleted: true, projects: 1, shares: 1, cancelledSubscription: 'sub_doomed' })
    expect(cancelled).toEqual(['sub_doomed'])
    expect(await exists('project-images', paths.original)).toBe(false)
    expect(await exists('project-images', paths.preview)).toBe(false)
    expect(await exists('share-images', `${shareId}.jpg`)).toBe(false)
    expect((await admin.from('profiles').select('id').eq('id', userId)).data).toEqual([])
    expect((await admin.from('projects').select('id').eq('owner_id', userId)).data).toEqual([])
    expect((await admin.from('shares').select('id').eq('id', shareId)).data).toEqual([])
    const { data: user } = await admin.auth.admin.getUserById(userId)
    expect(user.user).toBeNull()
    userId = ''
  })
})
