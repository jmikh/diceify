// Image sampling: grayscale conversion, exact area-average downsampling, sharpening.
// Every stage returns a new Float32Array (row-major, top row first). See core/README.md.

import { toGray } from './mapping'
import type { Pixels } from './types'

/** Luminance per pixel. Alpha is ignored. */
export function toGrayImage(px: Pixels): Float32Array {
  const { data, width, height } = px
  const out = new Float32Array(width * height)
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = toGray(data[p], data[p + 1], data[p + 2])
  }
  return out
}

export interface AxisCoverage {
  /** Index of the first source pixel the cell touches. */
  first: number
  /** Coverage of each consecutive source pixel from `first`, in [0, 1]; sums to `size / n`. */
  weights: number[]
}

/** Cell `i` of `n` along an axis of `size` pixels covers `[i * size / n, (i + 1) * size / n)`. */
export function axisWeights(size: number, n: number): AxisCoverage[] {
  const cells: AxisCoverage[] = []
  for (let i = 0; i < n; i++) {
    const start = (i * size) / n
    const end = ((i + 1) * size) / n
    const first = Math.floor(start)
    const weights: number[] = []
    for (let p = first; p < end && p < size; p++) {
      weights.push(Math.min(p + 1, end) - Math.max(p, start))
    }
    cells.push({ first, weights })
  }
  return cells
}

/**
 * Exact area average of `gray` (width × height) into cols × rows cells.
 * Per cell: rows are summed top→bottom, each row's pixels left→right (`rowSum += g * wx`),
 * `total += rowSum * wy`; result = total / ((width / cols) * (height / rows)). Double accumulators.
 */
export function downsample(gray: Float32Array, width: number, height: number, cols: number, rows: number): Float32Array {
  const xs = axisWeights(width, cols)
  const ys = axisWeights(height, rows)
  const cellArea = (width / cols) * (height / rows)
  const out = new Float32Array(cols * rows)
  for (let cy = 0; cy < rows; cy++) {
    const { first: y0, weights: wy } = ys[cy]
    for (let cx = 0; cx < cols; cx++) {
      const { first: x0, weights: wx } = xs[cx]
      let total = 0
      for (let j = 0; j < wy.length; j++) {
        const rowOffset = (y0 + j) * width + x0
        let rowSum = 0
        for (let i = 0; i < wx.length; i++) {
          rowSum += gray[rowOffset + i] * wx[i]
        }
        total += rowSum * wy[j]
      }
      out[cy * cols + cx] = total / cellArea
    }
  }
  return out
}

/**
 * 3×3 sharpening: kernel [0,-f,0; -f,4f+1,-f; 0,-f,0] with f = strength / 100, summed in kernel order
 * (row by row, left to right). The 1-pixel border is copied unchanged. Output clamped to 0..255.
 */
export function sharpen(gray: Float32Array, width: number, height: number, strength: number): Float32Array {
  const out = new Float32Array(gray)
  const f = strength / 100
  const kernel = [
    [0, -f, 0],
    [-f, 4 * f + 1, -f],
    [0, -f, 0],
  ]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * kernel[ky + 1][kx + 1]
        }
      }
      out[y * width + x] = Math.max(0, Math.min(255, sum))
    }
  }
  return out
}
