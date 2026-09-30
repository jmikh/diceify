import { svgRow, type GridPos } from '@/core/dice'

interface RunBadgesProps {
    /** Inclusive extent of identical dice around `current` on its row (see `findRun`). */
    run: { start: number; end: number }
    current: GridPos
    rows: number
}

const TRANSITION = { transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' } as const

interface BadgeProps {
    x: number
    y: number
    radius: number
    /** Stick from the badge towards the die, flipped when the badge sits below the die. */
    stick: { y1: number; y2: number }
    color: string
    label: string
}

function Badge({ x, y, radius, stick, color, label }: BadgeProps) {
    return (
        <g transform={`translate(${x}, ${y})`} style={TRANSITION}>
            <circle cx="0" cy="0" r={radius} style={{ fill: color, stroke: color }} fillOpacity="0.9" strokeWidth="0.04" strokeOpacity="1" />
            <line x1="0" y1={stick.y1} x2="0" y2={stick.y2} style={{ stroke: color }} strokeWidth="0.1" strokeOpacity="1" />
            <text x="0" y="0.05" fontSize="0.16" fill="#fff" textAnchor="middle">
                &times;{label}
            </text>
        </g>
    )
}

/**
 * Count badges over a run of identical dice: purple (over the first die of the
 * run) = run width, pink (over the current die) = dice left in the run
 * including this one. Hidden for a run of one.
 */
export default function RunBadges({ run, current, rows }: RunBadgesProps) {
    const groupWidth = run.end - run.start + 1
    if (groupWidth <= 1) return null

    const remaining = run.end - current.x + 1

    // Near the top of the grid the badges move below the die and the sticks flip
    const belowDie = current.y >= rows - 2
    const badgeY = svgRow(current.y, rows) + (belowDie ? 1.3 : -0.32)
    const flip = belowDie ? -1 : 1

    return (
        <>
            {/* Purple first so the pink badge draws on top when they overlap */}
            <Badge
                x={run.start + 0.5}
                y={badgeY}
                radius={0.20}
                stick={{ y1: 0.20 * flip, y2: 0.35 * flip }}
                color="var(--accent-purple)"
                label={String(groupWidth)}
            />
            <Badge
                x={current.x + 0.5}
                y={badgeY}
                radius={0.22}
                stick={{ y1: 0.22 * flip, y2: 0.35 * flip }}
                color="var(--pink)"
                label={String(remaining)}
            />
        </>
    )
}
