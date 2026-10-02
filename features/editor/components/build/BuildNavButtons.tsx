'use client'

import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useBuildNavigation } from '@/features/editor/hooks/useBuildNavigation'
import { primaryFill } from '../common/ui'

const secondary =
    'flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12] transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

interface BuildNavButtonsProps {
    /** Layout of the row. */
    className: string
    /** Size of each button. */
    buttonClassName: string
    /** Rendered between "previous" and "next". */
    children?: ReactNode
}

/** Previous change · previous · [children] · next · next change (primary). */
export default function BuildNavButtons({ className, buttonClassName, children }: BuildNavButtonsProps) {
    const { canNavigate, navigatePrev, navigateNext, navigatePrevDiff, navigateNextDiff } = useBuildNavigation()
    return (
        <div className={className}>
            <button onClick={navigatePrevDiff} disabled={!canNavigate.prevDiff} className={`${secondary} ${buttonClassName}`} title="Previous different die" aria-label="Previous different die">
                <ChevronsLeft size={24} />
            </button>
            <button onClick={navigatePrev} disabled={!canNavigate.prev} className={`${secondary} ${buttonClassName}`} title="Previous die" aria-label="Previous die">
                <ChevronLeft size={24} />
            </button>
            {children}
            <button onClick={navigateNext} disabled={!canNavigate.next} className={`${secondary} ${buttonClassName}`} title="Next die" aria-label="Next die">
                <ChevronRight size={24} />
            </button>
            <button onClick={navigateNextDiff} disabled={!canNavigate.nextDiff} className={`${primaryFill} ${buttonClassName} rounded-2xl`} title="Next different die" aria-label="Next different die">
                <ChevronsRight size={24} />
            </button>
        </div>
    )
}
