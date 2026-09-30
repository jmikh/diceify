'use client'

import { ChevronLeft } from 'lucide-react'
import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'
import { STEP_LABELS, STEPS, stepIndex as indexOfStep } from '@/features/editor/steps'
import MobileMenu from './MobileMenu'
import { ProjectListMenuProps } from '@/components/Editor/ProjectListMenu'

type MobileBottomBarProps = Omit<ProjectListMenuProps, 'onClose'>

/**
 * Mobile step navigation bar, pinned at the bottom of the editor so all
 * controls stay in the thumb zone: back arrow, current step name with
 * progress dots, account menu and the primary "Next" action. Replaces the
 * desktop header + stepper and the per-panel navigation buttons on small
 * screens.
 */
export default function MobileBottomBar(projectProps: MobileBottomBarProps) {
    // Leaving the build step with progress opens the reset confirmation (mounted in the page)
    const { step, canGoNext, canGoBack, goNext, goBack } = useStepNavigation()

    const stepIndex = indexOfStep(step)
    const showNext = step !== 'build'

    return (
        <div className="relative flex items-center justify-center py-1.5">
            {/* Center cluster: back · step title/dots · next */}
            <div className="flex items-center gap-4">
                <button
                    onClick={goBack}
                    disabled={!canGoBack}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 active:bg-white/10 transition-colors disabled:opacity-0 disabled:pointer-events-none"
                    aria-label="Back"
                >
                    <ChevronLeft size={22} />
                </button>

                <div className="flex flex-col items-center min-w-[4.5rem]">
                    <span className="text-sm font-semibold text-white leading-tight">
                        {STEP_LABELS[step]}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        {STEPS.map((s, i) => (
                            <div
                                key={s}
                                className={`h-1.5 rounded-full transition-all ${i === stepIndex
                                    ? 'w-4 bg-pink-500'
                                    : `w-1.5 ${i < stepIndex ? 'bg-white/40' : 'bg-white/15'}`
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {showNext ? (
                    <button
                        onClick={goNext}
                        disabled={!canGoNext}
                        className="h-11 px-5 rounded-full bg-pink-500 active:bg-pink-600 text-white text-sm font-semibold shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all disabled:opacity-30 disabled:shadow-none"
                    >
                        Next
                    </button>
                ) : (
                    // Invisible placeholder keeps the cluster centered on the build step
                    <div className="w-[4.5rem] h-11" aria-hidden />
                )}
            </div>

            {/* Account menu - pinned right. No transform here: it would trap the
                dropdown's z-index in a lower stacking context (behind the canvas)
                and break its fixed-position backdrop */}
            <div className="absolute right-0 inset-y-0 flex items-center z-20">
                <MobileMenu {...projectProps} />
            </div>
        </div>
    )
}
