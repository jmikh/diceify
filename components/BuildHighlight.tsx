import { svgRow, type GridPos } from '@/core/dice'

// The build cursor drawn over a dice grid (1 viewBox unit = 1 die): the editor's build viewer and the landing page's
// builder demo. `svgY` is the current die's SVG row (`svgRow`).

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const MOVE_TRANSITION = `x 0.5s ${EASE}, y 0.5s ${EASE}`
const BADGE_TRANSITION = { transition: `transform 0.5s ${EASE}` } as const

/** Inclusive extent of identical dice around the current die on its row (see `findRun`). */
export interface DiceRun {
    start: number
    end: number
}

/** Rectangle over the run of identical dice (draw it behind `DieHighlight`; same size as it for a run of one). */
export function RunHighlight({ run, svgY }: { run: DiceRun; svgY: number }) {
    return (
        <rect
            x={run.start + 0.02}
            y={svgY + 0.02}
            width={run.end - run.start + 1 - 0.04}
            height={1 - 0.04}
            fillOpacity="0.1"
            strokeWidth="0.06"
            strokeOpacity="1"
            rx="0.1"
            style={{
                fill: 'var(--accent-blue)',
                stroke: 'var(--accent-purple)',
                transition: `${MOVE_TRANSITION}, width 0.5s ${EASE}`,
                willChange: 'x, y, width',
            }}
        />
    )
}

/** The glowing pink box on the current die; it glides to each new position. */
export function DieHighlight({ x, svgY }: { x: number; svgY: number }) {
    return (
        <rect
            x={x + 0.02}
            y={svgY + 0.02}
            width={0.96}
            height={0.96}
            fillOpacity="0.2"
            strokeWidth="0.06"
            rx="0.1"
            style={{
                fill: 'var(--pink)',
                stroke: 'var(--pink)',
                transition: MOVE_TRANSITION,
                filter: 'drop-shadow(0 0 2px rgb(var(--pink-rgb)/0.8))',
                willChange: 'x, y',
            }}
        />
    )
}

interface BadgeProps {
    x: number
    y: number
    scale: number
    radius: number
    /** Stick from the badge towards the die, flipped when the badge sits below the die. */
    stick: { y1: number; y2: number }
    color: string
    label: string
}

function Badge({ x, y, scale, radius, stick, color, label }: BadgeProps) {
    return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`} style={BADGE_TRANSITION}>
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
export function RunBadges({
    run,
    current,
    rows,
    scale = 1,
}: {
    run: DiceRun
    current: GridPos
    rows: number
    /** Badge size multiplier, for a viewer that shows the dice small (the landing demo). */
    scale?: number
}) {
    const groupWidth = run.end - run.start + 1
    if (groupWidth <= 1) return null

    const remaining = run.end - current.x + 1

    // Near the top of the grid the badges move below the die and the sticks flip. The stick (0.35 from the badge's
    // centre) ends just inside the die's edge at any scale.
    const belowDie = current.y >= rows - 2
    const dieTop = svgRow(current.y, rows)
    const badgeY = belowDie ? dieTop + 0.95 + 0.35 * scale : dieTop + 0.03 - 0.35 * scale
    const flip = belowDie ? -1 : 1

    return (
        <>
            {/* Purple first so the pink badge draws on top when they overlap */}
            <Badge
                x={run.start + 0.5}
                y={badgeY}
                scale={scale}
                radius={0.20}
                stick={{ y1: 0.20 * flip, y2: 0.35 * flip }}
                color="var(--accent-purple)"
                label={String(groupWidth)}
            />
            <Badge
                x={current.x + 0.5}
                y={badgeY}
                scale={scale}
                radius={0.22}
                stick={{ y1: 0.22 * flip, y2: 0.35 * flip }}
                color="var(--pink)"
                label={String(remaining)}
            />
        </>
    )
}
