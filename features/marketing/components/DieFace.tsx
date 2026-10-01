import { DICE_RENDERING, getDotPositions, type DiceColor, type DiceFace } from '@/core/dice'

const SIZE = 100
const PIP_RADIUS = SIZE * DICE_RENDERING.DOT_RADIUS_FACTOR
const CORNER_RADIUS = SIZE * DICE_RENDERING.CORNER_RADIUS_FACTOR

interface DieFaceProps {
    face: DiceFace
    color: DiceColor
    className?: string
}

/** One decorative die, with the same pip layout and colors as the generated dice art. */
export default function DieFace({ face, color, className }: DieFaceProps) {
    const colors = DICE_RENDERING.COLORS[color]
    return (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} data-color={color} aria-hidden="true">
            <rect width={SIZE} height={SIZE} rx={CORNER_RADIUS} fill={colors.background} />
            {getDotPositions(face, SIZE).map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={PIP_RADIUS} fill={colors.dot} />
            ))}
        </svg>
    )
}
