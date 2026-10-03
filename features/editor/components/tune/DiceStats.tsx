'use client'

import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import AnimatedCount from '@/components/AnimatedCount'
import { DiceColorBar as DiceColorBarView, GridSize } from '@/components/DiceStats'

/** The current grid's black/white split. */
export function DiceColorBar({ barClassName }: { barClassName?: string }) {
    const { blackCount, whiteCount } = useDerivedStore(state => state.stats)
    return <DiceColorBarView blackCount={blackCount} whiteCount={whiteCount} barClassName={barClassName} />
}

/** Under the tune canvas: grid size, dice count and the black/white split. */
export function DiceStatsStrip() {
    const gridSize = useDerivedStore(state => state.gridSize)
    const totalCount = useDerivedStore(state => state.stats.totalCount)
    return (
        <div className="h-[60px] flex-shrink-0 flex items-center gap-7 px-6 border-t border-white/[0.06] text-sm text-white/60">
            {gridSize && <GridSize width={gridSize.width} height={gridSize.height} />}
            <span>
                <b className="text-white font-semibold tabular-nums"><AnimatedCount value={totalCount} /></b> dice
            </span>
            <span className="flex-1" />
            <DiceColorBar />
        </div>
    )
}

/** One line for the mobile tune stage: total and the split. */
export function DiceStatsInline() {
    const totalCount = useDerivedStore(state => state.stats.totalCount)
    return (
        <div className="flex items-center gap-3.5 text-xs text-white/60">
            <span>
                <b className="text-white font-semibold tabular-nums"><AnimatedCount value={totalCount} /></b> dice
            </span>
            <DiceColorBar barClassName="w-[70px]" />
        </div>
    )
}
