import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_DICE_PARAMS, type Die, type DiceGrid } from '@/core/dice'
import { buildTargets, currentTargets, moveTo } from './buildNavigation'
import { useDerivedStore } from './useDerivedStore'
import { useDocumentStore } from './useDocumentStore'

const b = (face: Die['face']): Die => ({ color: 'black', face })
const w = (face: Die['face']): Die => ({ color: 'white', face })

// 4 wide, 3 tall; row 1 is entirely identical
const grid: DiceGrid = {
  width: 4,
  height: 3,
  rows: [
    [b(1), b(1), w(2), w(2)],
    [b(3), b(3), b(3), b(3)],
    [w(4), b(5), b(5), w(6)],
  ],
}

const unlimited = { rowLimit: null, onBlocked: vi.fn() }
const progress = () => useDocumentStore.getState().buildProgress

beforeEach(() => {
  useDocumentStore.setState({ crop: null, dice: DEFAULT_DICE_PARAMS, buildProgress: { x: 0, y: 0 }, buildBaseline: null })
  useDerivedStore.getState().reset(null)
  useDerivedStore.getState().setGrid(grid, { blackCount: 8, whiteCount: 4, totalCount: 12 }, { crop: null, dice: DEFAULT_DICE_PARAMS })
  unlimited.onBlocked.mockClear()
})

describe('buildTargets', () => {
  it('has nowhere to go without a grid', () => {
    expect(buildTargets(null, { x: 0, y: 0 })).toEqual({ prev: null, next: null, prevDiff: null, nextDiff: null })
  })

  it('steps through the build order and stops at both ends', () => {
    expect(buildTargets(grid, { x: 0, y: 0 })).toMatchObject({ prev: null, next: { x: 1, y: 0 } })
    expect(buildTargets(grid, { x: 3, y: 0 })).toMatchObject({ prev: { x: 2, y: 0 }, next: { x: 0, y: 1 } })
    expect(buildTargets(grid, { x: 3, y: 2 })).toMatchObject({ prev: { x: 2, y: 2 }, next: null })
  })

  it('diff jumps are row-local and fall through to the adjacent row when the rest is identical', () => {
    expect(buildTargets(grid, { x: 0, y: 0 })).toMatchObject({ prevDiff: null, nextDiff: { x: 2, y: 0 } })
    expect(buildTargets(grid, { x: 3, y: 0 })).toMatchObject({ prevDiff: { x: 1, y: 0 }, nextDiff: { x: 0, y: 1 } })
    expect(buildTargets(grid, { x: 1, y: 1 })).toMatchObject({ prevDiff: { x: 3, y: 0 }, nextDiff: { x: 0, y: 2 } })
    expect(buildTargets(grid, { x: 3, y: 2 })).toMatchObject({ prevDiff: { x: 2, y: 2 }, nextDiff: null })
  })

  it('currentTargets reads the stores', () => {
    useDocumentStore.getState().setBuildProgress({ x: 1, y: 1 })
    expect(currentTargets().nextDiff).toEqual({ x: 0, y: 2 })
  })
})

describe('moveTo', () => {
  it('moves within bounds and ignores null or out-of-range targets', () => {
    expect(moveTo({ x: 2, y: 1 }, unlimited)).toBe(true)
    expect(progress()).toEqual({ x: 2, y: 1 })
    expect(moveTo(null, unlimited)).toBe(false)
    expect(moveTo({ x: 4, y: 0 }, unlimited)).toBe(false)
    expect(moveTo({ x: 0, y: -1 }, unlimited)).toBe(false)
    expect(progress()).toEqual({ x: 2, y: 1 })
  })

  it('blocks forward moves past the row limit and reports them', () => {
    const gate = { rowLimit: 1, onBlocked: vi.fn() }
    expect(moveTo({ x: 3, y: 0 }, gate)).toBe(true)
    expect(moveTo({ x: 0, y: 1 }, gate)).toBe(false)
    expect(gate.onBlocked).toHaveBeenCalledTimes(1)
    expect(progress()).toEqual({ x: 3, y: 0 })
  })

  it('never gates backward moves', () => {
    useDocumentStore.getState().setBuildProgress({ x: 1, y: 2 })
    const gate = { rowLimit: 1, onBlocked: vi.fn() }
    expect(moveTo({ x: 0, y: 2 }, gate)).toBe(true)
    expect(moveTo({ x: 3, y: 0 }, gate)).toBe(true)
    expect(gate.onBlocked).not.toHaveBeenCalled()
  })

  it('does nothing without a grid', () => {
    useDerivedStore.getState().reset(null)
    expect(moveTo({ x: 1, y: 0 }, unlimited)).toBe(false)
  })
})
