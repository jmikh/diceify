// The anonymous draft: the document + name in localStorage, the image Blob in IndexedDB (idb-keyval).
// Drafts exist only while no project is current; a signed-in user's work lives in the project row.
//
// Legacy keys (pre-C3: `editorState` = `{ doc, name }` or an even older flat snapshot, `editorImage` = data URL,
// `editorBuildProgress`) are migrated on first read and removed. Every storage access is best effort: a private
// window or a full quota degrades to "no draft", never to a thrown error in the editor. A quota/private-window write
// failure is expected (warn); corrupt data and IndexedDB failures are reported.

import { del, get, set } from 'idb-keyval'
import { DocumentError, migrateDocument, type ProjectDocument } from '@/core/dice'
import { reportError } from '@/lib/report-error'

export const DRAFT_KEY = 'diceify.draft'
export const DRAFT_IMAGE_KEY = 'diceify.draftImage'

const LEGACY_STATE_KEY = 'editorState'
const LEGACY_IMAGE_KEY = 'editorImage'
const LEGACY_PROGRESS_KEY = 'editorBuildProgress'

export interface Draft {
  doc: ProjectDocument
  name: string
  savedAt: string
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`[draft] could not write ${key}:`, error)
    return false
  }
}

function storageRemove(...keys: string[]): void {
  for (const key of keys) {
    try {
      localStorage.removeItem(key)
    } catch {
      // nothing to remove
    }
  }
}

/** `{ doc, name, savedAt }` under the new key, or a legacy `{ doc, name }` / flat snapshot. Throws on garbage. */
function parseDraft(raw: string, fallbackName: string): Omit<Draft, 'savedAt'> & { savedAt: string | null } {
  const parsed = JSON.parse(raw) as Record<string, unknown>
  if (parsed.doc && typeof parsed.doc === 'object') {
    return { doc: migrateDocument(parsed.doc), name: str(parsed.name) ?? fallbackName, savedAt: str(parsed.savedAt) }
  }
  // Oldest shape: the snapshot itself, progress possibly in its own key
  if (!parsed.buildProgress) {
    const progress = storageGet(LEGACY_PROGRESS_KEY)
    if (progress) parsed.buildProgress = JSON.parse(progress)
  }
  return { doc: migrateDocument(parsed), name: str(parsed.name) ?? str(parsed.projectName) ?? fallbackName, savedAt: null }
}

/**
 * The stored draft, migrating the legacy keys on the way. Corrupt or unreadable data is reported and dropped.
 * `fallbackName` names a legacy draft that carried none.
 */
export function readDraft(fallbackName = 'Untitled Project'): Draft | null {
  const current = storageGet(DRAFT_KEY)
  const legacy = current ? null : storageGet(LEGACY_STATE_KEY)
  const raw = current ?? legacy
  if (!raw) return null
  try {
    const parsed = parseDraft(raw, fallbackName)
    const draft: Draft = { doc: parsed.doc, name: parsed.name, savedAt: parsed.savedAt ?? new Date().toISOString() }
    if (legacy) {
      storageSet(DRAFT_KEY, JSON.stringify(draft))
      storageRemove(LEGACY_STATE_KEY, LEGACY_PROGRESS_KEY)
    }
    return draft
  } catch (error) {
    const reason = error instanceof DocumentError ? error.message : 'corrupt JSON'
    reportError(error, { where: 'draft-parse', extra: { reason, legacy: legacy !== null } })
    storageRemove(DRAFT_KEY, LEGACY_STATE_KEY, LEGACY_PROGRESS_KEY)
    return null
  }
}

export function writeDraft(doc: ProjectDocument, name: string): void {
  const draft: Draft = { doc, name, savedAt: new Date().toISOString() }
  storageSet(DRAFT_KEY, JSON.stringify(draft))
}

/** The draft image; a legacy data URL is converted to a Blob, stored in IndexedDB and removed from localStorage. */
export async function readDraftImage(): Promise<Blob | null> {
  try {
    const stored = await get<Blob>(DRAFT_IMAGE_KEY)
    if (stored) return stored
  } catch (error) {
    reportError(error, { where: 'draft-idb', extra: { op: 'read' } })
  }
  const legacy = storageGet(LEGACY_IMAGE_KEY)
  if (!legacy) return null
  try {
    const blob = await (await fetch(legacy)).blob()
    await writeDraftImage(blob)
    storageRemove(LEGACY_IMAGE_KEY)
    return blob
  } catch (error) {
    reportError(error, { where: 'draft-migrate' })
    storageRemove(LEGACY_IMAGE_KEY)
    return null
  }
}

export async function writeDraftImage(blob: Blob): Promise<void> {
  try {
    await set(DRAFT_IMAGE_KEY, blob)
  } catch (error) {
    reportError(error, { where: 'draft-idb', extra: { op: 'write' } })
  }
}

/** Remove the draft (after it became a project, or on reset), legacy keys included. */
export async function clearDraft(): Promise<void> {
  storageRemove(DRAFT_KEY, LEGACY_STATE_KEY, LEGACY_IMAGE_KEY, LEGACY_PROGRESS_KEY)
  try {
    await del(DRAFT_IMAGE_KEY)
  } catch {
    // nothing stored
  }
}
