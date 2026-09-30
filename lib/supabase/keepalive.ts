// Last-chance save when the page is going away (`pagehide` / `visibilitychange` → hidden). supabase-js has no
// `keepalive` option, so this is the same PostgREST compare-and-set as `saveProject`, issued as a raw fetch the
// browser keeps alive after unload. Used only by the autosave flush; everything else goes through projects.ts.

import type { ProjectDocument } from '@/core/dice'
import { publicEnv } from '@/lib/env.public'
import type { Json } from './database.types'

export interface KeepaliveBody {
  name: string
  document: Json | ProjectDocument
  total_dice: number
  completed_dice: number
}

/**
 * PATCH `projects` where `id` and `cloud_version` match. Resolves with the new `cloud_version` when the page is
 * still alive to see the response, `null` when the compare-and-set missed (someone else saved first) — after an
 * unload the promise simply never settles, which is fine: the request was already handed to the network stack.
 */
export async function patchProjectKeepalive(
  id: string,
  expectedVersion: number,
  body: KeepaliveBody,
  accessToken: string,
): Promise<number | null> {
  const url = `${publicEnv.supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(id)}&cloud_version=eq.${expectedVersion}&select=cloud_version`
  const response = await fetch(url, {
    method: 'PATCH',
    keepalive: true,
    headers: {
      apikey: publicEnv.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`keepalive save failed: HTTP ${response.status}`)
  const rows = (await response.json()) as Array<{ cloud_version: number }>
  return rows[0]?.cloud_version ?? null
}
