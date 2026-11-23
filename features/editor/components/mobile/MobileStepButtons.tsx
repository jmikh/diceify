'use client'

import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'
import { nextStep, prevStep, STEP_LABELS } from '@/features/editor/steps'
import { panel, primaryFill } from '../common/ui'
import { mainRow, mainRowItem } from './rows'

// Step back/next for the mobile editor: the same buttons in the same places on every step.
// Leaving the build step with progress opens the reset confirmation (mounted in the page).

const stepButton = `flex-shrink-0 w-11 ${mainRowItem} rounded-[14px]`

/** A step's main row, one card: back on the left, the step's control (`children`, which fills the rest), next on the right. */
export function MobileStepRow({ children }: { children: ReactNode }) {
    return (
        <div className={`${mainRow} ${panel} rounded-[20px] px-2 flex items-center gap-2`}>
            <MobileStepBack />
            {children}
            <MobileStepNext />
        </div>
    )
}

/** Back to the previous step; nothing on the first step. */
function MobileStepBack() {
    const { step, goBack } = useStepNavigation()
    const previous = prevStep(step)
    if (!previous) return null
    return (
        <button
            onClick={goBack}
            aria-label={`Back to ${STEP_LABELS[previous]}`}
            className={`${stepButton} flex items-center justify-center border border-white/10 bg-white/5 text-white/85 active:bg-white/10`}
        >
            <ChevronLeft size={20} />
        </button>
    )
}

/** On to the next step (a lock while the paywall blocks it); nothing on the last step. */
function MobileStepNext() {
    const { step, canGoNext, nextLocked, goNext } = useStepNavigation()
    const next = nextStep(step)
    if (!next) return null
    return (
        <button
            onClick={goNext}
            disabled={!canGoNext}
            aria-label={`Next: ${STEP_LABELS[next]}${nextLocked ? ' (upgrade required)' : ''}`}
            className={`${primaryFill} ${stepButton}`}
        >
            {nextLocked ? <Lock size={18} /> : <ChevronRight size={20} />}
        </button>
    )
}
