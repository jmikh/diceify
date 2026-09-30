import { describe, expect, it } from 'vitest'
import { THRESHOLDS, applyContrast, applyGamma, mapBrightnessToDie, mapGrayToDie, shouldRotate, toGray } from './mapping'
import { DEFAULT_DICE_PARAMS, type ColorMode, type DiceFace } from './types'

describe('toGray', () => {
  it('uses the 0.299 / 0.587 / 0.114 weights', () => {
    expect(toGray(255, 255, 255)).toBeCloseTo(255, 10)
    expect(toGray(0, 0, 0)).toBe(0)
    expect(toGray(255, 0, 0)).toBeCloseTo(76.245, 10)
    expect(toGray(0, 255, 0)).toBeCloseTo(149.685, 10)
    expect(toGray(0, 0, 255)).toBeCloseTo(29.07, 10)
  })
})

describe('applyGamma', () => {
  it('is the identity at gamma 1 (exact)', () => {
    expect(applyGamma(100.123, 1)).toBe(100.123)
  })
  it('keeps 0 and 255 fixed', () => {
    expect(applyGamma(0, 1.3)).toBe(0)
    expect(applyGamma(255, 1.3)).toBe(255)
  })
  it('applies 255 * (gray/255)^(1/gamma)', () => {
    expect(applyGamma(64, 2)).toBeCloseTo(255 * Math.sqrt(64 / 255), 10)
    expect(applyGamma(64, 2)).toBeGreaterThan(64) // gamma > 1 brightens midtones
  })
})

describe('applyContrast', () => {
  it('is the identity at 0 and below', () => {
    expect(applyContrast(200.5, 0)).toBe(200.5)
    expect(applyContrast(200.5, -50)).toBe(200.5)
  })
  it('stretches around 128', () => {
    expect(applyContrast(128, 40)).toBe(128)
    expect(applyContrast(200, 40)).toBeCloseTo(128 + 72 * 1.4, 10)
    expect(applyContrast(78, 40)).toBeCloseTo(128 - 50 * 1.4, 10)
  })
  it('clamps to 0..255', () => {
    expect(applyContrast(250, 100)).toBe(255)
    expect(applyContrast(5, 100)).toBe(0)
  })
})

describe('THRESHOLDS', () => {
  it('pins the shipped tables', () => {
    expect(THRESHOLDS.both.map((s) => s.min)).toEqual([217, 192, 166, 141, 115, 90, 64, 51, 39, 26, 13, 0])
    expect(THRESHOLDS.both.map((s) => `${s.color[0]}${s.face}`)).toEqual([
      'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'b6', 'b5', 'b4', 'b3', 'b2', 'b1',
    ])
    expect(THRESHOLDS.black.map((s) => s.min)).toEqual([141, 115, 90, 64, 39, 0])
    expect(THRESHOLDS.black.map((s) => s.face)).toEqual([6, 5, 4, 3, 2, 1])
    expect(THRESHOLDS.white.map((s) => s.min)).toEqual([212.5, 170, 127.5, 85, 42.5, 0])
    expect(THRESHOLDS.white.map((s) => s.face)).toEqual([1, 2, 3, 4, 5, 6])
    expect(THRESHOLDS.black.every((s) => s.color === 'black')).toBe(true)
    expect(THRESHOLDS.white.every((s) => s.color === 'white')).toBe(true)
  })
})

describe('mapBrightnessToDie', () => {
  const modes: ColorMode[] = ['both', 'black', 'white']
  for (const mode of modes) {
    const steps = THRESHOLDS[mode]
    describe(mode, () => {
      for (let i = 0; i < steps.length - 1; i++) {
        const upper = steps[i]
        const lower = steps[i + 1]
        it(`boundary ${upper.min}: at and above → ${upper.color} ${upper.face}, below → ${lower.color} ${lower.face}`, () => {
          const up = { face: upper.face, color: upper.color }
          const down = { face: lower.face, color: lower.color }
          expect(mapBrightnessToDie(upper.min, mode)).toEqual(up)
          expect(mapBrightnessToDie(upper.min + 1, mode)).toEqual(up)
          expect(mapBrightnessToDie(upper.min - 1, mode)).toEqual(down)
        })
      }
      it('covers the extremes', () => {
        const top = steps[0]
        const bottom = steps[steps.length - 1]
        expect(mapBrightnessToDie(255, mode)).toEqual({ face: top.face, color: top.color })
        expect(mapBrightnessToDie(0, mode)).toEqual({ face: bottom.face, color: bottom.color })
      })
    })
  }
  it('spot checks literal values', () => {
    expect(mapBrightnessToDie(128, 'both')).toEqual({ face: 5, color: 'white' })
    expect(mapBrightnessToDie(89.9, 'both')).toEqual({ face: 6, color: 'black' })
    expect(mapBrightnessToDie(140, 'black')).toEqual({ face: 5, color: 'black' })
    expect(mapBrightnessToDie(212.4, 'white')).toEqual({ face: 2, color: 'white' })
    expect(mapBrightnessToDie(42.5, 'white')).toEqual({ face: 5, color: 'white' })
  })
})

describe('shouldRotate', () => {
  const faces: DiceFace[] = [1, 2, 3, 4, 5, 6]
  it('is false for every face when no flag is set', () => {
    for (const face of faces) expect(shouldRotate(face, DEFAULT_DICE_PARAMS)).toBe(false)
  })
  it.each([
    ['rotate6', 6],
    ['rotate3', 3],
    ['rotate2', 2],
  ] as const)('%s rotates only face %i', (flag, target) => {
    const params = { ...DEFAULT_DICE_PARAMS, [flag]: true }
    for (const face of faces) expect(shouldRotate(face, params)).toBe(face === target)
  })
})

describe('mapGrayToDie', () => {
  it('runs gamma → contrast → threshold', () => {
    // 100 → gamma 2: 159.69 → contrast 40: 172.37 → white 3
    expect(mapGrayToDie(100, { ...DEFAULT_DICE_PARAMS, gamma: 2, contrast: 40 })).toEqual({ face: 3, color: 'white' })
  })
  it('omits rotate90 unless the die is rotated', () => {
    const params = { ...DEFAULT_DICE_PARAMS, rotate6: true }
    expect(mapGrayToDie(70, params)).toEqual({ face: 6, color: 'black', rotate90: true })
    expect(mapGrayToDie(30, params)).toEqual({ face: 3, color: 'black' })
    expect('rotate90' in mapGrayToDie(30, params)).toBe(false)
  })
})
