'use client'

import { useEffect, useRef } from 'react'
import { DICE_RENDERING, getDotPositions, type DiceFace } from '@/core/dice'
import { useMediaQuery } from '@/lib/media-query'

/** Same pitch as the 60px `.grid-overlay` lines (styles/base.css); at the top of the page each die sits in a cell. */
const CELL = 60
const DIE_INSET = 9
/** The pattern tile is TILE × TILE dice; big enough that the repeat is hard to spot. */
const TILE = 10
const TILE_PX = CELL * TILE
/** The dice move at this fraction of the scroll speed, so they read as a layer behind the content. */
const PARALLAX = 0.35
const SIZE = 100
const FACES = [1, 2, 3, 4, 5, 6] as const

/** Deterministic pseudo-random faces (sine hash) so the static export is stable. */
function tileFaces(): DiceFace[] {
  return Array.from({ length: TILE * TILE }, (_, i) => {
    const r = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1
    return FACES[Math.floor(r * 6)]
  })
}

/** Fixed, very faint grid of die outlines + pips behind the landing page, with a slow parallax on scroll. */
export default function DiceGridBackground() {
  const ref = useRef<SVGSVGElement>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const dieSize = CELL - DIE_INSET * 2

  // Shift by the scaled scroll offset modulo one tile; the SVG is a tile taller than the viewport, so the pattern
  // never runs out and the wrap is invisible.
  useEffect(() => {
    const svg = ref.current
    if (!svg || reduceMotion) return
    const update = () => {
      svg.style.transform = `translate3d(0, ${-((window.scrollY * PARALLAX) % TILE_PX)}px, 0)`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      svg.style.transform = ''
    }
  }, [reduceMotion])

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      className="fixed top-0 left-0 w-full pointer-events-none z-[1] text-white opacity-[0.035] will-change-transform"
      style={{ height: `calc(100% + ${TILE_PX}px)` }}
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
        <pattern id="bg-dice-tile" width={TILE_PX} height={TILE_PX} patternUnits="userSpaceOnUse">
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
