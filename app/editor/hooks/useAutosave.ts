import { useEffect } from 'react'
import { useEditorStore, matchesBuildBaseline } from '@/lib/store/useEditorStore'
import { cropImage } from '@/lib/utils/image'
import { devLog, devError } from '@/lib/utils/debug'

// ---------------------------------------------------------------------------
// Single persistence pipeline for the editor.
//
// Everything that persists (except the image) fits in one tiny snapshot.
// One subscriber watches the store; whenever the snapshot changes it saves
// the whole thing after a short debounce:
//   - a project is loaded  -> PATCH /api/projects/[id]  (DB)
//   - no project (anon)    -> localStorage              (draft)
// The image is large, changes only on upload, and is saved separately via
// persistImage(). A project can only exist for a logged-in user, so the
// presence of currentProjectId is the whole sink decision.
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 1500

// localStorage keys for the anonymous draft
const DRAFT_KEY = 'editorState'
const DRAFT_IMAGE_KEY = 'editorImage'
const LEGACY_PROGRESS_KEY = 'editorBuildProgress'

function buildSnapshot(state = useEditorStore.getState()) {
    // Progress is only valid for the params it was built against. If the user
    // changed crop/tune params and hasn't re-entered the build step yet, the
    // in-store progress is stale for these params — persist 0 so a reload
    // never lands on the wrong die of a regenerated grid.
    const progressApplies = matchesBuildBaseline(state)
    return {
        name: state.projectName,
        step: state.step,
        cropParams: state.cropParams,
        diceParams: state.diceParams,
        buildProgress: progressApplies
            ? { x: state.buildProgress.x, y: state.buildProgress.y }
            : { x: 0, y: 0 },
        gridWidth: state.diceGrid?.width ?? null,
        gridHeight: state.diceGrid?.height ?? null,
        totalDice: state.diceStats.totalCount,
    }
}

type Snapshot = ReturnType<typeof buildSnapshot>

// Map the snapshot onto Project columns (percentComplete is derived server-side)
function toProjectFields(snap: Snapshot) {
    return {
        name: snap.name,
        numRows: snap.diceParams.numRows,
        colorMode: snap.diceParams.colorMode,
        contrast: snap.diceParams.contrast,
        gamma: snap.diceParams.gamma,
        edgeSharpening: snap.diceParams.edgeSharpening,
        rotate2: snap.diceParams.rotate2,
        rotate3: snap.diceParams.rotate3,
        rotate6: snap.diceParams.rotate6,
        cropX: snap.cropParams?.x ?? null,
        cropY: snap.cropParams?.y ?? null,
        cropWidth: snap.cropParams?.width ?? null,
        cropHeight: snap.cropParams?.height ?? null,
        cropRotation: snap.cropParams?.rotation ?? 0,
        gridWidth: snap.gridWidth,
        gridHeight: snap.gridHeight,
        totalDice: snap.totalDice,
        currentX: snap.buildProgress.x,
        currentY: snap.buildProgress.y,
        completedDice: snap.buildProgress.y * (snap.gridWidth ?? 0) + snap.buildProgress.x,
    }
}

// Current state as Project columns — for POST /api/projects (create-from-draft)
export function buildProjectPayload() {
    return toProjectFields(buildSnapshot())
}

let lastSavedJson: string | null = null
let timer: ReturnType<typeof setTimeout> | null = null

// Mark the current store state as clean (call after hydrating/loading so the
// autosave doesn't immediately write back what was just read).
export function markSnapshotClean() {
    lastSavedJson = JSON.stringify(buildSnapshot())
}

async function persist(options?: { beacon?: boolean }) {
    const state = useEditorStore.getState()
    const snap = buildSnapshot(state)
    const json = JSON.stringify(snap)
    if (json === lastSavedJson) return
    lastSavedJson = json

    if (state.currentProjectId) {
        const payload = JSON.stringify(toProjectFields(snap))
        if (options?.beacon) {
            navigator.sendBeacon(`/api/projects/${state.currentProjectId}`, payload)
            return
        }
        state.setIsSaving(true)
        try {
            const response = await fetch(`/api/projects/${state.currentProjectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            })
            if (response.ok) {
                state.setLastSaved(new Date())
            } else {
                lastSavedJson = null // retry on next change/flush
            }
        } catch (error) {
            devError('[AUTOSAVE] Failed to save project:', error)
            lastSavedJson = null
        } finally {
            state.setIsSaving(false)
        }
    } else if (state.originalImage || state.cropParams) {
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
    const { currentProjectId, setLastSaved, setIsSaving } = useEditorStore.getState()
    if (currentProjectId) {
        setIsSaving(true)
        try {
            const response = await fetch(`/api/projects/${currentProjectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalImage: image }),
            })
            if (response.ok) setLastSaved(new Date())
        } catch (error) {
            devError('[AUTOSAVE] Failed to save image:', error)
        } finally {
            setIsSaving(false)
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

// Restore the anonymous draft into the store. Returns true if anything was restored.
// Used both on plain page load (anonymous) and after the OAuth redirect.
export function hydrateFromLocalDraft(): boolean {
    let snap: any
    try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return false
        snap = JSON.parse(raw)
    } catch (error) {
        devError('[AUTOSAVE] Failed to parse local draft:', error)
        return false
    }

    // Legacy drafts embedded the image in the snapshot; new ones store it separately
    const image = localStorage.getItem(DRAFT_IMAGE_KEY) || snap.originalImage || null
    if (!image && !snap.cropParams) return false

    const store = useEditorStore.getState()
    if (image) store.setOriginalImage(image)
    if (snap.cropParams) {
        store.setCropParams(snap.cropParams)
        // Keep the cropper widget's rotation in sync with the restored params
        store.setCropRotation(snap.cropParams.rotation || 0)
    }
    if (snap.diceParams) store.setDiceParams(snap.diceParams)
    if (snap.name || snap.projectName) store.setProjectName(snap.name || snap.projectName)
    if (snap.step) store.setStep(snap.step)
    if (snap.totalDice) {
        // Black/white split is recomputed when the grid regenerates
        store.setDiceStats({ blackCount: 0, whiteCount: 0, totalCount: snap.totalDice })
    }
    // The restored progress belongs to the restored params
    store.setBuildBaseline()

    // Legacy drafts kept progress under its own key
    let progress = snap.buildProgress
    if (!progress) {
        try {
            const legacy = localStorage.getItem(LEGACY_PROGRESS_KEY)
            if (legacy) progress = JSON.parse(legacy)
        } catch { /* ignore */ }
    }
    if (progress) store.setBuildProgress({ x: progress.x || 0, y: progress.y || 0 })

    // The cropped image is derived state — regenerate it for tune/build steps
    if (image && snap.cropParams && (snap.step === 'tune' || snap.step === 'build')) {
        cropImage(image, snap.cropParams)
            .then(store.setCroppedImage)
            .catch(err => devError('[AUTOSAVE] Failed to regenerate crop:', err))
    }

    devLog('[AUTOSAVE] Restored local draft')
    markSnapshotClean()
    return true
}

// Mount once (in the editor page). Watches the store and persists on change.
export function useAutosave() {
    useEffect(() => {
        const unsubscribe = useEditorStore.subscribe((state) => {
            if (state.isInitializing) return
            const json = JSON.stringify(buildSnapshot(state))
            if (json === lastSavedJson) return
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                timer = null
                persist()
            }, DEBOUNCE_MS)
        })

        const handleBeforeUnload = () => flushSave({ beacon: true })
        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            unsubscribe()
            window.removeEventListener('beforeunload', handleBeforeUnload)
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
        }
    }, [])
}
