import { describe, expect, it } from 'vitest'
import { designLocks } from './design'
import { PLAN_LIMITS, PLANS } from './plans'

const explorer = PLAN_LIMITS.explorer
/** A plan with a design row limit (none has one today). */
const rowLimited = { hasMixedDice: false, designRowLimit: 50 }

describe('designLocks', () => {
  it('locks only mixed dice for explorer, at any row count', () => {
    expect(designLocks(explorer, { colorMode: 'both', numRows: 50 })).toEqual(['mixed_dice'])
    expect(designLocks(explorer, { colorMode: 'both', numRows: 120 })).toEqual(['mixed_dice'])
    expect(designLocks(explorer, { colorMode: 'black', numRows: 120 })).toEqual([])
    expect(designLocks(explorer, { colorMode: 'white', numRows: 20 })).toEqual([])
  })

  it('locks rows over a design row limit', () => {
    expect(designLocks(rowLimited, { colorMode: 'black', numRows: 50 })).toEqual([])
    expect(designLocks(rowLimited, { colorMode: 'black', numRows: 51 })).toEqual(['rows'])
    expect(designLocks(rowLimited, { colorMode: 'both', numRows: 120 })).toEqual(['mixed_dice', 'rows'])
  })

  it('locks nothing on a paid plan', () => {
    for (const plan of PLANS.filter((p) => p !== 'explorer')) {
      expect(designLocks(PLAN_LIMITS[plan], { colorMode: 'both', numRows: 120 })).toEqual([])
    }
  })
})
