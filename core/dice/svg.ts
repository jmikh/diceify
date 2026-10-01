// SVG string rendering of dice grids. Pure string building; 1 viewBox unit = 1 die, rows top-down
// (`svgRow`). Replaces lib/dice/svg-renderer.ts; output of `renderGridSvg` is byte-equivalent to the old
// `render` (modulo whitespace), so blueprints and rasters look the same.

import { countCompleted, isCompleted, svgRow, type CellWindow } from './build'
import { DICE_RENDERING, getDotPositions } from './geometry'
import type { DiceColor, DiceFace, DiceGrid, GridPos } from './types'

/** Symbol/side length every die is drawn in; the outer element scales it to 1 unit. */
const DIE_SIZE = 100

/** Progress preview: cream background, unbuilt dice drawn as faint ghosts of the final art. */
export const PROGRESS_STYLE = { background: '#eae3d2', unbuiltOpacity: 0.15 } as const

const SVG_XMLNS = 'http://www.w3.org/2000/svg'

export function symbolId(color: DiceColor, face: DiceFace): string {
  return `dice-${color}-${face}`
}

/** Inner markup of one die in a 0 0 100 100 viewBox (background, border and dots). */
export function renderDieSymbolBody(face: DiceFace, color: DiceColor, rotate90 = false): string {
  const colors = DICE_RENDERING.COLORS[color]
  const radius = DIE_SIZE * DICE_RENDERING.DOT_RADIUS_FACTOR
  const strokeWidth = DIE_SIZE * DICE_RENDERING.BORDER_WIDTH_FACTOR
  const cornerRadius = DIE_SIZE * DICE_RENDERING.CORNER_RADIUS_FACTOR

  const open = rotate90 ? `<g transform='rotate(90 ${DIE_SIZE / 2} ${DIE_SIZE / 2})'>` : '<g>'
  const rect = `<rect width='100%' height='100%' fill='${colors.background}' stroke-width='${strokeWidth}%' rx='${cornerRadius}%' stroke='${DICE_RENDERING.COLORS.stroke}' />`
  const dots = getDotPositions(face, DIE_SIZE)
    .map(([cx, cy]) => `<circle cx='${cx}%' cy='${cy}%' r='${radius}%' fill='${colors.dot}' />`)
    .join('')
  return `${open}${rect}${dots}</g>`
}

/** `<defs>` with one `<symbol id='dice-{color}-{face}'>` per die; `renderWindowSvg` references them via `<use>`. */
export function renderDefs(): string {
  const symbols: string[] = []
  for (const color of ['black', 'white'] as const) {
    for (let face = 1; face <= 6; face++) {
      symbols.push(
        `<symbol id='${symbolId(color, face as DiceFace)}' viewBox='0 0 ${DIE_SIZE} ${DIE_SIZE}'>${renderDieSymbolBody(face as DiceFace, color)}</symbol>`,
      )
    }
  }
  return `<defs>${symbols.join('')}</defs>`
}

/** One die as a nested `<svg>` at cell (x, svgY). */
function renderDieElement(grid: DiceGrid, x: number, y: number): string {
  const die = grid.rows[y][x]
  const body = renderDieSymbolBody(die.face, die.color, die.rotate90 === true)
  return `<svg x='${x}' y='${svgRow(y, grid.height)}' width='1' height='1' viewBox='0 0 ${DIE_SIZE} ${DIE_SIZE}'>${body}</svg>`
}

/**
 * Dice inside `win` (inclusive, clamped to the grid; rows are SVG rows) as `<use>` references,
 * preceded by `renderDefs()`. Meant to be injected inside the viewer's own `<svg>`.
 */
export function renderWindowSvg(grid: DiceGrid, win: CellWindow): string {
  const x0 = Math.max(0, win.x0)
  const x1 = Math.min(grid.width - 1, win.x1)
  const y0 = Math.max(0, win.y0)
  const y1 = Math.min(grid.height - 1, win.y1)

  const uses: string[] = []
  for (let x = x0; x <= x1; x++) {
    for (let svgY = y0; svgY <= y1; svgY++) {
      const die = grid.rows[svgRow(svgY, grid.height)][x]
      const rotation = die.rotate90 ? ` transform='rotate(90 ${x + 0.5} ${svgY + 0.5})'` : ''
      uses.push(`<use href='#${symbolId(die.color, die.face)}' x='${x}' y='${svgY}' width='1' height='1'${rotation}/>`)
    }
  }
  return `${renderDefs()}${uses.join('')}`
}

export interface SvgSize {
  width: number
  height: number
}

export interface GridSvgOptions extends Partial<SvgSize> {
  background?: string
}

/** Standalone `<svg>` wrapper. With a size the header carries width/height (rasterizing); otherwise it fills its box. */
function wrapSvg(cols: number, rows: number, background: string, size: Partial<SvgSize>, body: string): string {
  const sizing =
    size.width !== undefined && size.height !== undefined
      ? `width="${size.width}" height="${size.height}"`
      : `style="width: 100%; height: 100%; image-rendering: crisp-edges; background-color: ${background};"`
  return `<svg xmlns="${SVG_XMLNS}" viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="xMidYMid meet" ${sizing}>
<rect width="${cols}" height="${rows}" fill="${background}" />
${body}
</svg>`
}

/** The whole grid as a standalone SVG document (blueprint download, raster preview). */
export function renderGridSvg(grid: DiceGrid, opts: GridSvgOptions = {}): string {
  const { background = '#000000', width, height } = opts
  const elements: string[] = []
  for (let x = 0; x < grid.width; x++) {
    for (let y = 0; y < grid.height; y++) {
      elements.push(renderDieElement(grid, x, y))
    }
  }
  return wrapSvg(grid.width, grid.height, background, { width, height }, elements.join('\n'))
}

export interface ProgressSvgOptions extends GridSvgOptions {
  /** Render every die as placed (the "Full" toggle). */
  showAll?: boolean
}

/** The grid with the dice placed before `progress` drawn normally; the rest at `PROGRESS_STYLE.unbuiltOpacity`. */
export function renderProgressSvg(grid: DiceGrid, progress: GridPos, opts: ProgressSvgOptions = {}): string {
  const { background = PROGRESS_STYLE.background, showAll = false, width, height } = opts
  const elements: string[] = []
  for (let x = 0; x < grid.width; x++) {
    for (let y = 0; y < grid.height; y++) {
      const die = renderDieElement(grid, x, y)
      elements.push(
        showAll || isCompleted({ x, y }, progress) ? die : `<g opacity='${PROGRESS_STYLE.unbuiltOpacity}'>${die}</g>`,
      )
    }
  }
  return wrapSvg(grid.width, grid.height, background, { width, height }, elements.join('\n'))
}

/** Number of dice `renderProgressSvg` draws for `progress` (handy for tests and captions). */
export function placedDiceCount(grid: DiceGrid, progress: GridPos): number {
  return Math.min(grid.width * grid.height, countCompleted(progress, grid.width))
}

/** Raster dimensions with `longSide` pixels on the longer axis, preserving the grid's aspect ratio. */
export function rasterSize(cols: number, rows: number, longSide: number): SvgSize {
  if (cols >= rows) {
    return { width: longSide, height: Math.round(longSide * (rows / cols)) }
  }
  return { width: Math.round(longSide * (cols / rows)), height: longSide }
}
