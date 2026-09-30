import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fromLegacyProjectRow, type LegacyProjectRow } from '@/core/dice'
import { useUser } from '@/features/account/useUser'
import { resetEditor } from '@/features/editor/store/editor'
import { replaceDocument, useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore, type ProjectSummary } from '@/features/editor/store/useProjectStore'
import { buildProjectPayload, markSnapshotClean, clearLocalDraft, flushSave } from './useAutosave'
import { devLog, devError } from '@/lib/utils/debug'

/** A full project row from GET /api/projects/[id] (the legacy Prisma columns). */
type ProjectRow = ProjectSummary & LegacyProjectRow & { originalImage?: string | null }

// TODO(C3): the Prisma project routes answer 401 now that NextAuth is gone (lib/api/legacy-auth.ts); every
// call below degrades to "no projects" until C3 moves them to Supabase.
function warnUnavailable(action: string, response: Response) {
    console.warn(`[TODO(C3)] project API unavailable: ${action} → ${response.status}`)
}

export function useProjectManager() {
    const userId = useUser().user?.id
    const router = useRouter()

    const projectId = useProjectStore(state => state.projectId)
    const imageSrc = useProjectStore(state => state.imageSrc)
    const projects = useProjectStore(state => state.projects)

    // Update URL with project ID
    const updateURLWithProject = useCallback((projectId: string | null) => {
        const params = new URLSearchParams(window.location.search)
        if (projectId) {
            params.set('project', projectId)
        } else {
            params.delete('project')
        }
        const newUrl = params.toString() ? `/editor?${params.toString()}` : '/editor'
        router.push(newUrl, { scroll: false })
    }, [router])

    const handleResetWorkflow = useCallback(() => {
        resetEditor()
        clearLocalDraft()
    }, [])

    // Fetch user projects
    const fetchUserProjects = useCallback(async (): Promise<ProjectSummary[]> => {
        if (!userId) return []

        try {
            const response = await fetch('/api/projects')
            if (response.ok) {
                const projects: ProjectSummary[] = await response.json()
                useProjectStore.getState().setProjects(projects)
                return projects
            }
            warnUnavailable('list', response)
        } catch (error) {
            devError('Failed to fetch projects:', error)
        }
        return []
    }, [userId])

    const registerCreatedProject = useCallback(async (project: ProjectSummary) => {
        const store = useProjectStore.getState()
        useDocumentStore.getState().setName(project.name)
        store.setProjectId(project.id)
        updateURLWithProject(project.id)
        store.setLastSaved(new Date())
        useEditorUiStore.getState().closeModal()
        markSnapshotClean()
        await fetchUserProjects()
    }, [updateURLWithProject, fetchUserProjects])

    const postProject = useCallback(async (payload: object): Promise<ProjectSummary | null> => {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (response.status === 403) {
            const data = await response.json()
            alert(data.error || 'Project limit reached.')
            return null
        }
        if (!response.ok) {
            warnUnavailable('create', response)
            return null
        }
        return response.json()
    }, [])

    // Create a new empty project (server defaults fill in the rest)
    const createProject = useCallback(async (name?: string) => {
        if (!userId || !name) return

        // Push pending changes to the current project and detach the autosave
        // from it BEFORE resetting, so the reset can't be saved into it
        await flushSave()
        useProjectStore.getState().setProjectId(null)
        handleResetWorkflow()

        devLog(`[DB] Creating new empty project: ${name}`)
        try {
            const project = await postProject({ name })
            if (project) {
                await registerCreatedProject(project)
                useEditorUiStore.getState().setStep('upload')
            }
        } catch (error) {
            devError('Failed to create project:', error)
        }
    }, [userId, handleResetWorkflow, postProject, registerCreatedProject])

    // Create a project from the current (anonymous draft) state
    const createProjectFromCurrent = useCallback(async (name?: string) => {
        if (!userId) return

        let projectName = name
        if (!projectName) {
            const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase()
            projectName = `Untitled Project ${randomChars}`
        }

        devLog(`[DB] Creating new project with current state: ${projectName}`)
        try {
            const project = await postProject({
                ...buildProjectPayload(),
                name: projectName,
                originalImage: imageSrc,
            })
            if (project) {
                // The draft is cleared by the page effect once projectId is set
                await registerCreatedProject(project)
            }
        } catch (error) {
            devError('Failed to create project:', error)
        }
    }, [userId, imageSrc, postProject, registerCreatedProject])

    // Delete project
    const deleteProject = useCallback(async (id: string) => {
        if (!userId) return

        devLog(`[DB] Deleting project ${id}`)
        try {
            const response = await fetch(`/api/projects/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                await fetchUserProjects()
                // If we deleted the current project, reset the editor
                if (id === projectId) {
                    handleResetWorkflow()
                    useProjectStore.getState().setProjectId(null)
                    updateURLWithProject(null)
                }
            } else {
                warnUnavailable('delete', response)
            }
        } catch (error) {
            devError('Failed to delete project:', error)
        }
    }, [userId, projectId, fetchUserProjects, handleResetWorkflow, updateURLWithProject])

    // Load a project
    const loadProject = useCallback(async (summary: ProjectSummary) => {
        devLog('[CLIENT] Loading project:', summary.name)

        // Always fetch the latest full project data (the list omits large fields)
        let project = summary as ProjectRow
        try {
            const response = await fetch(`/api/projects/${summary.id}`)
            if (response.ok) {
                project = await response.json()
            } else {
                warnUnavailable('load', response)
            }
        } catch (error) {
            devError('Failed to fetch full project:', error)
        }

        let doc
        try {
            doc = fromLegacyProjectRow(project)
        } catch (error) {
            devError('[CLIENT] Project row is not a valid document:', error)
            return
        }

        // The image and the derived grid/preview are regenerated by the dice pipeline
        replaceDocument(doc, project.name)
        const store = useProjectStore.getState()
        store.setImageSrc(project.originalImage ?? null)
        useEditorUiStore.getState().setStep(project.originalImage ? doc.step : 'upload')

        store.setProjectId(project.id)
        updateURLWithProject(project.id)
        if (project.updatedAt) {
            store.setLastSaved(new Date(project.updatedAt))
        }

        // Everything just loaded is by definition saved
        markSnapshotClean()
    }, [updateURLWithProject])

    return {
        projects,
        fetchUserProjects,
        createProject,
        createProjectFromCurrent,
        deleteProject,
        loadProject,
        updateURLWithProject,
        handleResetWorkflow
    }
}
