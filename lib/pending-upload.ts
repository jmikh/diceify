// The hand-off from the homepage hero to the editor: a photo dropped on `/` is parked here, `/editor` picks it up at
// boot and starts a project with it (the same path as the Start screen's dropzone).
//
// One slot, in its own IndexedDB database (never the editor draft's `keyval-store`), with a short TTL so a photo
// abandoned mid-navigation does not pop up days later. Reading is destructive (`takePendingUpload`): the photo is
// consumed exactly once. Every access is best effort: a private window or a failing IndexedDB degrades to "nothing
// pending" (reported), never to a thrown error in the UI.

import { createStore, del, get, set, type UseStore } from 'idb-keyval'
import { reportError } from '@/lib/report-error'

export const PENDING_UPLOAD_TTL_MS = 5 * 60 * 1000

const DB_NAME = 'diceify-pending-upload'
const STORE_NAME = 'pending'
const KEY = 'photo'

/** What is stored: the bytes plus what `File` carries, so the editor sees the same file the visitor picked. */
export interface PendingUploadEntry {
  blob: Blob
  name: string
  type: string
  /** `Date.now()` at stash time. */
  savedAt: number
}

/** Whether a stored entry is still worth consuming (not older than the TTL, not from a clock that ran backwards). */
export function isFreshUpload(entry: Pick<PendingUploadEntry, 'savedAt'>, now: number, ttlMs = PENDING_UPLOAD_TTL_MS): boolean {
  const age = now - entry.savedAt
  return age >= 0 && age <= ttlMs
}

/** Loose check on what came out of IndexedDB (another tab, an older build). */
export function isPendingUploadEntry(value: unknown): value is PendingUploadEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.blob instanceof Blob && typeof v.name === 'string' && typeof v.type === 'string' && typeof v.savedAt === 'number'
}

// Created on first use: `createStore` opens the database, which must not run at prerender time (no `indexedDB`).
let store: UseStore | undefined
const getStore = (): UseStore => (store ??= createStore(DB_NAME, STORE_NAME))

/** Park `file` for the editor. False when storage refused (the caller still navigates; the Start screen takes over). */
export async function stashPendingUpload(file: File, now = Date.now()): Promise<boolean> {
  const entry: PendingUploadEntry = { blob: file, name: file.name, type: file.type, savedAt: now }
  try {
    await set(KEY, entry, getStore())
    return true
  } catch (error) {
    reportError(error, { where: 'pending-upload', extra: { op: 'write', type: file.type, size: file.size } })
    return false
  }
}

/**
 * The parked photo as a `File`, or null when there is none, it expired or it cannot be read. The slot is cleared
 * either way, so a second boot (reload, another tab) never sees the same photo.
 */
export async function takePendingUpload(now = Date.now()): Promise<File | null> {
  let stored: unknown
  try {
    stored = await get(KEY, getStore())
  } catch (error) {
    reportError(error, { where: 'pending-upload', extra: { op: 'read' } })
    return null
  }
  if (stored === undefined) return null
  await clearPendingUpload()
  if (!isPendingUploadEntry(stored) || !isFreshUpload(stored, now)) return null
  return new File([stored.blob], stored.name, { type: stored.type })
}

/** Drop whatever is parked (consumed, expired, or the editor arrived with another job). */
export async function clearPendingUpload(): Promise<void> {
  try {
    await del(KEY, getStore())
  } catch {
    // nothing stored, or storage unavailable: nothing to clear
  }
}
