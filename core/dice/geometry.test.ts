import { describe, expect, it } from 'vitest'
import { getDotPositions } from './geometry'

describe('getDotPositions', () => {
  const size = 100
  const faces = [1, 2, 3, 4, 5, 6]

  it.each(faces)('face %i yields %i dots', (face) => {
    expect(getDotPositions(face, size)).toHaveLength(face)
  })

  it('keeps every dot inside the die', () => {
    for (const face of faces) {
      for (const [x, y] of getDotPositions(face, size)) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(size)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(size)
      }
    }
  })

  it('scales linearly with size', () => {
    const small = getDotPositions(6, 10)
    const large = getDotPositions(6, 100)
    small.forEach(([x, y], i) => {
      expect(large[i][0]).toBeCloseTo(x * 10)
      expect(large[i][1]).toBeCloseTo(y * 10)
    })
  })
})
