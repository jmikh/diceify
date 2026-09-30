import { useEffect } from 'react'
import { documentStats, migrateDocument, type ProjectDocument } from '@/core/dice'
import { buildDocument, replaceDocument, useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { devLog, devError } from '@/lib/utils/debug'

// ---------------------------------------------------------------------------
// Single persistence pipeline for the editor.
//
// Everything that persists (except the image) is the project document plus
// the name. Subscribers watch the stores it is composed from; whenever the
// snapshot changes it is saved whole after a short debounce:
//   - a project is loaded  -> PATCH /api/projects/[id]  (DB, legacy columns)
//   - no project (anon)    -> localStorage              (draft)
// The image is large, changes only on upload, and is saved separately via
// persistImage(). A project can only exist for a logged-in user, so the
// presence of projectId is the whole sink decision.
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 1500

// localStorage keys for the anonymous draft (C3 migrates them)
const DRAFT_KEY = 'editorState'
const DRAFT_IMAGE_KEY = 'editorImage'
const LEGACY_PROGRESS_KEY = 'editorBuildProgress'

interface Snapshot {
    doc: ProjectDocument
    name: string
}

function buildSnapshot(): Snapshot {
    return { doc: buildDocument(), name: useDocumentStore.getState().name }
}

// Map the document onto the legacy Project columns (the inverse of core's
// fromLegacyProjectRow; percentComplete is derived server-side)
function toLegacyProjectFields({ doc, name }: Snapshot) {
    const { crop, dice, grid, buildProgress } = doc
    const { totalDice, completedDice } = documentStats(doc)
    return {
        name,
        numRows: dice.numRows,
        colorMode: dice.colorMode,
        contrast: dice.contrast,
        gamma: dice.gamma,
        edgeSharpening: dice.edgeSharpening,
        rotate2: dice.rotate2,
        rotate3: dice.rotate3,
        rotate6: dice.rotate6,
        cropX: crop?.x ?? null,
        cropY: crop?.y ?? null,
        cropWidth: crop?.width ?? null,
        cropHeight: crop?.height ?? null,
        cropRotation: crop?.rotation ?? 0,
        gridWidth: grid?.width ?? null,
        gridHeight: grid?.height ?? null,
        totalDice,
        currentX: buildProgress.x,
        currentY: buildProgress.y,
        completedDice,
    }
}

// Current state as Project columns — for POST /api/projects (create-from-draft)
export function buildProjectPayload() {
    return toLegacyProjectFields(buildSnapshot())
}

let lastSavedJson: string | null = null
let timer: ReturnType<typeof setTimeout> | null = null

// Mark the current store state as clean (call after hydrating/loading so the
// autosave doesn't immediately write back what was just read).
export function markSnapshotClean() {
    lastSavedJson = JSON.stringify(buildSnapshot())
    if (timer) {
        clearTimeout(timer)
        timer = null
    }
    const project = useProjectStore.getState()
    if (project.saveStatus === 'dirty') project.setSaveStatus('idle')
}

async function persist(options?: { beacon?: boolean }) {
    const snap = buildSnapshot()
    const json = JSON.stringify(snap)
    if (json === lastSavedJson) return
    lastSavedJson = json

    const project = useProjectStore.getState()
    if (project.projectId) {
        const payload = JSON.stringify(toLegacyProjectFields(snap))
        if (options?.beacon) {
            navigator.sendBeacon(`/api/projects/${project.projectId}`, payload)
            return
        }
        project.setSaveStatus('saving')
        try {
            const response = await fetch(`/api/projects/${project.projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            })
            if (response.ok) {
                project.setLastSaved(new Date())
                project.setSaveStatus('saved')
            } else {
                lastSavedJson = null // retry on next change/flush
                project.setSaveStatus('error')
            }
        } catch (error) {
            devError('[AUTOSAVE] Failed to save project:', error)
            lastSavedJson = null
            project.setSaveStatus('error')
        }
    } else if (project.imageSrc || snap.doc.crop) {
        // Anonymous draft. The guard keeps an empty editor from clobbering a
        // previously saved draft.
        try {
            localStorage.setItem(DRAFT_KEY, json)
        } catch (error) {
            devError('[AUTOSAVE] Failed to save local draft:', error)
        }
    }
}

// Save any pending changes now. Use { beacon: true } from unload handlers.
export function flushSave(options?: { beacon?: boolean }) {
    if (timer) {
        clearTimeout(timer)
        timer = null
    }
    return persist(options)
}

// The image is saved once per upload, not on every state change.
export async function persistImage(image: string) {
    const project = useProjectStore.getState()
    if (project.projectId) {
        project.setSaveStatus('saving')
        try {
            const response = await fetch(`/api/projects/${project.projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalImage: image }),
            })
            if (response.ok) {
                project.setLastSaved(new Date())
                project.setSaveStatus('saved')
            } else {
                project.setSaveStatus('error')
            }
        } catch (error) {
            devError('[AUTOSAVE] Failed to save image:', error)
            project.setSaveStatus('error')
        }
    } else {
        try {
            localStorage.setItem(DRAFT_IMAGE_KEY, image)
        } catch (error) {
            devError('[AUTOSAVE] Failed to store draft image (quota?):', error)
        }
    }
}

// Remove the anonymous draft (after it has been loaded into a project, or on reset)
export function clearLocalDraft() {
    localStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(DRAFT_IMAGE_KEY)
    localStorage.removeItem(LEGACY_PROGRESS_KEY)
}

// Parse the stored draft: the current `{ doc, name }` shape or a legacy
// snapshot (which `migrateDocument` understands, once the even older
// separate progress key is merged in). Throws on garbage.
function readLocalDraft(raw: string): Snapshot & { image: string | null } {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const str = (v: unknown) => (typeof v === 'string' ? v : null)
    // Legacy drafts embedded the image in the snapshot; new ones store it separately
    const image = localStorage.getItem(DRAFT_IMAGE_KEY) || str(parsed.originalImage)
    const fallbackName = useDocumentStore.getState().name
    if (parsed.doc && typeof parsed.doc === 'object') {
        return { doc: migrateDocument(parsed.doc), name: str(parsed.name) ?? fallbackName, image }
    }
    if (!parsed.buildProgress) {
        const legacy = localStorage.getItem(LEGACY_PROGRESS_KEY)
        if (legacy) parsed.buildProgress = JSON.parse(legacy)
    }
    return { doc: migrateDocument(parsed), name: str(parsed.name) ?? str(parsed.projectName) ?? fallbackName, image }
}

// Restore the anonymous draft into the stores. Returns true if anything was restored.
// Used both on plain page load (anonymous) and after the OAuth redirect.
export function hydrateFromLocalDraft(): boolean {
    let snap: ReturnType<typeof readLocalDraft>
    try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return false
        snap = readLocalDraft(raw)
    } catch (error) {
        devError('[AUTOSAVE] Failed to read local draft:', error)
        return false
    }
    // A document without its image cannot be shown (the crop step would be empty)
    if (!snap.image) return false

    replaceDocument(snap.doc, snap.name)
    useProjectStore.getState().setImageSrc(snap.image)
    useEditorUiStore.getState().setStep(snap.doc.step)

    // The cropped pixels / grid are derived state that the dice pipeline
    // (useDiceGeneration) regenerates automatically

    devLog('[AUTOSAVE] Restored local draft')
    markSnapshotClean()
    return true
}

// Mount once (in the editor page). Watches the stores and persists on change.
export function useAutosave() {
    useEffect(() => {
        const check = () => {
            const project = useProjectStore.getState()
            if (project.boot !== 'ready') return
            const json = JSON.stringify(buildSnapshot())
            if (json === lastSavedJson) return
            if (project.projectId) project.setSaveStatus('dirty')
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                timer = null
                persist()
            }, DEBOUNCE_MS)
        }

        const unsubscribers = [
            useDocumentStore.subscribe(check),
            useEditorUiStore.subscribe((state) => state.step, check),
            useDerivedStore.subscribe((state) => state.gridSize, check),
        ]

        const handleBeforeUnload = () => flushSave({ beacon: true })
        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe())
            window.removeEventListener('beforeunload', handleBeforeUnload)
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
        }
    }, [])
}
