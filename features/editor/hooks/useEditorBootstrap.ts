import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/features/account/useUser'
import { markClean } from '@/features/editor/store/autosave'
import { reportError } from '@/lib/report-error'
import { readDraft, readDraftImage } from '@/features/editor/store/draft'
import { clearProject, loadDraftIntoEditor, resetEditor } from '@/features/editor/store/editor'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { loadProject, refreshProjects } from './useProjects'

/** Restore the local draft into the stores. False when there is none (a document without its image is no draft). */
async function hydrateDraft(): Promise<boolean> {
  const draft = readDraft(useDocumentStore.getState().name)
  if (!draft) return false
  const blob = await readDraftImage()
  if (!blob) return false
  loadDraftIntoEditor(draft.doc, draft.name, blob)
  return true
}

function editorUrl(projectId: string | null): string {
  return projectId ? `/editor?project=${encodeURIComponent(projectId)}` : '/editor'
}

/**
 * Decides what the editor shows on arrival (plans/revamp/revamp-step-C3.md → "Hooks"):
 *   anonymous  → a `?project=` is stripped; the local draft is restored
 *   signed in  → the local draft is restored (back from OAuth with `?restored=true`, or left over from a failed save);
 *                `?project=` is opened (or reported and stripped); otherwise the list decides: a draft to save →
 *                projects modal, else the most recent project, else the modal
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
      // A draft is offered to a signed-in user too (not only on `?restored=true`): it exists after sign-in and
      // after a failed "save as project" (plan limit, offline), and opening a project would discard it.
      await hydrateDraft()
      if (status === 'authed') {
        if (projectParam) await loadProject(projectParam)
        if (!useProjectStore.getState().projectId) {
          let projects: Awaited<ReturnType<typeof refreshProjects>> = []
          try {
            projects = await refreshProjects()
          } catch (error) {
            reportError(error, { where: 'projects-list' })
            toast.error('Could not load your projects.')
          }
          const hasDraft = useProjectStore.getState().imageBlob !== null
          if (!hasDraft && projects.length > 0) await loadProject(projects[0].id)
          if (!useProjectStore.getState().projectId) useEditorUiStore.getState().openModal('projects')
        } else {
          refreshProjects().catch((error) => reportError(error, { where: 'projects-list' }))
        }
      }
      markClean()
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
