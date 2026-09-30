// Build-step navigation as plain functions over the stores, so the global key handler and the React hook
// (`useBuildNavigation`) share one implementation of the scan and row-limit logic.

import {
  buildIndex,
  findNextDiff,
  findPrevDiff,
  nextPosition,
  prevPosition,
  rowLimitAllows,
  type DiceGrid,
  type GridPos,
} from '@/core/dice'
import { useDerivedStore } from './useDerivedStore'
import { useDocumentStore } from './useDocumentStore'

/** Rows a user may build (`null` = unlimited) and what to do when a forward move is past them. */
export interface BuildGate {
  rowLimit: number | null
  onBlocked: () => void
}

export interface BuildTargets {
  prev: GridPos | null
  next: GridPos | null
  prevDiff: GridPos | null
  nextDiff: GridPos | null
}

const NO_TARGETS: BuildTargets = { prev: null, next: null, prevDiff: null, nextDiff: null }

/**
 * Where each navigation action would land from `pos`. Diff jumps are row-local: the previous/next die on this
 * row that differs from the current one; when the rest of the row is identical they fall through to the far
 * end of the adjacent row. `null` = nowhere to go.
 */
export function buildTargets(grid: DiceGrid | null, pos: GridPos): BuildTargets {
  if (!grid) return NO_TARGETS
  const { width, height, rows } = grid
  const row = rows[pos.y]
  const die = row?.[pos.x] ?? null
  const prevX = die ? findPrevDiff(row, pos.x) : null
  const nextX = die ? findNextDiff(row, pos.x) : null
  return {
    prev: prevPosition(pos, width),
    next: nextPosition(pos, width, height),
    prevDiff: prevX !== null ? { x: prevX, y: pos.y } : pos.y > 0 ? { x: width - 1, y: pos.y - 1 } : null,
    nextDiff: nextX !== null ? { x: nextX, y: pos.y } : pos.y < height - 1 ? { x: 0, y: pos.y + 1 } : null,
  }
}

export function currentTargets(): BuildTargets {
  return buildTargets(useDerivedStore.getState().grid, useDocumentStore.getState().buildProgress)
}

/**
 * Move the build position to `target`. Backward moves are always allowed; a forward move past the row limit
 * calls `gate.onBlocked()` instead. Returns whether the position changed.
 */
export function moveTo(target: GridPos | null, gate: BuildGate): boolean {
  const grid = useDerivedStore.getState().grid
  if (!target || !grid) return false
  if (target.x < 0 || target.x >= grid.width || target.y < 0 || target.y >= grid.height) return false

  const progress = useDocumentStore.getState().buildProgress
  const forward = buildIndex(target, grid.width) > buildIndex(progress, grid.width)
  if (forward && !rowLimitAllows(target, gate.rowLimit)) {
    gate.onBlocked()
    return false
  }
  useDocumentStore.getState().setBuildProgress(target)
  return true
}
