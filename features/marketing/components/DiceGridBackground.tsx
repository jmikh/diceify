import { DICE_RENDERING, getDotPositions, type DiceFace } from '@/core/dice'

/** Matches the 60px `.grid-overlay` lines (styles/base.css), so each die sits inside a grid cell. */
const CELL = 60
const DIE_INSET = 9
/** The pattern tile is TILE × TILE dice; big enough that the repeat is hard to spot. */
const TILE = 10
const SIZE = 100
const FACES = [1, 2, 3, 4, 5, 6] as const

/** Deterministic pseudo-random faces (sine hash) so the static export is stable. */
function tileFaces(): DiceFace[] {
  return Array.from({ length: TILE * TILE }, (_, i) => {
    const r = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1
    return FACES[Math.floor(r * 6)]
  })
}

/** Fixed, very faint grid of die outlines + pips behind the landing page. */
export default function DiceGridBackground() {
  const dieSize = CELL - DIE_INSET * 2
  return (
    <svg
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-[1] text-white opacity-[0.035]"
    >
      <defs>
        {FACES.map((face) => (
          <symbol key={face} id={`bg-die-${face}`} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <rect
              x={2} y={2} width={SIZE - 4} height={SIZE - 4}
              rx={SIZE * DICE_RENDERING.CORNER_RADIUS_FACTOR}
              fill="none" stroke="currentColor" strokeWidth={4}
            />
            {getDotPositions(face, SIZE).map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={SIZE * DICE_RENDERING.DOT_RADIUS_FACTOR} fill="currentColor" />
            ))}
          </symbol>
        ))}
        <pattern id="bg-dice-tile" width={CELL * TILE} height={CELL * TILE} patternUnits="userSpaceOnUse">
          {tileFaces().map((face, i) => (
            <use
              key={i}
              href={`#bg-die-${face}`}
              x={(i % TILE) * CELL + DIE_INSET}
              y={Math.floor(i / TILE) * CELL + DIE_INSET}
              width={dieSize}
              height={dieSize}
            />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-dice-tile)" />
    </svg>
  )
}
