export const formatBuildPercent = (percent: number) => (percent >= 100 ? 'Done' : `${percent.toFixed(1)}%`)

/** A thin pink progress bar (dice placed / total). */
export function BuildProgressBar({ percent, className = 'h-2' }: { percent: number; className?: string }) {
    return (
        <span aria-hidden className={`flex-1 block rounded-full bg-white/10 overflow-hidden ${className}`}>
            <span className="block h-full rounded-full bg-accent-pink transition-all duration-300" style={{ width: `${percent}%` }} />
        </span>
    )
}
