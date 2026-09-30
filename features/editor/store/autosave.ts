// The single persistence pipeline for the editor (see plans/revamp/revamp-step-C3.md → "Autosave").
//
// Everything that persists except the image is the document plus the name. `hooks/useAutosave` subscribes to the
// stores it is composed from; whenever the snapshot changes it is saved whole after a short debounce:
//   - a project is current  → compare-and-set save of the row (conflict → reload the server's version + toast)
//   - no project             → the local draft (doc in localStorage; the image was stored at upload time)
// One save runs at a time; a change during a save queues exactly one more run.

import { toast } from 'sonner'
import { documentStats, type ProjectDocument } from '@/core/dice'
import { reportError } from '@/lib/report-error'
import { patchProjectKeepalive } from '@/lib/supabase/keepalive'
import { documentJson, listProjects, saveProject, type ProjectRecord } from '@/lib/supabase/projects'
import { writeDraft, writeDraftImage } from './draft'
import { clearProject } from './editor'
import { buildDocument, replaceDocument, useDocumentStore } from './useDocumentStore'
import { useEditorUiStore } from './useEditorUiStore'
import { useProjectStore } from './useProjectStore'

export const AUTOSAVE_DEBOUNCE_MS = 1500

export interface Snapshot {
  doc: ProjectDocument
  name: string
}

export type SavePlan = 'skip' | 'draft' | 'cloud'

export interface SaveContext {
  boot: 'booting' | 'ready'
  projectId: string | null
  hasImage: boolean
  changed: boolean
}

/** Where a snapshot goes. Pure: a project is always the sink when current; a draft needs an image to be worth keeping. */
export function planSave({ boot, projectId, hasImage, changed }: SaveContext): SavePlan {
  if (boot !== 'ready' || !changed) return 'skip'
  if (projectId) return 'cloud'
  return hasImage ? 'draft' : 'skip'
}

export function snapshot(): Snapshot {
  return { doc: buildDocument(), name: useDocumentStore.getState().name }
}

let lastSavedJson: string | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let inFlight: Promise<void> | null = null
let pending = false
let accessToken: string | null = null

/** Kept current by `useAutosave` from the auth events; the keepalive flush cannot await the auth lock. */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function context(json: string): SaveContext {
  const project = useProjectStore.getState()
  return { boot: project.boot, projectId: project.projectId, hasImage: project.imageBlob !== null, changed: json !== lastSavedJson }
}

/** The current state counts as saved (after a load/hydrate, so it is not written straight back). */
export function markClean(): void {
  lastSavedJson = JSON.stringify(snapshot())
  clearTimer()
  const project = useProjectStore.getState()
  if (project.saveStatus === 'dirty') project.setSaveStatus('idle')
}

/** Store subscriber: schedule a save when the snapshot differs from the last saved one. */
export function scheduleSave(): void {
  const json = JSON.stringify(snapshot())
  const plan = planSave(context(json))
  if (plan === 'skip') return
  if (plan === 'cloud') useProjectStore.getState().setSaveStatus('dirty')
  clearTimer()
  timer = setTimeout(() => {
    timer = null
    void persist()
  }, AUTOSAVE_DEBOUNCE_MS)
}

async function applyConflict(projectId: string, conflict: ProjectRecord | null): Promise<void> {
  const project = useProjectStore.getState()
  if (conflict) {
    replaceDocument(conflict.document, conflict.name)
    useEditorUiStore.getState().setStep(conflict.document.step)
    project.setCloudVersion(conflict.cloudVersion)
    project.setLastSaved(new Date(conflict.updatedAt))
    project.setSaveStatus('saved')
    markClean()
    toast('This project was changed elsewhere. Reloaded the latest version.')
    return
  }
  // Deleted elsewhere: keep the work as a local draft (its image is still in memory)
  clearProject()
  if (project.imageBlob) await writeDraftImage(project.imageBlob)
  const snap = snapshot()
  writeDraft(snap.doc, snap.name)
  lastSavedJson = JSON.stringify(snap)
  toast.error('This project was deleted elsewhere. Your work is kept as a local draft.')
  listProjects()
    .then((projects) => useProjectStore.getState().setProjects(projects.filter((p) => p.id !== projectId)))
    .catch(() => {})
}

async function saveToCloud(projectId: string, snap: Snapshot, json: string): Promise<void> {
  const project = useProjectStore.getState()
  const expectedVersion = project.cloudVersion
  if (expectedVersion === null) {
    reportError(new Error('project without a cloud version; not saving'), { where: 'autosave-invariant', extra: { projectId } })
    return
  }
  project.setSaveStatus('saving')
  try {
    const result = await saveProject(projectId, { name: snap.name, document: snap.doc, expectedVersion })
    // Switched away while saving: the result belongs to a project that is no longer current
    if (useProjectStore.getState().projectId !== projectId) return
    if (result.ok) {
      const current = useProjectStore.getState()
      current.setCloudVersion(result.cloudVersion)
      current.setLastSaved(new Date())
      current.setSaveStatus('saved')
      lastSavedJson = json
      return
    }
    await applyConflict(projectId, result.conflict)
  } catch (error) {
    reportError(error, { where: 'autosave-save', extra: { projectId } })
    if (useProjectStore.getState().projectId === projectId) useProjectStore.getState().setSaveStatus('error')
    // lastSavedJson unchanged: the next change (or flush) retries
  }
}

/** Save now if anything changed. Serialised: a call during a save queues one more run after it. */
export function persist(): Promise<void> {
  if (inFlight) {
    pending = true
    return inFlight
  }
  const snap = snapshot()
  const json = JSON.stringify(snap)
  const plan = planSave(context(json))
  if (plan === 'skip') return Promise.resolve()
  if (plan === 'draft') {
    writeDraft(snap.doc, snap.name)
    lastSavedJson = json
    return Promise.resolve()
  }
  const projectId = useProjectStore.getState().projectId as string
  inFlight = saveToCloud(projectId, snap, json).finally(() => {
    inFlight = null
    if (pending) {
      pending = false
      void persist()
    }
  })
  return inFlight
}

/** Push pending changes now: on unmount, before the OAuth redirect, before switching or creating a project. */
export async function flushSave(): Promise<void> {
  clearTimer()
  if (inFlight) await inFlight
  await persist()
}

/**
 * Synchronous last-chance save for `pagehide` / `visibilitychange` → hidden. The draft path is synchronous anyway;
 * the cloud path hands a keepalive PATCH to the browser and marks the snapshot saved optimistically. When the page
 * survives (a tab switch), the response updates the version — or, on a CAS miss, invalidates the saved marker so
 * the next ordinary save runs into the conflict path and reloads.
 */
export function flushKeepalive(): void {
  clearTimer()
  const snap = snapshot()
  const json = JSON.stringify(snap)
  const plan = planSave(context(json))
  if (plan === 'skip') return
  if (plan === 'draft') {
    writeDraft(snap.doc, snap.name)
    lastSavedJson = json
    return
  }
  const project = useProjectStore.getState()
  const projectId = project.projectId as string
  const expectedVersion = project.cloudVersion
  if (expectedVersion === null || !accessToken) return
  const { totalDice, completedDice } = documentStats(snap.doc)
  lastSavedJson = json
  patchProjectKeepalive(
    projectId,
    expectedVersion,
    { name: snap.name, document: documentJson(snap.doc), total_dice: totalDice, completed_dice: completedDice },
    accessToken,
  )
    .then((version) => {
      const current = useProjectStore.getState()
      if (current.projectId !== projectId) return
      if (version === null) {
        lastSavedJson = null
        scheduleSave()
        return
      }
      current.setCloudVersion(version)
      current.setLastSaved(new Date())
      current.setSaveStatus('saved')
    })
    .catch((error) => {
      console.warn('[autosave] keepalive save failed:', error)
      if (useProjectStore.getState().projectId === projectId) {
        lastSavedJson = null
        useProjectStore.getState().setSaveStatus('error')
      }
    })
}
