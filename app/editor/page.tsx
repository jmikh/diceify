'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import {
  Dices
} from 'lucide-react'
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
import { usePersistence } from './hooks/usePersistence'
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

  const {
    saveProgressOnly,
    saveUploadStep,
    saveCropStep,
    saveTuneStep
  } = usePersistence()

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
  const cropParams = useEditorStore(state => state.cropParams)
  const cropRotation = useEditorStore(state => state.cropRotation)
  const diceParams = useEditorStore(state => state.diceParams)
  const diceStats = useEditorStore(state => state.diceStats)
  const diceGrid = useEditorStore(state => state.diceGrid)
  const processedImageUrl = useEditorStore(state => state.processedImageUrl)
  const projectName = useEditorStore(state => state.projectName)
  const currentProjectId = useEditorStore(state => state.currentProjectId)
  const lastSaved = useEditorStore(state => state.lastSaved)
  const isSaving = useEditorStore(state => state.isSaving)
  const isInitializing = useEditorStore(state => state.isInitializing)
  const buildProgress = useEditorStore(state => state.buildProgress)

  // Store actions
  const setStep = useEditorStore(state => state.setStep)

  const setShowAuthModal = useEditorStore(state => state.setShowAuthModal)
  const setAuthModalMessage = useEditorStore(state => state.setAuthModalMessage)
  const setShowProjectModal = useEditorStore(state => state.setShowProjectModal)
  const setOriginalImage = useEditorStore(state => state.setOriginalImage)
  const setCroppedImage = useEditorStore(state => state.setCroppedImage)
  const setCropParams = useEditorStore(state => state.setCropParams)
  const setDiceParams = useEditorStore(state => state.setDiceParams)
  const setDiceStats = useEditorStore(state => state.setDiceStats)
  const setDiceGrid = useEditorStore(state => state.setDiceGrid)
  const setProcessedImageUrl = useEditorStore(state => state.setProcessedImageUrl)
  const setProjectName = useEditorStore(state => state.setProjectName)
  const setIsInitializing = useEditorStore(state => state.setIsInitializing)
  const setBuildProgress = useEditorStore(state => state.setBuildProgress)

  // Local UI state
  const [showUserMenu, setShowUserMenu] = useState(false)

  const [isRestoringOAuthState, setIsRestoringOAuthState] = useState(false)

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






  // Keep latest buildProgress in a ref to avoid stale closures
  const buildProgressRef = useRef(buildProgress)
  buildProgressRef.current = buildProgress

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false)

      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])




  // Close user menu when clicking outside

  // Clean up timeouts on unmount and save build progress
  useEffect(() => {
    // Handle browser tab close/refresh
    const handleBeforeUnload = () => {
      if (step === 'build' && currentProjectId && session?.user?.id) {
        const currentProgress = buildProgressRef.current
        if (currentProgress.x > 0 || currentProgress.y > 0) {
          devLog('[CLIENT] Page unloading, saving build progress')
          // Use navigator.sendBeacon for reliable saving on page unload
          const data = JSON.stringify({
            currentX: currentProgress.x,
            currentY: currentProgress.y,
            completedDice: Math.floor((currentProgress.percentage / 100) * diceStats.totalCount),

          })
          navigator.sendBeacon(`/api/projects/${currentProjectId}/progress`, data)
        }
      }
    }

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload)



      // Save build progress on component unmount
      handleBeforeUnload()
    }
  }, [step, currentProjectId, session?.user?.id, diceStats.totalCount])

  // Handle project loading from URL
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

  // Save state to localStorage whenever it changes (for recovery on refresh)
  // HEAVY SAVE: Only triggers on image/params changes, NOT on buildProgress
  useEffect(() => {
    // Only save if NOT logged in and we have meaningful state
    if (!session?.user?.id && (originalImage || (cropParams && Object.keys(cropParams).length > 0))) {
      try {
        // Only store what the database stores - no generated images
        // Note: buildProgress is saved separately in a lightweight effect
        const stateToSave = {
          originalImage,  // Keep this as it's the source image
          // Don't save croppedImage or processedImageUrl - they're regenerated
          cropParams,     // Used to regenerate cropped image
          diceParams,     // Used to regenerate dice grid
          step,
          projectName,
          diceStats
        }
        localStorage.setItem('editorState', JSON.stringify(stateToSave))
        devLog('[LOCAL STORAGE] Saved editor state (heavy save - params only, not logged in)')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          devError('[LOCAL STORAGE] Quota exceeded - clearing and retrying without image')
          localStorage.removeItem('editorState')
          // Try again without the original image
          try {
            const minimalState = {
              cropParams,
              diceParams,
              step,
              projectName,
              diceStats
            }
            localStorage.setItem('editorState', JSON.stringify(minimalState))
            devLog('[LOCAL STORAGE] Saved minimal state without images')
          } catch (retryError) {
            devError('[LOCAL STORAGE] Failed to save even minimal state:', retryError)
          }
        } else {
          devError('[LOCAL STORAGE] Failed to save state:', error)
        }
      }
    } else if (session?.user?.id) {
      // Clear localStorage when logged in (using database instead)
      localStorage.removeItem('editorState')
      localStorage.removeItem('editorBuildProgress')
    }
  }, [session?.user?.id, originalImage, cropParams, diceParams, step, projectName, diceStats])
  // Note: buildProgress intentionally excluded - saved in separate lightweight effect

  // LIGHT SAVE: Only saves buildProgress to a separate key (fast, no image serialization)
  useEffect(() => {
    // Only save if NOT logged in and we have build progress
    if (!session?.user?.id && (buildProgress.x > 0 || buildProgress.y > 0)) {
      try {
        localStorage.setItem('editorBuildProgress', JSON.stringify(buildProgress))
        // Don't log every build progress save to avoid console spam
      } catch (error) {
        // Silently fail - this is non-critical
      }
    }
  }, [session?.user?.id, buildProgress])

  // Restore state from localStorage on mount (if no project is loaded)
  useEffect(() => {
    // Skip if still determining session status
    if (status === 'loading') return

    // Only restore if not logged in, don't have a project, and aren't in OAuth flow
    if (!session?.user?.id && !currentProjectId && !searchParams.get('restored')) {
      const savedState = localStorage.getItem('editorState')
      if (savedState) {
        try {
          const state = JSON.parse(savedState)
          devLog('[LOCAL STORAGE] Found saved editor state, restoring...')

          // Only restore if the saved state has actual content
          if (state.originalImage || state.cropParams) {
            // Restore all state
            if (state.originalImage) setOriginalImage(state.originalImage)
            // Don't restore croppedImage or processedImageUrl - they'll be regenerated
            if (state.cropParams) setCropParams(state.cropParams)
            if (state.diceParams) setDiceParams(state.diceParams)
            if (state.projectName) setProjectName(state.projectName)
            if (state.diceStats) setDiceStats(state.diceStats)
            if (state.step) setStep(state.step)

            // Restore buildProgress from separate key (lightweight storage)
            const savedBuildProgress = localStorage.getItem('editorBuildProgress')
            if (savedBuildProgress) {
              try {
                const progress = JSON.parse(savedBuildProgress)
                setBuildProgress(progress)
                devLog('[LOCAL STORAGE] Restored buildProgress from separate key')
              } catch (e) {
                // Fallback to state.buildProgress if separate key fails
                if (state.buildProgress) setBuildProgress(state.buildProgress)
              }
            } else if (state.buildProgress) {
              // Legacy support: restore from main state if no separate key
              setBuildProgress(state.buildProgress)
            }

            // If we have crop params and original image, regenerate the cropped image
            // This is needed for the tune and build steps
            if (state.cropParams && state.originalImage && (state.step === 'tune' || state.step === 'build')) {
              devLog('[LOCAL STORAGE] Regenerating cropped image from params')
              // Create a canvas to generate the cropped image
              const img = new Image()
              img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = state.cropParams.width
                canvas.height = state.cropParams.height
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  // Draw the cropped portion
                  ctx.drawImage(img,
                    state.cropParams.x,
                    state.cropParams.y,
                    state.cropParams.width,
                    state.cropParams.height,
                    0, 0,
                    state.cropParams.width,
                    state.cropParams.height
                  )
                  const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95)
                  devLog('[LOCAL STORAGE] Cropped image regenerated successfully')
                  setCroppedImage(croppedDataUrl)
                }
              }
              img.src = state.originalImage
            }

            devLog('[LOCAL STORAGE] State restored successfully')
            // Add small delay to ensure state is applied before showing UI
            setTimeout(() => setIsInitializing(false), 500)
          } else {
            // No state to restore
            setIsInitializing(false)
          }
        } catch (err) {
          devError('[LOCAL STORAGE] Failed to restore state:', err)
          setIsInitializing(false)
        }
      } else {
        // No saved state
        setIsInitializing(false)
      }
    }
  }, [status, session?.user?.id, currentProjectId, searchParams]) // Re-run when session status changes

  // Handle OAuth restoration after redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('restored') === 'true') {
      devLog('[DEBUG] OAuth redirect detected, checking for saved state')
      setIsRestoringOAuthState(true)
      const savedState = sessionStorage.getItem('editorStateBeforeAuth')
      if (savedState) {
        try {
          const state = JSON.parse(savedState)
          devLog('[DEBUG] Restoring editor state after OAuth redirect')
          devLog('[DEBUG] Saved state contains:')
          devLog('  - originalImage:', state.originalImage ? `${state.originalImage.substring(0, 50)}...` : 'null')
          devLog('  - croppedImage:', state.croppedImage ? `${state.croppedImage.substring(0, 50)}...` : 'null')
          devLog('  - processedImageUrl:', state.processedImageUrl ? `${state.processedImageUrl.substring(0, 50)}...` : 'null')
          devLog('  - step:', state.step)

          devLog('  - cropParams:', state.cropParams)
          devLog('  - diceParams:', state.diceParams)

          // Restore the state
          if (state.originalImage) {
            devLog('[DEBUG] Restoring originalImage')
            setOriginalImage(state.originalImage)
          }
          if (state.croppedImage) {
            devLog('[DEBUG] Restoring croppedImage')
            setCroppedImage(state.croppedImage)
          }
          if (state.processedImageUrl) {
            devLog('[DEBUG] Restoring processedImageUrl')
            setProcessedImageUrl(state.processedImageUrl)
          }
          if (state.cropParams) {
            devLog('[DEBUG] Restoring cropParams')
            setCropParams(state.cropParams)
          }
          if (state.diceParams) {
            devLog('[DEBUG] Restoring diceParams')
            setDiceParams(state.diceParams)
          }
          if (state.step) {
            devLog('[DEBUG] Restoring step')
            setStep(state.step)
          }


          // Clear the saved state and URL param
          sessionStorage.removeItem('editorStateBeforeAuth')
          window.history.replaceState({}, '', '/editor')

          // Set flag for auto-save ONLY if there's actual work (an image) to save
          if (state.originalImage || state.processedImageUrl) {
            devLog('[DEBUG] Setting flag for auto-save after restoration completes (has image)')
            sessionStorage.setItem('shouldAutoSaveRestoredState', 'true')
          } else {
            devLog('[DEBUG] No image in restored state, skipping auto-save flag')
          }

          // Check if user intended to go to build step after login
          const intendedStep = sessionStorage.getItem('intendedStepAfterLogin')
          if (intendedStep === 'build') {
            devLog('[DEBUG] User intended to go to build step after login - navigating there')
            sessionStorage.removeItem('intendedStepAfterLogin')
            // Set step to build after restoration
            setStep('build')

          }

          // Mark restoration as complete - this will trigger auto-save logic
          devLog('[DEBUG] OAuth state restoration complete')
          // Note: The state variables here will show old values due to closure, but setState calls have been made
          setIsRestoringOAuthState(false)
        } catch (err) {
          devError('[DEBUG] Failed to restore state:', err)
          setIsRestoringOAuthState(false)
        }
      } else {
        setIsRestoringOAuthState(false)
      }
    }
  }, []) // Run once on mount

  // Handle user login - auto-create project or show capacity modal
  useEffect(() => {
    // Skip if still determining session status
    if (status === 'loading') return

    devLog('[LOGIN EFFECT] Triggered with:', {
      sessionStatus: status,
      hasSession: !!session?.user?.id,
      currentProjectId,
      isRestoringOAuthState,
      originalImage: !!originalImage,
      processedImageUrl: !!processedImageUrl,
      croppedImage: !!croppedImage
    })

    // Only run this logic when user just logged in and has no project loaded yet
    if (session?.user?.id && !currentProjectId && !isRestoringOAuthState) {
      devLog('[LOGIN EFFECT] User logged in without current project, fetching user projects...')
      fetchUserProjects().then((projects) => {
        const projectCount = (projects || []).length
        devLog('[LOGIN EFFECT] Projects fetched:', {
          projectCount,
          projects: projects?.map((p: any) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
        })

        // Check if user has work in progress (including restored OAuth state)
        const shouldAutoSaveRestoredState = sessionStorage.getItem('shouldAutoSaveRestoredState') === 'true'
        const hasWorkInProgress = originalImage || processedImageUrl || shouldAutoSaveRestoredState

        devLog('[LOGIN EFFECT] Work state check:', {
          shouldAutoSaveRestoredState,
          hasOriginalImage: !!originalImage,
          hasProcessedImageUrl: !!processedImageUrl,
          hasCroppedImage: !!croppedImage,
          hasWorkInProgress
        })

        if (shouldAutoSaveRestoredState) {
          devLog('[LOGIN EFFECT] Found shouldAutoSaveRestoredState flag - state should now be restored')
          sessionStorage.removeItem('shouldAutoSaveRestoredState')
        }

        // Check if there is a project in the URL - if so, don't show modal
        const projectIdParam = searchParams.get('project')
        if (!projectIdParam) {
          // Decide whether to show project modal or auto-load most recent project
          if (hasWorkInProgress) {
            // User has local work in progress - show modal so they can save it
            devLog('[LOGIN EFFECT] Has work in progress, showing project dashboard')
            setShowProjectModal(true)
          } else if (projectCount > 0) {
            // No local work, but has existing projects - auto-load the most recent one
            // Projects are already sorted by updatedAt desc, so first one is most recent
            const mostRecentProject = projects[0]
            devLog('[LOGIN EFFECT] No local work, auto-loading most recent project:', mostRecentProject.name)
            loadProject(mostRecentProject)
          } else {
            // No local work AND no existing projects - show modal to create first project
            devLog('[LOGIN EFFECT] No projects found, showing project dashboard to create first project')
            setShowProjectModal(true)
          }
        } else {
          devLog('[LOGIN EFFECT] Skipping project dashboard - project ID in URL')
        }

        // Mark initialization as complete after handling all login logic with small delay
        setTimeout(() => setIsInitializing(false), 500)
      }).catch(err => {
        devError('[LOGIN EFFECT] Failed to fetch projects:', err)
        // Still mark as complete even on error
        setTimeout(() => setIsInitializing(false), 500)
      })
    } else {
      devLog('[LOGIN EFFECT] Conditions not met, skipping:', {
        hasSession: !!session?.user?.id,
        hasCurrentProjectId: !!currentProjectId,
        isRestoringOAuthState
      })
      // Mark initialization as complete if not logged in or already has project
      if (!session?.user?.id || currentProjectId) {
        setTimeout(() => setIsInitializing(false), 500)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, currentProjectId, isRestoringOAuthState, originalImage, processedImageUrl, croppedImage, searchParams, loadProject])


  // Clear localStorage when a project is loaded or workflow is reset
  useEffect(() => {
    if (currentProjectId) {
      // Clear localStorage when a project is loaded
      localStorage.removeItem('editorState')
      devLog('[LOCAL STORAGE] Cleared - project loaded')
    }
  }, [currentProjectId])



  // Save progress when Y changes (row change)
  useEffect(() => {
    // Skip initial render or if no project loaded
    if (!session?.user?.id || !currentProjectId) return

    devLog('[AUTO-SAVE] Y changed, saving progress')
    // We rely on the ref inside saveProgressOnly to get current X and Y
    saveProgressOnly()
  }, [buildProgress.y, session?.user?.id, currentProjectId, saveProgressOnly])

  // No cleanup needed - removed auto-save timers

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
          <img src="/icon.svg" alt="Loading..." className="animate-spin w-12 h-12 mb-4 mx-auto block" />
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
                <div className="flex items-center gap-3">
                  <div className="relative user-menu-container">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowUserMenu(!showUserMenu)
                      }}
                    >
                      {session.user?.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || 'User'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            devError('Image failed to load:', session.user?.image)
                            // Hide the broken image and show fallback
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 items-center justify-center text-white font-semibold"
                        style={{ display: session.user?.image ? 'none' : 'flex' }}
                      >
                        {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </div>

                    {/* Dropdown menu */}
                    {showUserMenu && (() => {
                      const planType = session.user?.planType || 'explorer'
                      const subStatus = session.user?.subscriptionStatus
                      const expiresAt = session.user?.subscriptionExpiresAt

                      // Calculate expiration text
                      let expirationText = ''
                      if (expiresAt) {
                        const expiresDate = new Date(expiresAt)
                        const now = new Date()
                        const isExpired = expiresDate.getTime() < now.getTime()
                        const formattedDate = expiresDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

                        if (planType === 'creator') {
                          // Creator shows expiration date only
                          expirationText = isExpired ? 'Expired' : `Expires on ${formattedDate}`
                        } else if (planType === 'studio' && subStatus === 'canceled') {
                          // Canceled Studio shows expiration date
                          expirationText = isExpired ? 'Expired' : `Expires on ${formattedDate}`
                        }
                      }

                      const handleManageSubscription = async () => {
                        try {
                          const response = await fetch('/api/stripe/portal', { method: 'POST' })
                          const data = await response.json()
                          if (data.url) {
                            window.location.href = data.url
                          }
                        } catch (error) {
                          console.error('Failed to open billing portal:', error)
                        }
                      }

                      const getPlanBadge = () => {
                        switch (planType) {
                          case 'lifetime':
                            return <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">LIFETIME</span>
                          case 'studio':
                            return <span className="px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-bold border border-pink-500/30">STUDIO</span>
                          case 'creator':
                            return <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">CREATOR PASS</span>
                          default:
                            return <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-bold border border-white/20">EXPLORER</span>
                        }
                      }

                      return (
                        <div className="absolute top-full right-0 mt-2 bg-[#0a0014]/90 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 overflow-hidden z-50" style={{ minWidth: '280px' }}>
                          <div className="px-4 py-3 border-b border-gray-700">
                            <div className="text-sm font-medium text-white">
                              {session.user?.name || 'User'}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                              {session.user?.email}
                              {getPlanBadge()}
                            </div>
                            {expirationText && (
                              <div className={`text-xs mt-1.5 ${subStatus === 'canceled' ? 'text-orange-400' : 'text-gray-500'}`}>
                                {subStatus === 'canceled' && <span className="text-orange-400">Canceled • </span>}
                                {expirationText}
                              </div>
                            )}
                          </div>



                          {/* Manage subscription for Studio users */}
                          {planType === 'studio' && subStatus !== 'canceled' && (
                            <button
                              onClick={handleManageSubscription}
                              className="w-full px-4 py-2 text-sm text-left text-white/90 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5"
                            >
                              Manage subscription
                            </button>
                          )}

                          {/* Sign Out */}
                          <button
                            onClick={() => {
                              setShowUserMenu(false)
                              signOut()
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-white/90 hover:text-white hover:bg-white/10 transition-colors hover:rounded-b-lg"
                          >
                            Sign out
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                </div>
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
                  // Find the target project first
                  const project = userProjects.find(p => p.id === projectId)
                  if (!project) return

                  // Auto-save current project before switching if we have an active project
                  if (currentProjectId && session?.user?.id) {
                    try {
                      devLog('[CLIENT] Auto-saving before project switch...')
                      switch (step) {
                        case 'upload':
                          await saveUploadStep()
                          break
                        case 'crop':
                          await saveCropStep()
                          break
                        case 'tune':
                          await saveTuneStep()
                          break
                        case 'build':
                          await saveProgressOnly()
                          break
                      }
                    } catch (err) {
                      console.error("Failed to auto-save before switch:", err)
                      // Continue with switch even if save fails
                    }
                  }

                  // Load the new project
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
        onSuccess={() => {
          setShowAuthModal(false)
          setAuthModalMessage(null)
          setStep('build')
          // Everything else is handled automatically by the login useEffect
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