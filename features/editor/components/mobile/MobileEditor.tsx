'use client'

import { RotateCw } from 'lucide-react'
import type { Step } from '@/features/editor/steps'
import CropperMain from '../crop/CropperMain'
import { useCropControls } from '../crop/CropperPanel'
import TunerMain from '../tune/TunerMain'
import { DiceStatsInline } from '../tune/DiceStats'
import BuilderMain from '../build/BuilderMain'
import BuildZoomButtons from '../build/BuildZoomButtons'
import { panel } from '../common/ui'
import MobileControls from './MobileControls'
import MobileTopBar from './MobileTopBar'

/** Rotate 90° on the crop canvas (where the build step keeps its zoom buttons). */
function CropRotateButton() {
    const { rotate } = useCropControls()
    return (
        <button
            onClick={rotate}
            aria-label="Rotate 90°"
            className={`absolute bottom-3 right-3 z-10 w-11 h-10 flex items-center justify-center rounded-xl text-white/85 active:bg-white/10 ${panel}`}
        >
            <RotateCw size={18} />
        </button>
    )
}

/** Mobile shell: top bar, the stage (crop: rotate on it; build: zoom on it), and the step's controls (with step back/next) in the thumb zone below the art. */
export default function MobileEditor({ step }: { step: Step }) {
    return (
        <>
            <MobileTopBar />
            <section aria-label="Canvas" className={`relative z-10 flex-1 min-h-0 mx-4 mt-2 rounded-[22px] overflow-hidden ${panel}`}>
                {step === 'crop' && (
                    <>
                        <CropperMain />
                        <CropRotateButton />
                    </>
                )}
                {step === 'tune' && (
                    <>
                        <div className="w-full h-full px-4 pt-4 pb-11">
                            <TunerMain />
                        </div>
                        <div className="absolute inset-x-0 bottom-3 flex justify-center">
                            <DiceStatsInline />
                        </div>
                    </>
                )}
                {step === 'build' && (
                    <>
                        <BuilderMain />
                        <BuildZoomButtons
                            className={`absolute top-3 right-3 z-10 flex rounded-xl overflow-hidden divide-x divide-white/[0.08] ${panel}`}
                            buttonClassName="w-11 h-10 flex items-center justify-center text-white/85 active:bg-white/10 disabled:opacity-35"
                        />
                    </>
                )}
            </section>
            <div className="relative z-20 flex-shrink-0 mx-4 mt-2.5" style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
                <MobileControls />
            </div>
        </>
    )
}
