// Fixture file format shared by scripts/gen-fixtures.ts and core/dice/generate.test.ts.
// Not part of the core API (not re-exported from core/dice/index.ts).

import type { DiceGrid, DiceParams, Die } from '../types'

export interface Fixture {
  name: string
  width: number
  height: number
  /** Raw RGBA bytes (width * height * 4), base64. */
  rgbaBase64: string
  params: DiceParams
  expected: {
    width: number
    height: number
    /** One line per grid row, row 0 = bottom; dice space-separated, e.g. "w3 b6r w1". */
    rows: string[]
  }
}

/** `w3`, `b6r`: color initial, face, `r` when rotated. */
export function encodeDie(die: Die): string {
  return `${die.color[0]}${die.face}${die.rotate90 ? 'r' : ''}`
}

export function encodeGrid(grid: DiceGrid): string[] {
  return grid.rows.map((row) => row.map(encodeDie).join(' '))
}
