'use client'

import { useBuildNavigation } from '@/features/editor/hooks/useBuildNavigation'

/** The current row/col, shown between the previous/next buttons (desktop bar and mobile tool row). */
export default function BuildPosition({ className = '' }: { className?: string }) {
    const { current } = useBuildNavigation()
    return (
        <div className={`flex flex-shrink-0 rounded-2xl bg-white/[0.06] border border-white/[0.08] divide-x divide-white/[0.08] ${className}`}>
            <PositionValue label="Row" value={current.y + 1} testId="build-pos-y" />
            <PositionValue label="Col" value={current.x + 1} testId="build-pos-x" />
        </div>
    )
}

function PositionValue({ label, value, testId }: { label: string; value: number; testId: string }) {
    return (
        <div className="min-w-[3.5rem] px-2.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-white/55">{label.toUpperCase()}</span>
            <span className="font-syne text-lg font-bold text-white tabular-nums leading-tight" data-testid={testId}>{value}</span>
        </div>
    )
}
