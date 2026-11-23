import { svgRow, type GridPos } from '@/core/dice'

const MASK_ID = 'build-unplaced-mask'
/** `mask` value for the dice layer (only one build viewer is mounted at a time, so the id is fixed). */
export const UNPLACED_MASK_URL = `url(#${MASK_ID})`

/** Opacity of the dice not placed yet. */
const UNPLACED_OPACITY = 0.35

interface UnplacedDiceMaskProps {
    current: GridPos
    cols: number
    rows: number
}

/**
 * Luminance mask that dims every die after `current` in build order (rows above it, and the dice right of it on
 * its row). Placed dice and the current one stay at full opacity. 1 viewBox unit = 1 die.
 */
export default function UnplacedDiceMask({ current, cols, rows }: UnplacedDiceMaskProps) {
    const currentSvgY = svgRow(current.y, rows)

    return (
        <defs>
            <mask id={MASK_ID} maskUnits="userSpaceOnUse" x={0} y={0} width={cols} height={rows}>
                <rect x={0} y={0} width={cols} height={rows} fill="white" fillOpacity={UNPLACED_OPACITY} />
                {/* Rows below the current one (built first) */}
                <rect x={0} y={currentSvgY + 1} width={cols} height={rows - currentSvgY - 1} fill="white" />
                {/* Current row up to the current die; reaches down into the rect above so their edge leaves no seam */}
                <rect x={0} y={currentSvgY} width={current.x + 1} height={rows - currentSvgY} fill="white" />
            </mask>
        </defs>
    )
}
