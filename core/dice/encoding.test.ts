import { describe, expect, it } from 'vitest'
import { decodeDie, decodeGrid, encodeDie, encodeGrid, gridRowsProblem } from './encoding'
import type { DiceGrid } from './types'

const grid: DiceGrid = {
  width: 3,
  height: 2,
  rows: [
    [{ face: 3, color: 'white' }, { face: 6, color: 'black', rotate90: true }, { face: 1, color: 'white' }],
    [{ face: 2, color: 'black' }, { face: 2, color: 'black', rotate90: true }, { face: 5, color: 'white' }],
  ],
}

describe('die tokens', () => {
  it('round-trips every face, colour and rotation', () => {
    for (const color of ['black', 'white'] as const) {
      for (let face = 1; face <= 6; face++) {
        const plain = { face: face as 1 | 2 | 3 | 4 | 5 | 6, color }
        expect(decodeDie(encodeDie(plain))).toEqual(plain)
        const rotated = { ...plain, rotate90: true as const }
        expect(decodeDie(encodeDie(rotated))).toEqual(rotated)
      }
    }
  })

  it('never emits a rotate90 key for an unrotated die', () => {
    expect(decodeDie('w4')).not.toHaveProperty('rotate90')
  })

  it('rejects malformed tokens', () => {
    for (const bad of ['', 'w', 'w7', 'w0', 'x3', 'w3rr', 'W3', 'w3 ', 'b6R']) {
      expect(() => decodeDie(bad), bad).toThrow()
    }
  })
})

describe('grid rows', () => {
  it('encodes row 0 first (the bottom row) and decodes back to the same grid', () => {
    const rows = encodeGrid(grid)
    expect(rows).toEqual(['w3 b6r w1', 'b2 b2r w5'])
    expect(decodeGrid(rows, 3, 2)).toEqual(grid)
  })

  it('names the first problem', () => {
    expect(gridRowsProblem(['w3 b6r w1', 'b2 b2r w5'], 3, 2)).toBeNull()
    expect(gridRowsProblem(['w3 b6r w1'], 3, 2)).toBe('expected 2 rows, got 1')
    expect(gridRowsProblem(['w3 b6r', 'b2 b2r w5'], 3, 2)).toBe('row 0: expected 3 dice, got 2')
    expect(gridRowsProblem(['w3 b6r w1', 'b2 b9 w5'], 3, 2)).toBe('row 1: invalid die "b9"')
    expect(() => decodeGrid(['w3'], 1, 2)).toThrow(/expected 2 rows/)
  })
})
