// Share links (plans/revamp/revamp-step-H1.md): a `shares` row plus its card image `<id>.jpg` in the public
// `share-images` bucket. Row first: the storage insert policy requires the caller's own row. A failed upload leaves a
// row that `get_share` (the public read) hides. Shares are immutable and never deleted from the app.

import { SHARE_ID_LENGTH, SHARE_IMAGES_BUCKET, shareIdFromBytes, shareImageObject } from '@/core/share'
import { currentUserId } from './auth'
import { getSupabase } from './client'
import { toProjectError } from './projects'
import { mapStorageError } from './storage'

/** The image never changes, so CDNs and crawlers may keep it for a year. */
const IMMUTABLE_CACHE_SECONDS = '31536000'

export interface CreateShareInput {
  /** The project the art comes from (null for a draft whose save failed). */
  projectId: string | null
  cols: number
  rows: number
  /** The social card JPEG (`renderShareCard`). */
  image: Blob
}

/** Create a share; returns its id (`/s/<id>`). */
export async function createShare({ projectId, cols, rows, image }: CreateShareInput): Promise<string> {
  const ownerId = await currentUserId()
  const id = shareIdFromBytes(crypto.getRandomValues(new Uint8Array(SHARE_ID_LENGTH)))

  const { error } = await getSupabase()
    .from('shares')
    .insert({ id, owner_id: ownerId, project_id: projectId, grid_cols: cols, grid_rows: rows })
  if (error) throw toProjectError(error)

  const { error: uploadError } = await getSupabase()
    .storage.from(SHARE_IMAGES_BUCKET)
    .upload(shareImageObject(id), image, { contentType: 'image/jpeg', upsert: false, cacheControl: IMMUTABLE_CACHE_SECONDS })
  if (uploadError) throw mapStorageError(uploadError)
  return id
}
