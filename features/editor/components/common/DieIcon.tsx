import { DICE_RENDERING, getDotPositions, type DiceFace } from '@/core/dice'

interface DieIconProps {
  face: DiceFace
  /** `outline` follows `currentColor` (controls); black/white are the real dice colours. */
  tone?: 'outline' | 'black' | 'white'
  /** Pips turned 90° — the same transform the renderer applies to a `rotate90` die. */
  rotated?: boolean
  size: number
  className?: string
}

const BOX = 24
// The renderer's pip layout spans the whole die; at icon size that crowds the outline, so the layout is drawn in a
// smaller centred square (same pattern, more margin to the border).
const PIP_AREA = 16
const PIP_OFFSET = (BOX - PIP_AREA) / 2
const PIP_RADIUS = 1.8

/** A die face drawn from the renderer's own pip geometry, so icons match the dice art. */
export default function DieIcon({ face, tone = 'outline', rotated = false, size, className }: DieIconProps) {
  const colors =
    tone === 'outline'
      ? { background: 'none', dot: 'currentColor', stroke: 'currentColor' }
      : { ...DICE_RENDERING.COLORS[tone], stroke: DICE_RENDERING.COLORS.stroke }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`} aria-hidden className={className} style={{ flexShrink: 0 }}>
      <rect x="1.75" y="1.75" width="20.5" height="20.5" rx="4.5" fill={colors.background} stroke={colors.stroke} strokeWidth="1.5" />
      <g transform={rotated ? `rotate(90 ${BOX / 2} ${BOX / 2})` : undefined} style={{ transition: 'transform 0.3s ease' }}>
        {getDotPositions(face, PIP_AREA).map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx + PIP_OFFSET} cy={cy + PIP_OFFSET} r={PIP_RADIUS} fill={colors.dot} />
        ))}
      </g>
    </svg>
  )
}
