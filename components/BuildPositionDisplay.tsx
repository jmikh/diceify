import type { ReactNode } from 'react'

/** Row and column of the current die (1-based), shown between the build step's previous/next buttons. */
export default function BuildPositionDisplay({ row, col, className = '' }: { row: number; col: number; className?: string }) {
    return (
        <div className={`flex flex-shrink-0 rounded-2xl bg-white/[0.06] border border-white/[0.08] divide-x divide-white/[0.08] ${className}`}>
            <LabeledValue label="Row" value={row} testId="build-pos-y" />
            <LabeledValue label="Col" value={col} testId="build-pos-x" />
        </div>
    )
}

/** A small uppercase label over a bold number: the build step's row/col and the mobile build bar's stats. */
export function LabeledValue({
    label,
    value,
    testId,
    className = 'min-w-[3.5rem] px-2.5',
}: {
    label: ReactNode
    value: ReactNode
    testId?: string
    className?: string
}) {
    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">{label}</span>
            <span className="font-syne text-lg font-bold text-white tabular-nums leading-tight" data-testid={testId}>{value}</span>
        </div>
    )
}
