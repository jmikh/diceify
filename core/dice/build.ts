// Build-step math: build order, run scanning, navigation, and the viewer's viewBox/window arithmetic.
// Pure functions over `DiceGrid` (`rows[y][x]`, y = 0 = bottom row). SVG rows are top-down: see `svgRow`.

import type { Die, GridPos } from './types'

// ---------------------------------------------------------------------------
// Build order: row by row from the bottom (y = 0), left to right.
// ---------------------------------------------------------------------------

/** Linear build index of a cell. */
export function buildIndex(pos: GridPos, width: number): number {
  return pos.y * width + pos.x
}

export function positionFromIndex(index: number, width: number): GridPos {
  return { x: index % width, y: Math.floor(index / width) }
}

/** Dice placed so far; `progress` is the die currently being placed, which is NOT counted. */
export function countCompleted(progress: GridPos, width: number): number {
  return buildIndex(progress, width)
}

/** Whether `cell` comes strictly before `progress` in build order. */
export function isCompleted(cell: GridPos, progress: GridPos): boolean {
  return cell.y < progress.y || (cell.y === progress.y && cell.x < progress.x)
}

// ---------------------------------------------------------------------------
// Runs of identical dice on a row. Only face and color matter (rotation is a
// rendering detail the builder does not distinguish).
// ---------------------------------------------------------------------------

export function sameDie(a: Die, b: Die): boolean {
  return a.face === b.face && a.color === b.color
}

/** Inclusive extent of the run of dice identical to `row[x]` that contains x. */
export function findRun(row: Die[], x: number): { start: number; end: number } {
  const die = row[x]
  let start = x
  while (start > 0 && sameDie(row[start - 1], die)) start--
  let end = x
  while (end < row.length - 1 && sameDie(row[end + 1], die)) end++
  return { start, end }
}

/** Column of the first die after x that differs from `row[x]`, or null if the rest of the row is identical. */
export function findNextDiff(row: Die[], x: number): number | null {
  const die = row[x]
  for (let i = x + 1; i < row.length; i++) {
    if (!sameDie(row[i], die)) return i
  }
  return null
}

/** Column of the last die before x that differs from `row[x]`, or null if the row start is identical. */
export function findPrevDiff(row: Die[], x: number): number | null {
  const die = row[x]
  for (let i = x - 1; i >= 0; i--) {
    if (!sameDie(row[i], die)) return i
  }
  return null
}

// ---------------------------------------------------------------------------
// Stepping through the build order.
// ---------------------------------------------------------------------------

/** Next die in build order, or null at the last die. */
export function nextPosition(pos: GridPos, width: number, height: number): GridPos | null {
  if (pos.x < width - 1) return { x: pos.x + 1, y: pos.y }
  if (pos.y < height - 1) return { x: 0, y: pos.y + 1 }
  return null
}

/** Previous die in build order, or null at the first die. */
export function prevPosition(pos: GridPos, width: number): GridPos | null {
  if (pos.x > 0) return { x: pos.x - 1, y: pos.y }
  if (pos.y > 0) return { x: width - 1, y: pos.y - 1 }
  return null
}

/** Free-plan rule: rows `0 .. rowLimit-1` may be built; `null` = unlimited. Backward moves are the caller's call. */
export function rowLimitAllows(target: GridPos, rowLimit: number | null): boolean {
  return rowLimit === null || target.y < rowLimit
}

/** Build-progress percentages reported to analytics when first passed (100 = the last die is reached). */
export const BUILD_MILESTONES = [25, 50, 75, 100] as const

/** Percent of the build done at build index `index`; the last die counts as 100 (there is no position past it). */
function reachedPercent(index: number, total: number): number {
  return index >= total - 1 ? 100 : (index / total) * 100
}

/** Milestones passed by a forward move from build index `from` to `to` on a grid of `total` dice. */
export function buildMilestonesCrossed(from: number, to: number, total: number): number[] {
  if (total <= 0 || to <= from) return []
  const before = reachedPercent(from, total)
  const after = reachedPercent(to, total)
  return BUILD_MILESTONES.filter((m) => before < m && after >= m)
}

// ---------------------------------------------------------------------------
// Viewer geometry. 1 viewBox unit = 1 die; SVG rows count from the top.
// ---------------------------------------------------------------------------

export function svgRow(y: number, height: number): number {
  return height - 1 - y
}

export function gridRowFromSvg(svgY: number, height: number): number {
  return height - 1 - svgY
}

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

/** Inclusive cell window in SVG coordinates (columns = grid x, rows = SVG rows). */
export interface CellWindow {
  x0: number
  x1: number
  y0: number
  y1: number
}

// Where the selector snaps to after a pan (fraction of the view width) and
// where it triggers one.
const SELECTOR_RESET_POSITION = 0.15
const SELECTOR_PAN_THRESHOLD = 0.85
// Extra space so highlights aren't cut off at the grid edge.
const EDGE_PADDING = 0.1
// Keep the selected die at least this far from the view edge.
const PADDING = 0.5

export interface ViewBoxInput {
  current: GridPos
  cols: number
  rows: number
  /** Number of dice shown horizontally. */
  zoomLevel: number
  /** Container width / height; the view matches it so the SVG fills the container exactly. */
  aspect: number
  /** Where the view settled last time (null on the first layout). */
  lastViewX: number | null
}

/**
 * The viewBox that shows `current`. The view only pans horizontally when the
 * selector crosses the pan threshold or leaves the view on the left; otherwise
 * the grid stays put. Per axis, a grid that fits is centered, otherwise the view
 * is clamped to the grid and nudged to keep the selected die visible.
 */
export function computeViewBox(input: ViewBoxInput): { viewBox: ViewBox; lastViewX: number } {
  const { current, cols, rows, zoomLevel, aspect, lastViewX } = input

  let viewWidth = Math.max(3, Math.min(zoomLevel, cols))
  let viewHeight = viewWidth / aspect
  if (viewHeight < 3) {
    viewHeight = 3
    viewWidth = viewHeight * aspect
  }

  const svgY = svgRow(current.y, rows)

  let viewX: number
  if (lastViewX === null) {
    viewX = current.x - viewWidth * SELECTOR_RESET_POSITION
  } else {
    const relativeX = (current.x - lastViewX) / viewWidth
    viewX = relativeX >= SELECTOR_PAN_THRESHOLD || relativeX < 0 ? current.x - viewWidth * SELECTOR_RESET_POSITION : lastViewX
  }

  let viewY = svgY - viewHeight * 0.6

  if (viewWidth >= cols + 2 * EDGE_PADDING) {
    viewX = (cols - viewWidth) / 2
  } else {
    viewX = Math.min(Math.max(viewX, -EDGE_PADDING), cols + EDGE_PADDING - viewWidth)
    if (current.x < viewX + PADDING) viewX = Math.max(-EDGE_PADDING, current.x - PADDING)
    if (current.x >= viewX + viewWidth - PADDING) {
      viewX = Math.min(cols + EDGE_PADDING - viewWidth, current.x - viewWidth + 1 + PADDING)
    }
  }

  if (viewHeight >= rows + 2 * EDGE_PADDING) {
    viewY = (rows - viewHeight) / 2
  } else {
    viewY = Math.min(Math.max(viewY, -EDGE_PADDING), rows + EDGE_PADDING - viewHeight)
    if (svgY < viewY + PADDING) viewY = Math.max(-EDGE_PADDING, svgY - PADDING)
    if (svgY >= viewY + viewHeight - PADDING) {
      viewY = Math.min(rows + EDGE_PADDING - viewHeight, svgY - viewHeight + 1 + PADDING)
    }
  }

  return { viewBox: { x: viewX, y: viewY, w: viewWidth, h: viewHeight }, lastViewX: viewX }
}

function clampWindow(view: ViewBox, cols: number, rows: number, padX: number, padY: number): CellWindow {
  return {
    x0: Math.max(0, Math.floor(view.x) - padX),
    x1: Math.min(cols - 1, Math.ceil(view.x + view.w) + padX),
    y0: Math.max(0, Math.floor(view.y) - padY),
    y1: Math.min(rows - 1, Math.ceil(view.y + view.h) + padY),
  }
}

/** Cells that must be in the DOM for `view`: the view rect plus `margin` dice on each side. */
export function visibleWindow(view: ViewBox, cols: number, rows: number, margin = 1): CellWindow {
  return clampWindow(view, cols, rows, margin, margin)
}

/** Cells to render when the visible window is not covered: one full viewport of buffer on each side. */
export function bufferedWindow(view: ViewBox, cols: number, rows: number): CellWindow {
  return clampWindow(view, cols, rows, Math.ceil(view.w), Math.ceil(view.h))
}

export function windowContains(outer: CellWindow, inner: CellWindow): boolean {
  return inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1
}
