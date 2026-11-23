// The landing page's Builder Studio demo: a small dice heart and the positions the builder visits while building it.

import { findNextDiff, mapBrightnessToDie, type DiceGrid, type Die, type GridPos } from '@/core/dice'

const WIDTH = 21
const HEIGHT = 18

// Heart in a box from (-1.25, -1.3) to (1.25, 1.3), y up: two round lobes on top of a triangle down to the tip.
const LOBE_RADIUS = 0.5
const LOBE_X = 0.47
const LOBE_Y = 0.42
const TIP_Y = -0.92
const TRIANGLE_HALF_WIDTH = 0.97

/** Negative inside the heart, growing with the distance outside it (drives the glow). */
function heartDistance(x: number, y: number): number {
    const lobes = Math.min(Math.hypot(x - LOBE_X, y - LOBE_Y), Math.hypot(x + LOBE_X, y - LOBE_Y)) - LOBE_RADIUS
    const halfWidth = ((y - TIP_Y) / (LOBE_Y - TIP_Y)) * TRIANGLE_HALF_WIDTH
    const triangle = y <= LOBE_Y && y >= TIP_Y ? (Math.abs(x) - halfWidth) * 0.75 : 1
    return Math.min(lobes, triangle)
}

/** 0–255 for the cell at column `x`, SVG row `svgY`: a white heart lit from the top left, a dark glow around it. */
function brightness(x: number, svgY: number): number {
    const hx = ((x + 0.5) / WIDTH - 0.5) * 2.5
    const hy = (0.5 - (svgY + 0.5) / HEIGHT) * 2.55 + 0.02
    const distance = heartDistance(hx, hy)
    if (distance <= 0) return 255 - Math.hypot(hx + 0.5, hy - 0.6) * 85
    return Math.max(0, 70 - distance * 260)
}

function heartGrid(): DiceGrid {
    const rows: Die[][] = []
    for (let y = 0; y < HEIGHT; y++) {
        const svgY = HEIGHT - 1 - y
        rows.push(Array.from({ length: WIDTH }, (_, x) => mapBrightnessToDie(brightness(x, svgY), 'both')))
    }
    return { width: WIDTH, height: HEIGHT, rows }
}

/** Every "next different die" stop from the first die: the start of each run of identical dice, in build order. */
function runStarts(grid: DiceGrid): GridPos[] {
    const steps: GridPos[] = []
    grid.rows.forEach((row, y) => {
        for (let x: number | null = 0; x !== null; x = findNextDiff(row, x)) steps.push({ x, y })
    })
    return steps
}

export const DEMO_GRID = heartGrid()
export const DEMO_STEPS = runStarts(DEMO_GRID)
