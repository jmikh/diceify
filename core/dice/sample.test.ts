import { describe, expect, it } from 'vitest'
import { axisWeights, downsample, sharpen, toGrayImage } from './sample'
import type { Pixels } from './types'

function grayPixels(width: number, height: number, gray: (x: number, y: number) => number, alpha = 255): Pixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4
      data[p] = data[p + 1] = data[p + 2] = gray(x, y)
      data[p + 3] = alpha
    }
  }
  return { data, width, height }
}

describe('toGrayImage', () => {
  it('keeps the row-major layout and ignores alpha', () => {
    const px = grayPixels(2, 2, (x, y) => (y * 2 + x) * 50, 0)
    expect(Array.from(toGrayImage(px))).toEqual([0, 50, 100, 150])
  })
  it('weights channels', () => {
    const px: Pixels = { data: new Uint8ClampedArray([255, 0, 0, 255]), width: 1, height: 1 }
    expect(toGrayImage(px)[0]).toBeCloseTo(76.245, 4)
  })
})

describe('axisWeights', () => {
  it.each([
    [6, 3],
    [10, 3],
    [7, 5],
    [2, 3],
    [256, 30],
  ])('size %i into %i cells: weights sum to size/n, contiguous, in bounds', (size, n) => {
    const cells = axisWeights(size, n)
    expect(cells).toHaveLength(n)
    for (const { first, weights } of cells) {
      expect(first).toBeGreaterThanOrEqual(0)
      expect(first + weights.length).toBeLessThanOrEqual(size)
      expect(weights.every((w) => w > 0 && w <= 1)).toBe(true)
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(size / n, 12)
    }
    // Consecutive cells meet exactly: the last pixel of one is the first of the next when shared.
    for (let i = 1; i < n; i++) {
      const prevEnd = cells[i - 1].first + cells[i - 1].weights.length
      expect(cells[i].first === prevEnd || cells[i].first === prevEnd - 1).toBe(true)
    }
  })
  it('gives the analytic weights for 3 → 2 and 2 → 3', () => {
    expect(axisWeights(3, 2)).toEqual([
      { first: 0, weights: [1, 0.5] },
      { first: 1, weights: [0.5, 1] },
    ])
    const up = axisWeights(2, 3)
    expect(up[0].first).toBe(0)
    expect(up[0].weights[0]).toBeCloseTo(2 / 3, 12)
    expect(up[1].weights.map((w) => +w.toFixed(12))).toEqual([+(1 / 3).toFixed(12), +(1 / 3).toFixed(12)])
    expect(up[2]).toEqual({ first: 1, weights: [up[2].weights[0]] })
    expect(up[2].weights[0]).toBeCloseTo(2 / 3, 12)
  })
})

describe('downsample', () => {
  it('maps a constant image to a constant at a non-integer ratio', () => {
    const gray = new Float32Array(7 * 5).fill(77.5)
    const out = downsample(gray, 7, 5, 3, 2)
    expect(out).toHaveLength(6)
    for (const v of Array.from(out)) expect(v).toBeCloseTo(77.5, 4)
  })
  it('averages a 2×2 checker into its mean', () => {
    const out = downsample(new Float32Array([0, 200, 200, 0]), 2, 2, 1, 1)
    expect(out[0]).toBe(100)
  })
  it('gives block means for an exact multiple', () => {
    // 4×4 image: value = 10 * row + col
    const gray = new Float32Array(16).map((_, i) => 10 * Math.floor(i / 4) + (i % 4))
    const out = downsample(gray, 4, 4, 2, 2)
    expect(Array.from(out)).toEqual([5.5, 7.5, 25.5, 27.5])
  })
  it('weights partial pixels (3 → 2 along x)', () => {
    const out = downsample(new Float32Array([0, 100, 200]), 3, 1, 2, 1)
    expect(out[0]).toBeCloseTo(100 / 3, 4) // (0*1 + 100*0.5) / 1.5
    expect(out[1]).toBeCloseTo(500 / 3, 4) // (100*0.5 + 200*1) / 1.5
  })
})

describe('sharpen', () => {
  const w = 5
  const h = 4
  const img = new Float32Array(w * h).map((_, i) => (i * 37) % 256)

  it('is the exact identity at strength 0', () => {
    expect(sharpen(img, w, h, 0)).toEqual(img)
  })
  it('does not mutate its input', () => {
    const copy = new Float32Array(img)
    sharpen(img, w, h, 100)
    expect(img).toEqual(copy)
  })
  it('copies the 1-pixel border unchanged', () => {
    const out = sharpen(img, w, h, 100)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const border = x === 0 || y === 0 || x === w - 1 || y === h - 1
        if (border) expect(out[y * w + x]).toBe(img[y * w + x])
      }
    }
  })
  it('applies center*(4f+1) - f*(up+left+right+down) to interior pixels', () => {
    // 3×3 with center 100, up 10, left 20, right 30, down 40, corners 255 (ignored by the kernel)
    const gray = new Float32Array([255, 10, 255, 20, 100, 30, 255, 40, 255])
    const f = 0.5
    const out = sharpen(gray, 3, 3, 50)
    expect(out[4]).toBeCloseTo(100 * (4 * f + 1) - f * (10 + 20 + 30 + 40), 4)
  })
  it('clamps to 0..255', () => {
    const bright = new Float32Array([0, 0, 0, 0, 250, 0, 0, 0, 0])
    expect(sharpen(bright, 3, 3, 100)[4]).toBe(255)
    const dark = new Float32Array([255, 255, 255, 255, 5, 255, 255, 255, 255])
    expect(sharpen(dark, 3, 3, 100)[4]).toBe(0)
  })
})
