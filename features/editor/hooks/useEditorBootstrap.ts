import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { devLog, devError } from '@/lib/utils/debug'
import { useUser } from '@/features/account/useUser'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { hydrateFromLocalDraft, clearLocalDraft } from './useAutosave'
import type { useProjectManager } from './useProjectManager'

type ProjectManager = Pick<ReturnType<typeof useProjectManager>, 'fetchUserProjects' | 'loadProject' | 'updateURLWithProject'>

/**
 * Decides what the editor shows on arrival: the project in the URL, the anonymous draft (also after the OAuth
 * round trip, `?restored=true`), the most recent project, or the projects dashboard. Ends with `boot = 'ready'`.
 * Moved as-is from the editor page; C3 rewrites the sequence on Supabase.
 */
export function useEditorBootstrap({ fetchUserProjects, loadProject, updateURLWithProject }: ProjectManager) {
  const { user, status } = useUser()
  const userId = user?.id
  const router = useRouter()
  const searchParams = useSearchParams()

  const openModal = useEditorUiStore(state => state.openModal)
  const currentProjectId = useProjectStore(state => state.projectId)
  const setBoot = useProjectStore(state => state.setBoot)

  // Handle project loading from URL
  useEffect(() => {
    const projectId = searchParams.get('project')

    // Redirect if unauthenticated
    if (projectId && status === 'anon') {
      devLog('[URL] Unauthenticated user accessing project, redirecting...')
      router.replace('/editor')
      return
    }

    if (projectId && userId && !currentProjectId) {
      devLog('[URL] Loading project from URL:', projectId)
      // Fetch and load the specific project
      fetch(`/api/projects/${projectId}`)
        .then(response => {
          if (response.ok) {
            return response.json()
          }
          throw new Error('Project not found')
        })
        .then(project => {
          devLog('[URL] Project loaded from URL')
          loadProject(project)
        })
        .catch(error => {
          devError('[URL] Failed to load project from URL:', error)
          // Clear invalid project ID from URL
          updateURLWithProject(null)
        })
    }
  }, [searchParams, status, userId, currentProjectId, loadProject, updateURLWithProject, router])

  // Handle missing project ID in URL when state is loaded (e.g. back navigation)
  useEffect(() => {
    // Only check if we're logged in and have a project loaded in state
    if (status === 'authed' && currentProjectId && !searchParams.get('project')) {
      devLog('[URL] Project loaded in state but missing from URL, redirecting...')
      router.replace(`/editor?project=${currentProjectId}`)
    }
  }, [status, currentProjectId, searchParams, router])

  // Restore the anonymous draft from localStorage.
  // Two entry points share the same draft: a plain visit while logged out, and
  // the return from an OAuth redirect (?restored=true) where the pre-login
  // work is picked up so the login effect below can offer to save it.
  const hasHydratedRef = useRef(false)
  useEffect(() => {
    if (status === 'loading' || hasHydratedRef.current) return

    const isOAuthReturn = searchParams.get('restored') === 'true'
    if (isOAuthReturn) {
      hasHydratedRef.current = true
      hydrateFromLocalDraft()
      window.history.replaceState({}, '', '/editor')
    } else if (!userId && !currentProjectId) {
      hasHydratedRef.current = true
      hydrateFromLocalDraft()
      setBoot('ready')
    }
  }, [status, userId, currentProjectId, searchParams, setBoot])

  // Handle user login - offer to save local work, or load the most recent project
  useEffect(() => {
    if (status === 'loading') return

    if (userId && !currentProjectId) {
      fetchUserProjects().then((projects) => {
        // Read fresh from the store: the draft may have been hydrated after
        // this effect's render (e.g. right after an OAuth redirect)
        const hasWorkInProgress = !!useProjectStore.getState().imageSrc

        // If a project is in the URL, the URL effect above will load it
        if (!searchParams.get('project')) {
          if (hasWorkInProgress) {
            // Local work in progress - show the dashboard so it can be saved
            openModal('projects')
          } else if (projects.length > 0) {
            // Projects are sorted by updatedAt desc - load the most recent
            loadProject(projects[0])
          } else {
            // First visit - show the dashboard to create a project
            openModal('projects')
          }
        }
        setBoot('ready')
      }).catch(err => {
        devError('[LOGIN] Failed to fetch projects:', err)
        setBoot('ready')
      })
    } else if (!userId || currentProjectId) {
      setBoot('ready')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId, currentProjectId, searchParams, loadProject])

  // The draft has served its purpose once a project is loaded
  useEffect(() => {
    if (currentProjectId) {
      clearLocalDraft()
    }
  }, [currentProjectId])
}
