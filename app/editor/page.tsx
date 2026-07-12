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
import UploaderPanel from '@/components/Editor/Uploader/UploaderPanel'
import UploadMain from '@/components/Editor/Uploader/UploadMain'
import CropperPanel from '@/components/Editor/Cropper/CropperPanel'
import CropperMain from '@/components/Editor/Cropper/CropperMain'
import { DiceCanvasRef } from '@/components/Editor/Tuner/DiceCanvas'
import TunerPanel from '@/components/Editor/Tuner/TunerPanel'
import TunerMain from '@/components/Editor/Tuner/TunerMain'

import BuilderPanel from '@/components/Editor/Builder/BuilderPanel'
import BuilderMain from '@/components/Editor/Builder/BuilderMain'

import ProjectSelector from '@/components/Editor/ProjectSelector'
import ProjectSelectionModal from '@/components/ProjectSelectionModal'
import DiceStepper from '@/components/Editor/DiceStepper'
import Logo from '@/components/Logo'
import AuthModal from '@/components/AuthModal'
import LimitReachedModal from '@/components/LimitReachedModal'
import ProFeatureModal from '@/components/ProFeatureModal'
import CommissionModal from '@/components/CommissionModal'
import Footer from '@/components/Footer'
import { devLog, devError } from '@/lib/utils/debug'

import { useEditorStore } from '@/lib/store/useEditorStore'
import { useProjectManager } from './hooks/useProjectManager'
import { useAutosave, flushSave, hydrateFromLocalDraft, clearLocalDraft } from './hooks/useAutosave'
import { PLAN_LIMITS, PlanType } from '@/lib/subscription'

function EditorContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const diceCanvasRef = useRef<DiceCanvasRef>(null)

  // Custom Hooks
  const {
    userProjects,
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

  // Calculate limits based on subscription plan
  const planType = (session?.user?.planType as PlanType) || 'explorer'
  const maxProjects = PLAN_LIMITS[planType].projectLimit


  // Store state
  const step = useEditorStore(state => state.step)

  const showAuthModal = useEditorStore(state => state.showAuthModal)
  const authModalMessage = useEditorStore(state => state.authModalMessage)
  const showProjectModal = useEditorStore(state => state.showProjectModal)
  const showLimitModal = useEditorStore(state => state.showLimitModal)

  const originalImage = useEditorStore(state => state.originalImage)
  const croppedImage = useEditorStore(state => state.croppedImage)
  const diceGrid = useEditorStore(state => state.diceGrid)
  const currentProjectId = useEditorStore(state => state.currentProjectId)
  const isInitializing = useEditorStore(state => state.isInitializing)

  // Store actions
  const setShowAuthModal = useEditorStore(state => state.setShowAuthModal)
  const setAuthModalMessage = useEditorStore(state => state.setAuthModalMessage)
  const setShowProjectModal = useEditorStore(state => state.setShowProjectModal)
  const setIsInitializing = useEditorStore(state => state.setIsInitializing)

  // Local UI state
  const [redditBannerDismissed, setRedditBannerDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('redditBannerDismissed') === 'true'
    }
    return false
  })

  // Track window size for responsive cropper
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 })

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

  // Ensure projects are always fetched when authenticated
  // This handles the case where state is preserved (currentProjectId exists) but local hook state (userProjects) is reset on remount
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchUserProjects()
    }
  }, [status, session?.user?.id, fetchUserProjects])

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
      setIsInitializing(false)
    }
  }, [status, session?.user?.id, currentProjectId, searchParams, setIsInitializing])

  // Handle user login - offer to save local work, or load the most recent project
  useEffect(() => {
    if (status === 'loading') return

    if (session?.user?.id && !currentProjectId) {
      fetchUserProjects().then((projects) => {
        // Read fresh from the store: the draft may have been hydrated after
        // this effect's render (e.g. right after an OAuth redirect)
        const { originalImage, processedImageUrl } = useEditorStore.getState()
        const hasWorkInProgress = !!(originalImage || processedImageUrl)

        // If a project is in the URL, the URL effect above will load it
        if (!searchParams.get('project')) {
          if (hasWorkInProgress) {
            // Local work in progress - show the dashboard so it can be saved
            setShowProjectModal(true)
          } else if (projects.length > 0) {
            // Projects are sorted by updatedAt desc - load the most recent
            loadProject(projects[0])
          } else {
            // First visit - show the dashboard to create a project
            setShowProjectModal(true)
          }
        }
        setIsInitializing(false)
      }).catch(err => {
        devError('[LOGIN] Failed to fetch projects:', err)
        setIsInitializing(false)
      })
    } else if (!session?.user?.id || currentProjectId) {
      setIsInitializing(false)
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
  if (isInitializing || status === 'loading') {
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

  // Render main content based on current step
  const renderMainContent = () => {
    if (step === 'upload') {
      return <UploadMain />
    }
    if (step === 'crop' || !croppedImage) {
      return <CropperMain windowSize={windowSize} />
    }
    if (step === 'tune' || !diceGrid) {
      return (
        <TunerMain
          diceCanvasRef={diceCanvasRef}
        />
      )
    }
    return <BuilderMain />
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="bg-gradient">
        <div className="orb one"></div>
        <div className="orb two"></div>
        <div className="orb three"></div>
      </div>
      <div className="grid-overlay"></div>

      <header
        className="relative"
        style={{
          zIndex: 50
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 relative">
          {/* Top row with logo and auth */}
          <div className="flex items-center">
            {/* Logo - always on left */}
            <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <Logo />
            </Link>

            {/* Spacer for desktop */}
            <div className="flex-1 hidden sm:block"></div>

            {/* Auth Button - always on right */}
            <div className="ml-auto">
              {status === 'authenticated' && session ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>

          {/* Project name - absolutely positioned center on desktop, below logo on mobile */}
          <div className="sm:absolute sm:left-1/2 sm:top-4 sm:transform sm:-translate-x-1/2 mt-3 sm:mt-0 flex justify-center py-2">
            {session?.user && (
              <ProjectSelector
                projects={userProjects}
                onSelectProject={async (projectId) => {
                  const project = userProjects.find(p => p.id === projectId)
                  if (!project) return

                  // Push any pending autosave to the current project before switching
                  try {
                    await flushSave()
                  } catch (err) {
                    console.error('Failed to auto-save before switch:', err)
                  }

                  loadProject(project)
                }}
                onCreateNew={createProject}
                onDeleteProject={deleteProject}
                maxProjects={maxProjects}
              />
            )}
          </div>
        </div >
      </header >

      {/* Main Content Area */}
      < main className="relative p-1 sm:p-4 flex-grow" >
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
        < div className="flex justify-center items-center mb-4" >
          {/* Stepper */}
          < DiceStepper />
        </div >

        {/* Step Content */}
        {/* Step Content */}
        <div className="w-full mx-auto px-0 sm:px-4 flex flex-col lg:flex-row gap-6 items-stretch justify-center h-auto min-h-[calc(100vh-180px)]">
          {/* LEFT PANEL AREA - Stacked on mobile, Sidebar on desktop */}
          <div className="flex-shrink-0 flex flex-col w-full lg:w-[350px] lg:min-w-[350px] lg:max-w-[350px] min-h-0 lg:min-h-[650px] max-h-none lg:max-h-[650px] lg:[@media(min-height:800px)]:max-h-[750px] lg:[@media(min-height:900px)]:max-h-[850px] bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl order-2 lg:order-1">
            {step === 'upload' && <UploaderPanel />}

            {step === 'crop' && <CropperPanel />}

            {step === 'tune' && <TunerPanel />}

            {step === 'build' && (
              <BuilderPanel />
            )}
          </div>

          {/* MAIN CONTENT AREA - Top on mobile, Main on desktop */}
          <div className="flex items-center justify-center relative w-full lg:flex-grow lg:w-auto min-w-0 lg:min-w-[400px] max-w-full lg:max-w-[850px] h-[50vh] lg:h-auto lg:min-h-[650px] lg:max-h-[650px] lg:[@media(min-height:800px)]:max-h-[750px] lg:[@media(min-height:900px)]:max-h-[850px] overflow-hidden bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 lg:p-6 shadow-2xl order-1 lg:order-2">
            {renderMainContent()}
          </div>
        </div>

      </main >

      {/* Auth Modal */}
      < AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setAuthModalMessage(null)
          // User can continue exploring up to x=3
        }}
        message={authModalMessage || "To continue using the builder you must be signed in"}
      />

      {/* Project Capacity Modal - only shown when at capacity */}
      <ProjectSelectionModal
        isOpen={showProjectModal}

        onCreateNew={(name) => {
          if (originalImage) {
            createProjectFromCurrent(name)
          } else {
            createProject(name)
          }
        }}
        onSelectProject={(projectId) => {
          const project = userProjects.find(p => p.id === projectId)
          if (project) {
            loadProject(project)
            setShowProjectModal(false)
          }
        }}
        onDeleteProject={deleteProject}
        projects={userProjects}
        hasCurrentState={!!originalImage}
        maxProjects={maxProjects}
      />



      {/* Limit Reached Modal */}
      <LimitReachedModal />
      <ProFeatureModal />
      <CommissionModal />

      {/* Footer */}
      <Footer />
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