// Core dice types. Pure data: no DOM, no React. See core/README.md for the layout rules.

export type DiceFace = 1 | 2 | 3 | 4 | 5 | 6
export type DiceColor = 'black' | 'white'
export type ColorMode = 'both' | 'black' | 'white'

export interface Die {
  face: DiceFace
  color: DiceColor
  /** Present (and `true`) only when the die is drawn rotated 90°. Absent otherwise. */
  rotate90?: boolean
}

/** Row-major grid: `rows[y][x]`, with y = 0 the BOTTOM row (the build row number users see). */
export interface DiceGrid {
  width: number
  height: number
  rows: Die[][]
}

export interface DiceParams {
  /** Grid height in dice (positive integer). Columns follow the image aspect ratio. */
  numRows: number
  colorMode: ColorMode
  /** 0..100, additive only. */
  contrast: number
  /** 1 = unchanged. */
  gamma: number
  /** 0..100. */
  edgeSharpening: number
  rotate6: boolean
  rotate3: boolean
  rotate2: boolean
}

export interface DiceStats {
  blackCount: number
  whiteCount: number
  totalCount: number
}

/** RGBA, 8 bits per channel, row-major, top row first. Not an `ImageData` (core has no DOM). */
export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface GridPos {
  x: number
  y: number
}

export const DEFAULT_DICE_PARAMS: DiceParams = {
  numRows: 70,
  colorMode: 'both',
  contrast: 25,
  gamma: 1,
  edgeSharpening: 5,
  rotate6: false,
  rotate3: false,
  rotate2: false,
}
