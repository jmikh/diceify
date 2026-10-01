'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'
import { nextStep, prevStep, STEP_LABELS } from '@/features/editor/steps'
import { primaryFill } from '../common/ui'

// Step back/next for the mobile editor, flanking each step's control row; the caller sizes them via `className`.
// Leaving the build step with progress opens the reset confirmation (mounted in the page).

/** Back to the previous step; nothing on the first step. */
export function MobileStepBack({ className }: { className: string }) {
    const { step, goBack } = useStepNavigation()
    const previous = prevStep(step)
    if (!previous) return null
    return (
        <button
            onClick={goBack}
            aria-label={`Back to ${STEP_LABELS[previous]}`}
            className={`flex-shrink-0 flex items-center justify-center border border-white/10 bg-white/5 text-white/85 active:bg-white/10 ${className}`}
        >
            <ChevronLeft size={20} />
        </button>
    )
}

/** On to the next step; nothing on the last step. */
export function MobileStepNext({ className }: { className: string }) {
    const { step, canGoNext, goNext } = useStepNavigation()
    const next = nextStep(step)
    if (!next) return null
    return (
        <button onClick={goNext} disabled={!canGoNext} aria-label={`Next: ${STEP_LABELS[next]}`} className={`${primaryFill} flex-shrink-0 ${className}`}>
            <ChevronRight size={20} />
        </button>
    )
}
