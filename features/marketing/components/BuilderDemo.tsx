'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { buildIndex, findRun, isCompleted, renderDefs, svgRow, symbolId } from '@/core/dice'
import { DieHighlight, RunBadges, RunHighlight } from '@/components/BuildHighlight'
import { BuildProgressBar, formatBuildPercent } from '@/components/BuildProgressBar'
import BuildPositionDisplay from '@/components/BuildPositionDisplay'
import { useMediaQuery } from '@/lib/media-query'
import { DEMO_GRID, DEMO_STEPS } from '../builderDemo'

const { width: COLS, height: ROWS } = DEMO_GRID
const TOTAL_DICE = COLS * ROWS
/** Time on each run before "next different die" is pressed again. */
const STEP_MS = 800
/** Pause on the finished heart before the build starts over. */
const FINISHED_MS = 3000
/** Dice still to place are faint ghosts of the finished art. */
const UNBUILT_OPACITY = 0.2
/** The dice of a placed run light up one after the other, this far apart. */
const PLACE_STAGGER_MS = 35
/** The whole grid is on screen, so the dice are small: the ×N badges are drawn bigger than in the editor. */
const BADGE_SCALE = 2.5
/** Room around the grid for the highlight's stroke and glow. */
const PAD = 0.3
/** With reduced motion the demo holds still a third of the way through. */
const STILL_STEP = Math.floor(DEMO_STEPS.length / 3)

const DEFS = renderDefs()
const CELLS = DEMO_GRID.rows.flatMap((row, y) => row.map((die, x) => ({ x, y, die })))

const navButton = 'flex items-center justify-center rounded-2xl h-10 w-11 sm:h-11 sm:w-14'
const secondaryButton = `${navButton} border border-white/10 bg-white/[0.06] text-white`
const primaryButton = `${navButton} relative bg-accent-pink-strong text-white shadow-[0_0_24px_rgb(var(--pink-rgb)/0.35)]`

/** A looping, non-interactive build of a small dice heart with the real builder's cursor, run box and badges. */
export default function BuilderDemo() {
    const frameRef = useRef<HTMLDivElement>(null)
    const onScreen = useOnScreen(frameRef)
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
    // Index into DEMO_STEPS; DEMO_STEPS.length = every die placed
    const [step, setStep] = useState(0)
    const playing = onScreen && !reduceMotion

    useEffect(() => {
        if (!playing) return
        const finished = step >= DEMO_STEPS.length
        const timer = window.setTimeout(() => setStep(finished ? 0 : step + 1), finished ? FINISHED_MS : STEP_MS)
        return () => window.clearTimeout(timer)
    }, [playing, step])

    const shown = reduceMotion ? STILL_STEP : step
    const current = DEMO_STEPS[shown] ?? null
    const previous = DEMO_STEPS[shown - 1] ?? null
    const position = current ?? DEMO_STEPS[DEMO_STEPS.length - 1]
    const placed = current ? buildIndex(current, COLS) : TOTAL_DICE
    const percent = (placed / TOTAL_DICE) * 100
    const run = current ? findRun(DEMO_GRID.rows[current.y], current.x) : null
    const currentSvgY = svgRow(position.y, ROWS)

    return (
        <div
            ref={frameRef}
            className="builder-demo"
            role="img"
            aria-label="Builder Studio demo: a heart made of dice is built row by row while the highlight jumps from one run of identical dice to the next"
        >
            <div className="builder-demo-progress">
                <BuildProgressBar percent={percent} />
                <span className="min-w-[3.25rem] text-right text-white font-semibold">{formatBuildPercent(percent)}</span>
                <span className="hidden sm:inline text-white/60">
                    <b className="text-white font-semibold">{placed}</b> / {TOTAL_DICE} dice placed
                </span>
            </div>

            <svg viewBox={`${-PAD} ${-PAD} ${COLS + 2 * PAD} ${ROWS + 2 * PAD}`} className="builder-demo-canvas">
                <g dangerouslySetInnerHTML={{ __html: DEFS }} />
                {CELLS.map(({ x, y, die }) => {
                    const done = !current || isCompleted({ x, y }, current)
                    // The run placed by the last tap lights up die by die, left to right
                    const delay = done && previous && y === previous.y && x >= previous.x ? (x - previous.x) * PLACE_STAGGER_MS : 0
                    return (
                        <use
                            key={`${x}-${y}`}
                            href={`#${symbolId(die.color, die.face)}`}
                            x={x}
                            y={svgRow(y, ROWS)}
                            width={1}
                            height={1}
                            className="builder-demo-die"
                            style={{ opacity: done ? 1 : UNBUILT_OPACITY, transitionDelay: `${delay}ms` }}
                        />
                    )
                })}
                {current && run && (
                    <>
                        <RunHighlight run={run} svgY={currentSvgY} />
                        <DieHighlight x={current.x} svgY={currentSvgY} />
                        <RunBadges run={run} current={current} rows={ROWS} scale={BADGE_SCALE} />
                    </>
                )}
            </svg>

            <div className="builder-demo-controls">
                <span className={secondaryButton}><ChevronsLeft size={22} /></span>
                <span className={secondaryButton}><ChevronLeft size={22} /></span>
                <BuildPositionDisplay row={position.y + 1} col={position.x + 1} className="h-10 sm:h-11 mx-0.5" />
                <span className={secondaryButton}><ChevronRight size={22} /></span>
                <span className={primaryButton}>
                    <ChevronsRight size={22} />
                    {/* Remounted on every step so the press plays once per tap */}
                    {playing && step > 0 && <span key={step} className="builder-demo-tap" />}
                </span>
            </div>
        </div>
    )
}

/** Whether the element is in the viewport (the demo only plays while visible). */
function useOnScreen(ref: RefObject<Element | null>): boolean {
    const [onScreen, setOnScreen] = useState(false)
    useEffect(() => {
        const element = ref.current
        if (!element) return
        const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
        observer.observe(element)
        return () => observer.disconnect()
    }, [ref])
    return onScreen
}
