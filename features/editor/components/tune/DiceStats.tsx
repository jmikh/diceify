'use client'

import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import AnimatedCount from '../common/AnimatedCount'

const swatchClass = 'w-3 h-3 rounded-[3px] border border-white/40 flex-shrink-0'

/** Black count · proportional bar · white count. */
export function DiceColorBar({ barClassName = 'w-[220px]' }: { barClassName?: string }) {
    const { blackCount, whiteCount, totalCount } = useDerivedStore(state => state.stats)
    return (
        <div className="flex items-center gap-2.5 text-[13px] text-white/75 tabular-nums">
            <span className="flex items-center gap-1.5">
                <span aria-hidden className={`${swatchClass} bg-black`} />
                <AnimatedCount value={blackCount} />
                <span className="sr-only">black</span>
            </span>
            <span aria-hidden className={`${barClassName} h-2 rounded-full overflow-hidden flex border border-white/20`}>
                {totalCount > 0 && (
                    <>
                        <span className="bg-black transition-all" style={{ width: `${(blackCount / totalCount) * 100}%` }} />
                        <span className="bg-white transition-all flex-1" />
                    </>
                )}
            </span>
            <span className="flex items-center gap-1.5">
                <AnimatedCount value={whiteCount} />
                <span className="sr-only">white</span>
                <span aria-hidden className={`${swatchClass} bg-white`} />
            </span>
        </div>
    )
}

/** Under the tune canvas: grid size, dice count and the black/white split. */
export function DiceStatsStrip() {
    const gridSize = useDerivedStore(state => state.gridSize)
    const totalCount = useDerivedStore(state => state.stats.totalCount)
    return (
        <div className="h-[60px] flex-shrink-0 flex items-center gap-7 px-6 border-t border-white/[0.06] text-sm text-white/60">
            {gridSize && (
                <span>
                    <b className="text-white font-semibold">{gridSize.width} × {gridSize.height}</b> grid
                </span>
            )}
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
