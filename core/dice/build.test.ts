import { describe, expect, it } from 'vitest'
import {
  bufferedWindow,
  buildIndex,
  buildMilestonesCrossed,
  computeViewBox,
  countCompleted,
  findNextDiff,
  findPrevDiff,
  findRun,
  gridRowFromSvg,
  isCompleted,
  nextPosition,
  positionFromIndex,
  prevPosition,
  rowLimitAllows,
  sameDie,
  svgRow,
  visibleWindow,
  windowContains,
  type ViewBox,
  type ViewBoxInput,
} from './build'
import type { Die } from './types'

const b = (face: Die['face'], rotate90?: true): Die => (rotate90 ? { face, color: 'black', rotate90 } : { face, color: 'black' })
const w = (face: Die['face']): Die => ({ face, color: 'white' })

// x:  0     1     2     3     4     5     6
const row: Die[] = [b(1), b(1), b(1, true), w(1), b(1), b(1), w(6)]

describe('build order', () => {
  it('round-trips index and position', () => {
    for (let i = 0; i < 12; i++) {
      expect(buildIndex(positionFromIndex(i, 4), 4)).toBe(i)
    }
    expect(buildIndex({ x: 2, y: 3 }, 4)).toBe(14)
    expect(positionFromIndex(14, 4)).toEqual({ x: 2, y: 3 })
  })

  it('counts completed dice without the current one', () => {
    expect(countCompleted({ x: 0, y: 0 }, 10)).toBe(0)
    expect(countCompleted({ x: 3, y: 2 }, 10)).toBe(23)
  })

  it('isCompleted is strict build-order precedence', () => {
    const progress = { x: 3, y: 2 }
    expect(isCompleted({ x: 9, y: 1 }, progress)).toBe(true)
    expect(isCompleted({ x: 2, y: 2 }, progress)).toBe(true)
    expect(isCompleted({ x: 3, y: 2 }, progress)).toBe(false) // the die being placed
    expect(isCompleted({ x: 4, y: 2 }, progress)).toBe(false)
    expect(isCompleted({ x: 0, y: 3 }, progress)).toBe(false)
  })

  it('agrees with countCompleted on a full grid', () => {
    const width = 5
    const height = 4
    for (let i = 0; i < width * height; i++) {
      const progress = positionFromIndex(i, width)
      let n = 0
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (isCompleted({ x, y }, progress)) n++
      expect(n).toBe(countCompleted(progress, width))
    }
  })
})

describe('runs and diffs', () => {
  it('sameDie ignores rotation', () => {
    expect(sameDie(b(1), b(1, true))).toBe(true)
    expect(sameDie(b(1), w(1))).toBe(false)
    expect(sameDie(b(1), b(2))).toBe(false)
  })

  it('findRun returns the inclusive extent around x', () => {
    expect(findRun(row, 0)).toEqual({ start: 0, end: 2 })
    expect(findRun(row, 2)).toEqual({ start: 0, end: 2 })
    expect(findRun(row, 3)).toEqual({ start: 3, end: 3 })
    expect(findRun(row, 5)).toEqual({ start: 4, end: 5 })
    expect(findRun(row, 6)).toEqual({ start: 6, end: 6 })
  })

  it('findNextDiff / findPrevDiff skip identical dice and return null at the row ends', () => {
    expect(findNextDiff(row, 0)).toBe(3)
    expect(findNextDiff(row, 3)).toBe(4)
    expect(findNextDiff(row, 4)).toBe(6)
    expect(findNextDiff(row, 6)).toBeNull()
    expect(findNextDiff([b(2), b(2), b(2)], 0)).toBeNull()

    expect(findPrevDiff(row, 6)).toBe(5)
    expect(findPrevDiff(row, 4)).toBe(3)
    expect(findPrevDiff(row, 3)).toBe(2)
    expect(findPrevDiff(row, 2)).toBeNull()
    expect(findPrevDiff(row, 0)).toBeNull()
  })
})

describe('stepping', () => {
  it('nextPosition walks the row then wraps, null at the last die', () => {
    expect(nextPosition({ x: 0, y: 0 }, 3, 2)).toEqual({ x: 1, y: 0 })
    expect(nextPosition({ x: 2, y: 0 }, 3, 2)).toEqual({ x: 0, y: 1 })
    expect(nextPosition({ x: 2, y: 1 }, 3, 2)).toBeNull()
  })

  it('prevPosition walks back then wraps, null at the first die', () => {
    expect(prevPosition({ x: 1, y: 1 }, 3)).toEqual({ x: 0, y: 1 })
    expect(prevPosition({ x: 0, y: 1 }, 3)).toEqual({ x: 2, y: 0 })
    expect(prevPosition({ x: 0, y: 0 }, 3)).toBeNull()
  })

  it('rowLimitAllows: null is unlimited, otherwise rows below the limit', () => {
    expect(rowLimitAllows({ x: 0, y: 999 }, null)).toBe(true)
    expect(rowLimitAllows({ x: 9, y: 4 }, 5)).toBe(true)
    expect(rowLimitAllows({ x: 0, y: 5 }, 5)).toBe(false)
    expect(rowLimitAllows({ x: 0, y: 0 }, 0)).toBe(false)
  })

  it('buildMilestonesCrossed: milestones passed by a forward move, the last die counting as 100', () => {
    expect(buildMilestonesCrossed(0, 24, 100)).toEqual([])
    expect(buildMilestonesCrossed(24, 25, 100)).toEqual([25])
    expect(buildMilestonesCrossed(25, 26, 100)).toEqual([])
    expect(buildMilestonesCrossed(10, 80, 100)).toEqual([25, 50, 75])
    expect(buildMilestonesCrossed(98, 99, 100)).toEqual([100])
    expect(buildMilestonesCrossed(0, 99, 100)).toEqual([25, 50, 75, 100])
  })

  it('buildMilestonesCrossed: nothing for backward moves, no move or an empty grid', () => {
    expect(buildMilestonesCrossed(80, 10, 100)).toEqual([])
    expect(buildMilestonesCrossed(50, 50, 100)).toEqual([])
    expect(buildMilestonesCrossed(0, 1, 0)).toEqual([])
    expect(buildMilestonesCrossed(0, 0, 1)).toEqual([])
  })
})

describe('svg rows', () => {
  it('flips between grid rows (0 = bottom) and SVG rows (0 = top)', () => {
    expect(svgRow(0, 30)).toBe(29)
    expect(svgRow(29, 30)).toBe(0)
    expect(gridRowFromSvg(svgRow(7, 30), 30)).toBe(7)
  })
})

describe('computeViewBox (pinned to BuilderMain.buildZoom)', () => {
  const base: ViewBoxInput = { current: { x: 0, y: 0 }, cols: 30, rows: 30, zoomLevel: 8, aspect: 2, lastViewX: null }
  const expectView = (actual: ViewBox, expected: ViewBox) => {
    expect(actual.x).toBeCloseTo(expected.x, 9)
    expect(actual.y).toBeCloseTo(expected.y, 9)
    expect(actual.w).toBeCloseTo(expected.w, 9)
    expect(actual.h).toBeCloseTo(expected.h, 9)
  }

  it('first layout at the origin clamps to the padded grid edge', () => {
    const { viewBox, lastViewX } = computeViewBox(base)
    expectView(viewBox, { x: -0.1, y: 26.1, w: 8, h: 4 })
    expect(lastViewX).toBeCloseTo(-0.1, 9)
  })

  it('first layout mid-grid puts the die at 15% of the view width', () => {
    const { viewBox } = computeViewBox({ ...base, current: { x: 10, y: 5 } })
    expectView(viewBox, { x: 8.8, y: 21.6, w: 8, h: 4 })
    expect((10 - viewBox.x) / viewBox.w).toBeCloseTo(0.15, 9)
  })

  it('keeps the view while the selector is under the pan threshold', () => {
    const { viewBox, lastViewX } = computeViewBox({ ...base, current: { x: 15, y: 5 }, lastViewX: 8.8 })
    expect(viewBox.x).toBeCloseTo(8.8, 9)
    expect(lastViewX).toBeCloseTo(8.8, 9)
  })

  it('pans to the reset position once relativeX >= 0.85', () => {
    const { viewBox } = computeViewBox({ ...base, current: { x: 16, y: 5 }, lastViewX: 8.8 })
    expect(viewBox.x).toBeCloseTo(14.8, 9)
  })

  it('pans when the selector moves left past the view', () => {
    const { viewBox } = computeViewBox({ ...base, current: { x: 8, y: 5 }, lastViewX: 8.8 })
    expect(viewBox.x).toBeCloseTo(6.8, 9)
  })

  it('clamps at the far corner', () => {
    const { viewBox } = computeViewBox({ ...base, current: { x: 29, y: 29 } })
    expectView(viewBox, { x: 22.1, y: -0.1, w: 8, h: 4 })
  })

  it('applies the 3-row height floor and centers a grid narrower than the view', () => {
    const { viewBox } = computeViewBox({ ...base, cols: 3, rows: 3, aspect: 2 })
    expectView(viewBox, { x: -1.5, y: 0.1, w: 6, h: 3 })
  })

  it('centers vertically when the grid is shorter than the view', () => {
    const { viewBox } = computeViewBox({ ...base, cols: 5, rows: 4, aspect: 1 })
    expectView(viewBox, { x: -0.1, y: -0.5, w: 5, h: 5 })
  })

  it('never shows fewer than 3 dice across', () => {
    const { viewBox } = computeViewBox({ ...base, zoomLevel: 1, aspect: 1 })
    expect(viewBox.w).toBe(3)
    expect(viewBox.h).toBe(3)
  })
})

describe('cell windows (pinned to BuilderMain.ensureRendered)', () => {
  const view: ViewBox = { x: 8.8, y: 21.6, w: 8, h: 4 }

  it('visibleWindow adds the margin and clamps', () => {
    expect(visibleWindow(view, 30, 30)).toEqual({ x0: 7, x1: 18, y0: 20, y1: 27 })
    expect(visibleWindow({ x: -0.1, y: 26.1, w: 8, h: 4 }, 30, 30)).toEqual({ x0: 0, x1: 9, y0: 25, y1: 29 })
  })

  it('bufferedWindow adds a full viewport on each side and clamps', () => {
    expect(bufferedWindow(view, 30, 30)).toEqual({ x0: 0, x1: 25, y0: 17, y1: 29 })
  })

  it('windowContains is inclusive', () => {
    const outer = bufferedWindow(view, 30, 30)
    expect(windowContains(outer, visibleWindow(view, 30, 30))).toBe(true)
    expect(windowContains(outer, outer)).toBe(true)
    expect(windowContains(outer, { ...outer, x1: outer.x1 + 1 })).toBe(false)
  })
})
