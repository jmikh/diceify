'use client'

import { useSession } from 'next-auth/react'

import BackgroundOrbs from '@/components/BackgroundOrbs'
import Footer from '@/components/Footer'
import { useMediaQuery } from '@/lib/media-query'
import { PLAN_LIMITS, PlanType } from '@/lib/subscription'

import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { useProjectManager } from '@/features/editor/hooks/useProjectManager'
import { useAutosave, flushSave } from '@/features/editor/hooks/useAutosave'
import { useDicePipeline } from '@/features/editor/hooks/useDicePipeline'
import { useEditorShortcuts } from '@/features/editor/hooks/useEditorShortcuts'
import { useEditorBootstrap } from '@/features/editor/hooks/useEditorBootstrap'

import EditorHeader from './EditorHeader'
import DiceStepper from './DiceStepper'
import UploaderPanel from '../upload/UploaderPanel'
import UploadMain from '../upload/UploadMain'
import CropperPanel from '../crop/CropperPanel'
import CropperMain from '../crop/CropperMain'
import TunerPanel from '../tune/TunerPanel'
import TunerMain from '../tune/TunerMain'
import BuilderPanel from '../build/BuilderPanel'
import BuilderMain from '../build/BuilderMain'
import ResetProgressModal from '../build/ResetProgressModal'
import MobileBottomBar from '../mobile/MobileBottomBar'
import MobileControls from '../mobile/MobileControls'
import ProjectSelectionModal from '../project/ProjectSelectionModal'
import EditorSignInModal from '../account/EditorSignInModal'
import LimitReachedModal from '../account/LimitReachedModal'
import ProFeatureModal from '../account/ProFeatureModal'

// Below lg the editor switches to a fixed-viewport mobile shell: full-screen canvas with a step bar
// on top and controls in the thumb zone. Same breakpoint as Tailwind's `lg:` utilities.
const MOBILE_QUERY = '(max-width: 1023.98px)'

const PANEL_CLASS = 'min-h-[650px] max-h-[650px] [@media(min-height:800px)]:max-h-[750px] [@media(min-height:900px)]:max-h-[850px] bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <BackgroundOrbs />
      <div className="text-center relative z-10">
        <img src="/favicon.svg" alt="Loading..." className="animate-spin w-12 h-12 mb-4 mx-auto block" />
        <p className="text-white text-lg">Loading workspace...</p>
      </div>
    </div>
  )
}

export default function EditorScreen() {
  const { data: session, status } = useSession()

  const projectManager = useProjectManager()
  const { projects, createProject, createProjectFromCurrent, deleteProject, loadProject } = projectManager

  // Single autosave pipeline: watches the store, persists the snapshot
  // (DB when a project is loaded, localStorage draft otherwise)
  useAutosave()

  // Dice derivation pipeline: crop -> grid/stats -> preview image. Runs
  // independently of the visible step so restored states always regenerate.
  useDicePipeline()

  // Global keyboard shortcuts: undo/redo everywhere, arrow keys on the build step
  useEditorShortcuts()

  // Session / URL / draft arrival sequence; flips boot to 'ready'
  useEditorBootstrap(projectManager)

  // Calculate limits based on subscription plan
  const planType = (session?.user?.planType as PlanType) || 'explorer'
  const maxProjects = PLAN_LIMITS[planType].projectLimit

  // Store state
  const step = useEditorUiStore(state => state.step)
  const modal = useEditorUiStore(state => state.modal)
  const closeModal = useEditorUiStore(state => state.closeModal)

  const imageSrc = useProjectStore(state => state.imageSrc)
  const boot = useProjectStore(state => state.boot)

  const isMobile = useMediaQuery(MOBILE_QUERY)

  // Show loading screen while initializing or session is loading
  if (boot === 'booting' || status === 'loading') {
    return <LoadingScreen />
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

  const projectProps = {
    projects,
    onSelectProject: handleSelectProject,
    onCreateNew: createProject,
    onDeleteProject: deleteProject,
    maxProjects,
  }

  // Render main content based on current step. Steps render their own
  // loading state while the dice pipeline regenerates missing derived data.
  const renderMainContent = () => {
    switch (step) {
      case 'upload': return <UploadMain />
      case 'crop': return <CropperMain />
      case 'tune': return <TunerMain />
      case 'build': return <BuilderMain />
    }
  }

  return (
    <div className={`flex flex-col relative overflow-hidden ${isMobile ? 'h-[100dvh]' : 'min-h-screen'}`}>
      <BackgroundOrbs />

      {/* Header - desktop only; on mobile its functions fold into the bottom bar menu */}
      {!isMobile && <EditorHeader {...projectProps} />}

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

          <MobileBottomBar {...projectProps} />
        </main>
      ) : (
        <main className="relative p-1 sm:p-4 flex-grow">
          {/* Center: Stepper */}
          <div className="flex justify-center items-center mb-4">
            <DiceStepper />
          </div>

          {/* Step Content */}
          <div className="w-full mx-auto px-4 flex flex-row gap-6 items-stretch justify-center h-auto min-h-[calc(100vh-180px)]">
            {/* LEFT PANEL AREA - Sidebar */}
            <div className={`flex-shrink-0 flex flex-col w-[350px] min-w-[350px] max-w-[350px] ${PANEL_CLASS}`}>
              {step === 'upload' && <UploaderPanel />}
              {step === 'crop' && <CropperPanel />}
              {step === 'tune' && <TunerPanel />}
              {step === 'build' && <BuilderPanel />}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className={`flex items-center justify-center relative flex-grow w-auto min-w-[400px] max-w-[850px] overflow-hidden ${PANEL_CLASS}`}>
              {renderMainContent()}
            </div>
          </div>
        </main>
      )}

      <EditorSignInModal />

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
    </div>
  )
}
