'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import {
  Dices,
  X
} from 'lucide-react'
import { ImReddit } from 'react-icons/im'
import UserMenu from '@/components/Editor/UserMenu'
import HistoryButtons from '@/components/Editor/HistoryButtons'
import UploaderPanel from '@/components/Editor/Uploader/UploaderPanel'
import UploadMain from '@/components/Editor/Uploader/UploadMain'
import CropperPanel from '@/components/Editor/Cropper/CropperPanel'
import CropperMain from '@/components/Editor/Cropper/CropperMain'
import TunerPanel from '@/components/Editor/Tuner/TunerPanel'
import TunerMain from '@/components/Editor/Tuner/TunerMain'

import BuilderPanel from '@/components/Editor/Builder/BuilderPanel'
import BuilderMain from '@/components/Editor/Builder/BuilderMain'

import ProjectSelector from '@/components/Editor/ProjectSelector'
import ProjectSelectionModal from '@/components/ProjectSelectionModal'
import DiceStepper from '@/components/Editor/DiceStepper'
import MobileBottomBar from '@/components/Editor/Mobile/MobileBottomBar'
import MobileControls from '@/components/Editor/Mobile/MobileControls'
import Logo from '@/components/Logo'
import AuthModal from '@/components/AuthModal'
import LimitReachedModal from '@/components/LimitReachedModal'
import ProFeatureModal from '@/components/ProFeatureModal'
import ResetProgressModal from '@/components/ResetProgressModal'
import Footer from '@/components/Footer'
import { devLog, devError } from '@/lib/utils/debug'

import { useEditorShortcuts } from '@/features/editor/hooks/useEditorShortcuts'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { useProjectManager } from './hooks/useProjectManager'
import { useAutosave, flushSave, hydrateFromLocalDraft, clearLocalDraft } from './hooks/useAutosave'
import { useDiceGeneration } from './hooks/useDiceGeneration'
import { PLAN_LIMITS, PlanType } from '@/lib/subscription'

function EditorContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Custom Hooks
  const {
    projects,
    fetchUserProjects,
    createProject,
    createProjectFromCurrent,
    deleteProject,
    loadProject,
    updateURLWithProject
  } = useProjectManager()

  // Single autosave pipeline: watches the store, persists the snapshot
  // (DB when a project is loaded, localStorage draft otherwise)
  useAutosave()

  // Dice derivation pipeline: crop -> grid/stats -> preview image. Runs
  // independently of the visible step so restored states always regenerate.
  useDiceGeneration()

  // Global keyboard shortcuts: undo/redo everywhere, arrow keys on the build step
  useEditorShortcuts()

  // Calculate limits based on subscription plan
  const planType = (session?.user?.planType as PlanType) || 'explorer'
  const maxProjects = PLAN_LIMITS[planType].projectLimit


  // Store state
  const step = useEditorUiStore(state => state.step)
  const modal = useEditorUiStore(state => state.modal)
  const signInMessage = useEditorUiStore(state => state.signInMessage)
  const openModal = useEditorUiStore(state => state.openModal)
  const closeModal = useEditorUiStore(state => state.closeModal)

  const imageSrc = useProjectStore(state => state.imageSrc)
  const currentProjectId = useProjectStore(state => state.projectId)
  const boot = useProjectStore(state => state.boot)
  const setBoot = useProjectStore(state => state.setBoot)

  // Local UI state
  const [redditBannerDismissed, setRedditBannerDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('redditBannerDismissed') === 'true'
    }
    return false
  })

  // Track window size for responsive cropper
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 })

  // Below lg the editor switches to a fixed-viewport mobile shell:
  // full-screen canvas with a step bar on top and controls in the thumb zone
  const isMobile = windowSize.width < 1024

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: typeof window !== 'undefined' ? window.innerWidth : 800,
        height: typeof window !== 'undefined' ? window.innerHeight : 600
      })
    }

    handleResize() // Set initial size
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])






  // Handle project loading from URL
  useEffect(() => {
    const projectId = searchParams.get('project')

    // Redirect if unauthenticated
    if (projectId && status === 'unauthenticated') {
      devLog('[URL] Unauthenticated user accessing project, redirecting...')
      router.replace('/editor')
      return
    }

    if (projectId && session?.user?.id && !currentProjectId) {
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
  }, [searchParams, status, session?.user?.id, currentProjectId, loadProject, updateURLWithProject, router])

  // Handle missing project ID in URL when state is loaded (e.g. back navigation)
  useEffect(() => {
    // Only check if we're logged in and have a project loaded in state
    if (status === 'authenticated' && currentProjectId && !searchParams.get('project')) {
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
    } else if (!session?.user?.id && !currentProjectId) {
      hasHydratedRef.current = true
      hydrateFromLocalDraft()
      setBoot('ready')
    }
  }, [status, session?.user?.id, currentProjectId, searchParams, setBoot])

  // Handle user login - offer to save local work, or load the most recent project
  useEffect(() => {
    if (status === 'loading') return

    if (session?.user?.id && !currentProjectId) {
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
    } else if (!session?.user?.id || currentProjectId) {
      setBoot('ready')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id, currentProjectId, searchParams, loadProject])

  // The draft has served its purpose once a project is loaded
  useEffect(() => {
    if (currentProjectId) {
      clearLocalDraft()
    }
  }, [currentProjectId])

  // Show loading screen while initializing or session is loading
  if (boot === 'booting' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Elements */}
        <div className="bg-gradient">
          <div className="orb one"></div>
          <div className="orb two"></div>
          <div className="orb three"></div>
        </div>
        <div className="grid-overlay"></div>
        <div className="text-center relative z-10">
          <img src="/favicon.svg" alt="Loading..." className="animate-spin w-12 h-12 mb-4 mx-auto block" />
          <p className="text-white text-lg">Loading workspace...</p>
        </div>
      </div>
    )
  }

  // Switch projects, pushing any pending autosave to the current one first.
  // Shared by the desktop project selector and the mobile menu.
  const handleSelectProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    try {
      await flushSave()
    } catch (err) {
      console.error('Failed to auto-save before switch:', err)
    }

    loadProject(project)
  }

  // Render main content based on current step. Steps render their own
  // loading state while the dice pipeline regenerates missing derived data.
  const renderMainContent = () => {
    switch (step) {
      case 'upload': return <UploadMain />
      case 'crop': return <CropperMain windowSize={windowSize} />
      case 'tune': return <TunerMain />
      case 'build': return <BuilderMain />
    }
  }

  return (
    <div className={`flex flex-col relative overflow-hidden ${isMobile ? 'h-[100dvh]' : 'min-h-screen'}`}>
      {/* Background Elements */}
      <div className="bg-gradient">
        <div className="orb one"></div>
        <div className="orb two"></div>
        <div className="orb three"></div>
      </div>
      <div className="grid-overlay"></div>

      {/* Header - desktop only; on mobile its functions fold into the top bar menu */}
      {!isMobile && (
        <header
          className="relative flex-shrink-0"
          style={{
            zIndex: 50
          }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4 relative">
            {/* Single row: logo, project name, auth */}
            <div className="flex items-center">
              {/* Logo - always on left */}
              <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
                <Logo />
              </Link>

              {/* Project name - absolutely centered */}
              <div className="absolute left-1/2 top-4 transform -translate-x-1/2 py-2">
                {session?.user && (
                  <ProjectSelector
                    projects={projects}
                    onSelectProject={handleSelectProject}
                    onCreateNew={createProject}
                    onDeleteProject={deleteProject}
                    maxProjects={maxProjects}
                  />
                )}
              </div>

              {/* Undo/redo + auth - always on right */}
              <div className="ml-auto flex-shrink-0 flex items-center gap-4">
                <HistoryButtons />
                {status === 'authenticated' && session ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => openModal('signIn')}
                    className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          </div >
        </header >
      )}

      {/* Main Content Area */}
      {isMobile ? (
        /* Mobile: fixed viewport - canvas fills, controls and step bar together in the thumb zone */
        <main
          className="relative flex-1 min-h-0 flex flex-col px-2 gap-2 z-10"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 0.25rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
          }}
        >
          <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
            {renderMainContent()}
          </div>

          <MobileControls />

          <MobileBottomBar
            projects={projects}
            onSelectProject={handleSelectProject}
            onCreateNew={createProject}
            onDeleteProject={deleteProject}
            maxProjects={maxProjects}
          />
        </main>
      ) : (
        <main className="relative p-1 sm:p-4 flex-grow">
          {/* Reddit Announcement Banner */}
          {!redditBannerDismissed && (
            <div className="flex items-center justify-center gap-3 mx-auto mb-3 px-4 py-2.5 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] max-w-fit">
              <ImReddit className="text-[var(--pink)] text-lg flex-shrink-0" />
              <span className="text-white/70 text-sm">
                <span className="font-medium text-white/90">New!</span>{' '}
                Join{' '}
                <a
                  href="https://www.reddit.com/r/DicePortraits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--pink)] hover:underline font-medium"
                >
                  r/DicePortraits
                </a>
                {' '}— share your builds & see what others are creating
              </span>
              <button
                onClick={() => {
                  setRedditBannerDismissed(true)
                  localStorage.setItem('redditBannerDismissed', 'true')
                }}
                className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 p-0.5"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Center: Stepper */}
          <div className="flex justify-center items-center mb-4">
            <DiceStepper />
          </div>

          {/* Step Content */}
          <div className="w-full mx-auto px-4 flex flex-row gap-6 items-stretch justify-center h-auto min-h-[calc(100vh-180px)]">
            {/* LEFT PANEL AREA - Sidebar */}
            <div className="flex-shrink-0 flex flex-col w-[350px] min-w-[350px] max-w-[350px] min-h-[650px] max-h-[650px] [@media(min-height:800px)]:max-h-[750px] [@media(min-height:900px)]:max-h-[850px] bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              {step === 'upload' && <UploaderPanel />}

              {step === 'crop' && <CropperPanel />}

              {step === 'tune' && <TunerPanel />}

              {step === 'build' && (
                <BuilderPanel />
              )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex items-center justify-center relative flex-grow w-auto min-w-[400px] max-w-[850px] min-h-[650px] max-h-[650px] [@media(min-height:800px)]:max-h-[750px] [@media(min-height:900px)]:max-h-[850px] overflow-hidden bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              {renderMainContent()}
            </div>
          </div>

        </main>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={modal === 'signIn'}
        onClose={closeModal}
        message={signInMessage || "To continue using the builder you must be signed in"}
      />

      {/* Project Capacity Modal - only shown when at capacity */}
      <ProjectSelectionModal
        isOpen={modal === 'projects'}
        onCreateNew={(name) => {
          if (imageSrc) {
            createProjectFromCurrent(name)
          } else {
            createProject(name)
          }
        }}
        onSelectProject={(projectId) => {
          const project = projects.find(p => p.id === projectId)
          if (project) {
            loadProject(project)
            closeModal()
          }
        }}
        onDeleteProject={deleteProject}
        projects={projects}
        hasCurrentState={!!imageSrc}
        maxProjects={maxProjects}
      />

      <LimitReachedModal />
      <ProFeatureModal />
      <ResetProgressModal />

      {/* Footer - desktop only; the mobile shell is a fixed viewport */}
      {!isMobile && <Footer />}
    </div >
  )
}

// Export the page wrapped in Suspense to handle useSearchParams
export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0014] to-black z-0" />
        <div className="relative z-10 flex flex-col items-center">
          <Dices className="w-12 h-12 text-pink-500 animate-spin mb-4" />
          <p className="text-white/60 font-medium">Loading editor...</p>
        </div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  )
}