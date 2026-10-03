'use client'

import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'
import { nextStep, prevStep, STEP_LABELS } from '@/features/editor/steps'
import { primaryFill } from '../common/ui'
import { mainRow } from './rows'

// Step back/next for the mobile editor: the same buttons in the same places on every step.
// Leaving the build step with progress opens the reset confirmation (mounted in the page).

const stepButton = 'flex-shrink-0 w-11 rounded-[14px]'

/** A step's main row: back on the left, the step's control (`children`, which fills the rest), next on the right. */
export function MobileStepRow({ children }: { children: ReactNode }) {
    return (
        <div className={`${mainRow} flex gap-2`}>
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

/** On to the next step; nothing on the last step. */
function MobileStepNext() {
    const { step, canGoNext, goNext } = useStepNavigation()
    const next = nextStep(step)
    if (!next) return null
    return (
        <button onClick={goNext} disabled={!canGoNext} aria-label={`Next: ${STEP_LABELS[next]}`} className={`${primaryFill} ${stepButton}`}>
            <ChevronRight size={20} />
        </button>
    )
}
