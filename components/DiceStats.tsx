import AnimatedCount from './AnimatedCount'

const swatchClass = 'w-3 h-3 rounded-[3px] border border-white/40 flex-shrink-0'

/** Black count · proportional bar · white count. */
export function DiceColorBar({
    blackCount,
    whiteCount,
    barClassName = 'w-[220px]',
}: {
    blackCount: number
    whiteCount: number
    barClassName?: string
}) {
    const totalCount = blackCount + whiteCount
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

/** "W × H grid". */
export function GridSize({ width, height }: { width: number; height: number }) {
    return (
        <span>
            <b className="text-white font-semibold">{width} × {height}</b> grid
        </span>
    )
}
