'use client'

import { Toaster } from 'sonner'
import BackgroundOrbs from '@/components/BackgroundOrbs'
import { useMediaQuery } from '@/lib/media-query'
import { useUser } from '@/features/account/useUser'

import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { useAutosave } from '@/features/editor/hooks/useAutosave'
import { useDicePipeline } from '@/features/editor/hooks/useDicePipeline'
import { useEditorShortcuts } from '@/features/editor/hooks/useEditorShortcuts'
import { useEditorBootstrap } from '@/features/editor/hooks/useEditorBootstrap'
import { useProjectPreviewSync } from '@/features/editor/hooks/useProjectPreviewSync'
import type { Step } from '@/features/editor/steps'

import EditorHeader from './EditorHeader'
import CropperPanel from '../crop/CropperPanel'
import CropperMain from '../crop/CropperMain'
import TunerPanel from '../tune/TunerPanel'
import TunerMain from '../tune/TunerMain'
import { DiceStatsStrip } from '../tune/DiceStats'
import BuilderPanel from '../build/BuilderPanel'
import BuilderMain from '../build/BuilderMain'
import BuildControlBar from '../build/BuildControlBar'
import ResetProgressModal from '../build/ResetProgressModal'
import MobileEditor from '../mobile/MobileEditor'
import StartScreen from '../start/StartScreen'
import EditorSignInModal from '../account/EditorSignInModal'
import LimitReachedModal from '../account/LimitReachedModal'
import ProFeatureModal from '../account/ProFeatureModal'
import ShareModal from '../share/ShareModal'
import { panel } from '../common/ui'

// Below lg the editor switches to the mobile shell (MobileEditor): stage on top, controls in the thumb zone. Same
// breakpoint as Tailwind's `lg:` utilities.
const MOBILE_QUERY = '(max-width: 1023.98px)'

// The desktop canvas content per step; each renders its own loading state while the dice pipeline regenerates.
const STEP_MAIN: Record<Step, () => JSX.Element> = {
  crop: () => <CropperMain />,
  tune: () => (
    <div className="w-full h-full p-6">
      <TunerMain />
    </div>
  ),
  build: () => <BuilderMain />,
}

function LoadingScreen() {
  return (
    <div className="h-[100dvh] flex items-center justify-center relative overflow-hidden">
      <BackgroundOrbs />
      <div className="text-center relative z-10">
        <img src="/favicon.svg" alt="Loading..." className="animate-spin w-12 h-12 mb-4 mx-auto block" />
        <p className="text-white text-lg">Loading workspace...</p>
      </div>
    </div>
  )
}

/** Desktop (direction A): header, canvas panel with its under-canvas strip, inspector on the right. */
function DesktopEditor({ step }: { step: Step }) {
  return (
    <>
      <EditorHeader />
      <main className="relative z-10 flex-1 min-h-0 flex gap-4 px-6 pt-2 pb-6">
        <section aria-label="Canvas" className={`flex-1 min-w-0 flex flex-col rounded-3xl overflow-hidden ${panel}`}>
          <div className="relative flex-1 min-h-0">{STEP_MAIN[step]()}</div>
          {step === 'tune' && <DiceStatsStrip />}
          {step === 'build' && <BuildControlBar />}
        </section>
        <aside aria-label="Settings" className={`w-[344px] flex-shrink-0 flex flex-col rounded-3xl ${panel}`}>
          {step === 'crop' && <CropperPanel />}
          {step === 'tune' && <TunerPanel />}
          {step === 'build' && <BuilderPanel />}
        </aside>
      </main>
    </>
  )
}

export default function EditorScreen() {
  const { status } = useUser()

  // Single autosave pipeline: watches the store, persists the snapshot
  // (project row when a project is loaded, local draft otherwise)
  useAutosave()

  // Dice derivation pipeline: crop -> grid/stats -> preview image. Runs
  // independently of the visible step so restored states always regenerate.
  useDicePipeline()

  // Global keyboard shortcuts: undo/redo everywhere, arrow keys on the build step
  useEditorShortcuts()

  // Session / URL / draft arrival sequence; flips boot to 'ready'
  useEditorBootstrap()

  // The open project's thumbnail follows its cropped photo
  useProjectPreviewSync()

  // Store state
  const step = useEditorUiStore(state => state.step)
  const startOpen = useEditorUiStore(state => state.startOpen)

  const hasImage = useProjectStore(state => state.imageSrc !== null)
  const boot = useProjectStore(state => state.boot)

  const isMobile = useMediaQuery(MOBILE_QUERY)

  // Show loading screen while initializing or the auth state is unknown
  if (boot === 'booting' || status === 'loading') {
    return <LoadingScreen />
  }

  // The whole editor is one viewport: nothing scrolls the page
  return (
    <div className="h-[100dvh] flex flex-col relative overflow-hidden">
      <BackgroundOrbs />

      {/* No photo yet (or "New project" over the open one): the Start screen */}
      {!hasImage || startOpen ? (
        <StartScreen />
      ) : isMobile ? (
        <MobileEditor step={step} />
      ) : (
        <DesktopEditor step={step} />
      )}

      {/* Modals and toasts mounted once, over the Start screen and the editor alike */}
      <EditorSignInModal />
      <LimitReachedModal />
      <ProFeatureModal />
      <ResetProgressModal />
      <ShareModal />
      <Toaster theme="dark" position="bottom-center" closeButton />
    </div>
  )
}
