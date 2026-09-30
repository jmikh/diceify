import { describe, expect, it } from 'vitest'
import { fitScale, rotatedBounds } from './decode'

describe('fitScale', () => {
  it('scales the longer side down to maxSide', () => {
    expect(fitScale(4096, 2048, 2048)).toBe(0.5)
    expect(fitScale(1000, 3000, 1500)).toBe(0.5)
  })

  it('never upscales', () => {
    expect(fitScale(800, 600, 2048)).toBe(1)
    expect(fitScale(2048, 2048, 2048)).toBe(1)
  })
})

describe('rotatedBounds', () => {
  it('is the identity at 0 and 180 degrees and swaps axes at 90', () => {
    expect(rotatedBounds(400, 300, 0)).toEqual({ width: 400, height: 300 })
    expect(rotatedBounds(400, 300, 180)).toEqual({ width: 400, height: 300 })
    expect(rotatedBounds(400, 300, 90)).toEqual({ width: 300, height: 400 })
  })

  it('rounds the bounding box of an arbitrary rotation', () => {
    // 45°: both sides = (400 + 300) / √2 ≈ 494.97
    expect(rotatedBounds(400, 300, 45)).toEqual({ width: 495, height: 495 })
  })
})
