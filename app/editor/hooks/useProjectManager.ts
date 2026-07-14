import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { buildProjectPayload, markSnapshotClean, clearLocalDraft, flushSave } from './useAutosave'
import { devLog, devError } from '@/lib/utils/debug'

export function useProjectManager() {
    const { data: session } = useSession()
    const router = useRouter()

    // Store state
    const currentProjectId = useEditorStore(state => state.currentProjectId)
    const originalImage = useEditorStore(state => state.originalImage)

    // Store actions
    const setCurrentProjectId = useEditorStore(state => state.setCurrentProjectId)
    const setProjectName = useEditorStore(state => state.setProjectName)
    const setLastSaved = useEditorStore(state => state.setLastSaved)
    const setShowProjectModal = useEditorStore(state => state.setShowProjectModal)
    const setStep = useEditorStore(state => state.setStep)
    const setOriginalImage = useEditorStore(state => state.setOriginalImage)
    const setCroppedImage = useEditorStore(state => state.setCroppedImage)
    const setCropParams = useEditorStore(state => state.setCropParams)
    const setProcessedImageUrl = useEditorStore(state => state.setProcessedImageUrl)
    const setDiceParams = useEditorStore(state => state.setDiceParams)
    const setDiceStats = useEditorStore(state => state.setDiceStats)
    const setBuildProgress = useEditorStore(state => state.setBuildProgress)
    const resetWorkflow = useEditorStore(state => state.resetWorkflow)

    // Local state
    const [userProjects, setUserProjects] = useState<any[]>([])

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
        resetWorkflow()
        clearLocalDraft()
    }, [resetWorkflow])

    // Fetch user projects
    const fetchUserProjects = useCallback(async () => {
        if (!session?.user?.id) return []

        try {
            const response = await fetch('/api/projects')
            if (response.ok) {
                const projects = await response.json()
                setUserProjects(projects)
                return projects
            }
        } catch (error) {
            devError('Failed to fetch projects:', error)
        }
        return []
    }, [session])

    const registerCreatedProject = useCallback(async (project: any) => {
        setCurrentProjectId(project.id)
        setProjectName(project.name)
        updateURLWithProject(project.id)
        setLastSaved(new Date())
        setShowProjectModal(false)
        markSnapshotClean()
        await fetchUserProjects()
    }, [setCurrentProjectId, setProjectName, updateURLWithProject, setLastSaved, setShowProjectModal, fetchUserProjects])

    const postProject = useCallback(async (payload: object) => {
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
            devError('Failed to create project')
            return null
        }
        return response.json()
    }, [])

    // Create a new empty project (server defaults fill in the rest)
    const createProject = useCallback(async (name?: string) => {
        if (!session?.user?.id || !name) return

        // Push pending changes to the current project and detach the autosave
        // from it BEFORE resetting, so the reset can't be saved into it
        await flushSave()
        setCurrentProjectId(null)
        handleResetWorkflow()

        devLog(`[DB] Creating new empty project: ${name}`)
        try {
            const project = await postProject({ name })
            if (project) {
                await registerCreatedProject(project)
                setStep('upload')
            }
        } catch (error) {
            devError('Failed to create project:', error)
        }
    }, [session, handleResetWorkflow, postProject, registerCreatedProject, setStep, setCurrentProjectId])

    // Create a project from the current (anonymous draft) state
    const createProjectFromCurrent = useCallback(async (name?: string) => {
        if (!session?.user?.id) return

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
                originalImage,
            })
            if (project) {
                // The draft is cleared by the page effect once currentProjectId is set
                await registerCreatedProject(project)
            }
        } catch (error) {
            devError('Failed to create project:', error)
        }
    }, [session, originalImage, postProject, registerCreatedProject])

    // Delete project
    const deleteProject = useCallback(async (projectId: string) => {
        if (!session?.user?.id) return

        devLog(`[DB] Deleting project ${projectId}`)
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                await fetchUserProjects()
                // If we deleted the current project, reset the editor
                if (projectId === currentProjectId) {
                    handleResetWorkflow()
                    setCurrentProjectId(null)
                    updateURLWithProject(null)
                }
            }
        } catch (error) {
            devError('Failed to delete project:', error)
        }
    }, [session, currentProjectId, fetchUserProjects, handleResetWorkflow, setCurrentProjectId, updateURLWithProject])

    // Load a project
    const loadProject = useCallback(async (project: any) => {
        devLog('[CLIENT] Loading project:', project.name)

        // Always fetch the latest full project data (the list omits large fields)
        try {
            const response = await fetch(`/api/projects/${project.id}`)
            if (response.ok) {
                project = await response.json()
            }
        } catch (error) {
            devError('Failed to fetch full project:', error)
        }

        // Clear derived state
        setOriginalImage(null)
        setCroppedImage(null)
        setCropParams(null)
        setProcessedImageUrl(null)

        // Project metadata
        setCurrentProjectId(project.id)
        setProjectName(project.name)
        updateURLWithProject(project.id)
        if (project.updatedAt) {
            setLastSaved(new Date(project.updatedAt))
        }

        if (project.originalImage) {
            setOriginalImage(project.originalImage)
        }

        // Crop params - the cropped image itself is derived state that the
        // dice pipeline (useDiceGeneration) regenerates automatically
        if (project.cropX !== null && project.cropY !== null && project.cropWidth && project.cropHeight) {
            const params = {
                x: project.cropX,
                y: project.cropY,
                width: project.cropWidth,
                height: project.cropHeight,
                rotation: project.cropRotation || 0
            }
            setCropParams(params)
            // Keep the cropper widget's rotation in sync with the restored params
            useEditorStore.getState().setCropRotation(params.rotation)
        }

        // Tune params
        const diceParams = {
            numRows: project.numRows || 30,
            colorMode: project.colorMode || 'both',
            contrast: project.contrast || 0,
            gamma: project.gamma || 1.0,
            edgeSharpening: project.edgeSharpening || 0,
            rotate2: project.rotate2 || false,
            rotate3: project.rotate3 || false,
            rotate6: project.rotate6 || false
        }
        setDiceParams(diceParams)
        // The loaded progress belongs to the loaded params
        useEditorStore.getState().setBuildBaseline()

        // Black/white split is recomputed when the grid regenerates
        if (project.totalDice) {
            setDiceStats({
                blackCount: 0,
                whiteCount: 0,
                totalCount: project.totalDice
            })
        }

        setBuildProgress({
            x: project.currentX || 0,
            y: project.currentY || 0
        })

        if (project.originalImage) {
            if (project.currentX > 0 || project.currentY > 0) {
                setStep('build')
            } else {
                setStep('tune')
            }
        } else {
            setStep('upload')
        }

        // Everything just loaded is by definition saved
        markSnapshotClean()
    }, [setCurrentProjectId, setProjectName, updateURLWithProject, setLastSaved, setOriginalImage, setCroppedImage, setCropParams, setProcessedImageUrl, setDiceStats, setDiceParams, setBuildProgress, setStep])

    return {
        userProjects,
        fetchUserProjects,
        createProject,
        createProjectFromCurrent,
        deleteProject,
        loadProject,
        updateURLWithProject,
        handleResetWorkflow
    }
}
