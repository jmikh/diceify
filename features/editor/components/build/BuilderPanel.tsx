'use client'

import { ChevronLeft } from 'lucide-react'
import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'
import { useBuildProgress } from '@/features/editor/hooks/useBuildProgress'
import { Inspector, InspectorSection, InspectorToolButton } from '../common/Inspector'
import { ghostButton } from '../common/ui'
import { CurrentGridSize, DiceColorBar } from '../tune/DiceStats'
import { BuildProgressBar, formatBuildPercent } from '@/components/BuildProgressBar'
import { useBuildTools } from './BuildTools'

/** Desktop inspector for the build step: progress, the grid size and black/white split, and tools (navigation, row/col and zoom live in BuildControlBar). */
export default function BuilderPanel() {
    // Leaving with progress goes through the reset confirmation (mounted in the page)
    const { goBack } = useStepNavigation()
    const { tools, modal } = useBuildTools()

    return (
        <Inspector
            title="Build"
            description="Place dice row by row, starting at the bottom left."
            footer={
                <button onClick={goBack} className={`${ghostButton} h-12 flex-1 text-sm`}>
                    <ChevronLeft size={17} />
                    Back to Tune
                </button>
            }
        >
            <BuildProgressSection />

            <InspectorSection label="Dice">
                <span className="text-sm text-white/60 tabular-nums">
                    <CurrentGridSize />
                </span>
                <DiceColorBar barClassName="flex-1" />
            </InspectorSection>

            <InspectorSection label="Tools">
                <div className="flex flex-col gap-1.5">
                    {tools.map(tool => (
                        <InspectorToolButton key={tool.key} icon={tool.icon} label={tool.label} onClick={tool.onSelect} pro={tool.pro} />
                    ))}
                </div>
            </InspectorSection>

            {modal}
        </Inspector>
    )
}

function BuildProgressSection() {
    const { currentIndex, totalDice, percent } = useBuildProgress()

    return (
        <InspectorSection label="Progress">
            <div className="flex items-center gap-3 text-sm tabular-nums">
                <BuildProgressBar percent={percent} />
                <span className="text-white font-semibold">{formatBuildPercent(percent)}</span>
            </div>
            <span className="text-sm text-white/60 tabular-nums">
                <b className="text-white font-semibold">{currentIndex.toLocaleString()}</b> / {totalDice.toLocaleString()} dice placed
            </span>
        </InspectorSection>
    )
}
