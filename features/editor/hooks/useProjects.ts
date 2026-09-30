import { useCallback } from 'react'
import { toast } from 'sonner'
import { DocumentError } from '@/core/dice'
import { useUser } from '@/features/account/useUser'
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  ProjectLimitError,
  type ProjectSummary,
} from '@/lib/supabase/projects'
import { downloadProjectImage } from '@/lib/supabase/storage'
import { reportError } from '@/lib/report-error'
import { flushSave, markClean } from '@/features/editor/store/autosave'
import { clearDraft } from '@/features/editor/store/draft'
import { clearProject, loadProjectIntoEditor, resetEditor } from '@/features/editor/store/editor'
import { buildDocument, DEFAULT_PROJECT_NAME, useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'

const message = (error: unknown) => (error instanceof Error && error.message ? error.message : String(error))

/** Refresh the list into the store; returns it. Throws on failure (callers decide whether to toast). */
export async function refreshProjects(): Promise<ProjectSummary[]> {
  const projects = await listProjects()
  useProjectStore.getState().setProjects(projects)
  return projects
}

/**
 * Open a project: pending changes to the current one are flushed first, then row + image are loaded.
 * Returns false (after a toast) when the project cannot be opened; the editor is left as it was.
 */
export async function loadProject(id: string): Promise<boolean> {
  await flushSave()
  try {
    const record = await getProject(id)
    if (!record) {
      toast.error('Project not found.')
      return false
    }
    const blob = await downloadProjectImage(record.imagePath)
    loadProjectIntoEditor(record, blob)
    markClean()
    useEditorUiStore.getState().closeModal()
    // The draft has served its purpose once a project is current
    void clearDraft()
    return true
  } catch (error) {
    reportError(error, { where: 'projects-load', extra: { id } })
    toast.error(error instanceof DocumentError ? "This project's data could not be read." : `Could not open the project (${message(error)}).`)
    return false
  }
}

/**
 * Project actions for the UI (signed-in users only; the anonymous editor never calls these).
 * Every failure is a toast; the plan limit re-opens the projects modal, whose capacity banner is the limit UI.
 */
export function useProjects() {
  const userId = useUser().user?.id
  const projects = useProjectStore((state) => state.projects)

  const refresh = useCallback(async () => {
    try {
      return await refreshProjects()
    } catch (error) {
      reportError(error, { where: 'projects-list' })
      toast.error(`Could not load your projects (${message(error)}).`)
      return useProjectStore.getState().projects
    }
  }, [])

  const load = useCallback((id: string) => loadProject(id), [])

  /** The current draft (image + document) becomes a project: upload, insert, switch the autosave to the row. */
  const createFromDraft = useCallback(
    async (name: string): Promise<boolean> => {
      const { imageBlob, projectId } = useProjectStore.getState()
      if (!userId || !imageBlob || projectId) return false
      await flushSave()
      try {
        useDocumentStore.getState().setName(name)
        const record = await createProject({ name, document: buildDocument(), imageBlob })
        const project = useProjectStore.getState()
        project.setProjectId(record.id)
        project.setCloudVersion(record.cloudVersion)
        project.setLastSaved(new Date(record.updatedAt))
        project.setSaveStatus('saved')
        markClean()
        useEditorUiStore.getState().closeModal()
        void clearDraft()
        await refresh()
        return true
      } catch (error) {
        if (error instanceof ProjectLimitError) {
          const list = await refresh()
          const limit = error.limit ?? list.length
          toast.error(`Project limit reached (${error.current ?? list.length}/${limit}). Delete a project to save this one.`)
          useEditorUiStore.getState().openModal('projects')
          return false
        }
        reportError(error, { where: 'projects-create' })
        toast.error(`Could not save the project (${message(error)}).`)
        return false
      }
    },
    [userId, refresh],
  )

  /** Detach from the current project and start over on the upload step; the next upload creates the project. */
  const startNewProject = useCallback(async (name: string = DEFAULT_PROJECT_NAME) => {
    await flushSave()
    clearProject()
    resetEditor(name)
    markClean()
    useEditorUiStore.getState().closeModal()
  }, [])

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return
      try {
        await deleteProject(id)
      } catch (error) {
        reportError(error, { where: 'projects-remove', extra: { id } })
        toast.error(`Could not delete the project (${message(error)}).`)
        return
      }
      if (useProjectStore.getState().projectId === id) {
        clearProject()
        resetEditor()
        markClean()
      }
      await refresh()
    },
    [userId, refresh],
  )

  return { projects, refresh, load, createFromDraft, startNewProject, remove }
}
