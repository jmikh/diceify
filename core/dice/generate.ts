// Pixels → DiceGrid. The orchestration of core/dice/sample.ts and core/dice/mapping.ts.

import { mapGrayToDie } from './mapping'
import { downsample, sharpen, toGrayImage } from './sample'
import type { DiceGrid, DiceParams, Die, Pixels } from './types'

/** Rows are fixed by `numRows`; columns follow the image aspect ratio (at least 1). */
export function computeGridSize(imageWidth: number, imageHeight: number, numRows: number): { cols: number; rows: number } {
  const aspectRatio = imageWidth / imageHeight
  return { cols: Math.max(1, Math.round(numRows * aspectRatio)), rows: numRows }
}

export function generateDiceGrid(px: Pixels, params: DiceParams): DiceGrid {
  const { cols, rows } = computeGridSize(px.width, px.height, params.numRows)
  let small = downsample(toGrayImage(px), px.width, px.height, cols, rows)
  if (params.edgeSharpening > 0) small = sharpen(small, cols, rows, params.edgeSharpening)

  const grid: Die[][] = new Array(rows)
  for (let r = 0; r < rows; r++) {
    const row: Die[] = new Array(cols)
    for (let x = 0; x < cols; x++) row[x] = mapGrayToDie(small[r * cols + x], params)
    grid[rows - 1 - r] = row // pixel row 0 is the top of the image; grid row 0 is the bottom
  }
  return { width: cols, height: rows, rows: grid }
}
