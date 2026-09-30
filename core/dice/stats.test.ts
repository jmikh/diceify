import { describe, expect, it } from 'vitest'
import { computeStats } from './stats'
import type { DiceGrid } from './types'

describe('computeStats', () => {
  it('counts colors across all rows', () => {
    const grid: DiceGrid = {
      width: 3,
      height: 2,
      rows: [
        [{ face: 1, color: 'black' }, { face: 6, color: 'white', rotate90: true }, { face: 3, color: 'white' }],
        [{ face: 2, color: 'black' }, { face: 2, color: 'black' }, { face: 5, color: 'white' }],
      ],
    }
    expect(computeStats(grid)).toEqual({ blackCount: 3, whiteCount: 3, totalCount: 6 })
  })
  it('returns zeros for an empty grid', () => {
    expect(computeStats({ width: 0, height: 0, rows: [] })).toEqual({ blackCount: 0, whiteCount: 0, totalCount: 0 })
  })
})
