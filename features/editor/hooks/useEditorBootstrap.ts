import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/features/account/useUser'
import { markClean } from '@/features/editor/store/autosave'
import { track } from '@/lib/analytics'
import { reportError } from '@/lib/report-error'
import { takePendingUpload } from '@/lib/pending-upload'
import { readDraft, readDraftImage } from '@/features/editor/store/draft'
import { clearProject, loadDraftIntoEditor, resetEditor } from '@/features/editor/store/editor'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { loadProject, refreshProjects, saveDraftAsProject } from './useProjects'
import { startProjectFromFile } from './useStartProject'

/** Restore the local draft into the stores. False when there is none (a document without its image is no draft). */
async function hydrateDraft(): Promise<boolean> {
  const draft = readDraft(useDocumentStore.getState().name)
  if (!draft) return false
  const blob = await readDraftImage()
  if (!blob) return false
  loadDraftIntoEditor(draft.doc, draft.name, blob)
  return true
}

/**
 * Signed-in arrival: `?project=` is opened; otherwise a waiting draft becomes a project (a failed save keeps it a
 * draft); otherwise the most recent project; none → the Start screen (no image).
 */
async function bootSignedIn(projectParam: string | null): Promise<void> {
  if (projectParam) await loadProject(projectParam)
  const project = useProjectStore.getState()
  if (!project.projectId && project.imageBlob) {
    // Refreshes the list itself
    await saveDraftAsProject(useDocumentStore.getState().name)
    return
  }
  let projects: Awaited<ReturnType<typeof refreshProjects>> = []
  try {
    projects = await refreshProjects()
  } catch (error) {
    reportError(error, { where: 'projects-list' })
    toast.error('Could not load your projects.')
  }
  if (!useProjectStore.getState().projectId && projects.length > 0) await loadProject(projects[0].id)
}

/**
 * A photo parked by the homepage hero (`lib/pending-upload.ts`) starts a project, exactly as the Start screen's
 * dropzone would — unless an anonymous visitor has a draft here (a new photo would silently replace it: the Start
 * screen shows the draft and warns instead), or the arrival asked for a project (`?project=`, never hijacked).
 * The slot was already cleared by `takePendingUpload`, so a reload never replays the photo.
 */
async function applyPendingUpload(file: File, signedIn: boolean, projectParam: string | null): Promise<void> {
  if (projectParam) return
  const anonymousDraft = !signedIn && useProjectStore.getState().imageBlob !== null
  if (anonymousDraft) {
    toast.info('You have an unsaved draft here. Continue it, or choose your new photo again to replace it.')
    return
  }
  await startProjectFromFile(file, signedIn)
}

function editorUrl(projectId: string | null): string {
  return projectId ? `/editor?project=${encodeURIComponent(projectId)}` : '/editor'
}

/**
 * Decides what the editor shows on arrival (plans/revamp/revamp-step-C3.md → "Hooks", G1 → "Arrival"):
 *   anonymous  → a `?project=` is stripped; the local draft is restored (none → the Start screen)
 *   signed in  → the local draft is restored (back from OAuth with `?restored=true`, or left over from a failed save),
 *                then `bootSignedIn`
 *   either     → then a photo parked by the homepage hero starts a project (`applyPendingUpload`)
 * Ends with `markClean()` + `boot = 'ready'`. Afterwards `?project=` follows the current project id.
 */
export function useEditorBootstrap() {
  const { status } = useUser()
  const router = useRouter()
  const startedRef = useRef(false)

  useEffect(() => {
    if (status === 'loading' || startedRef.current) return
    startedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const projectParam = params.get('project')

    const boot = async () => {
      const signedIn = status === 'authed'
      // Taken first (and thereby cleared) so it is consumed exactly once, whatever the rest of the boot decides
      const pending = await takePendingUpload()
      // A draft is offered to a signed-in user too (not only on `?restored=true`): it exists after sign-in and
      // after a failed "save as project" (plan limit, offline), and opening a project would discard it.
      await hydrateDraft()
      if (signedIn) await bootSignedIn(projectParam)
      markClean()
      // `restored` describes what was already here; the parked photo then reports itself as `photo_uploaded`
      track('editor_opened', { signed_in: signedIn, restored: useProjectStore.getState().imageBlob !== null })
      if (pending) await applyPendingUpload(pending, signedIn, projectParam)
      useProjectStore.getState().setBoot('ready')
      // Whatever the arrival URL said, it now reflects the outcome (strips ?restored and a stale ?project)
      router.replace(editorUrl(useProjectStore.getState().projectId), { scroll: false })
    }
    void boot()
  }, [status, router])

  // After boot, the URL follows the current project (switch, create, delete, "new project")
  const projectId = useProjectStore((state) => state.projectId)
  const boot = useProjectStore((state) => state.boot)
  useEffect(() => {
    if (boot !== 'ready') return
    const expected = editorUrl(projectId)
    if (window.location.pathname + window.location.search !== expected) router.replace(expected, { scroll: false })
  }, [boot, projectId, router])

  // Signing out while a project is open: the row is no longer ours to save; back to an empty editor
  useEffect(() => {
    if (boot !== 'ready' || status !== 'anon' || !projectId) return
    clearProject()
    resetEditor()
    useProjectStore.getState().setProjects([])
    markClean()
  }, [boot, status, projectId])
}
