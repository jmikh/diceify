// Text form of a DiceGrid: one string per row (row 0 = the bottom row), dice space-separated as colour initial +
// face + `r` when rotated (`w3`, `b6r`). One encoding for the golden fixtures, the persisted document (`grid.rows`,
// schema v2) and the Swift port, so every reader turns the same text into the same grid.

import type { DiceColor, DiceFace, DiceGrid, Die } from './types'

const DIE_TOKEN = /^([bw])([1-6])(r?)$/

/** `w3`, `b6r`: colour initial, face, `r` when rotated. */
export function encodeDie(die: Die): string {
  return `${die.color[0]}${die.face}${die.rotate90 ? 'r' : ''}`
}

/** The inverse of `encodeDie`; throws on anything else. `rotate90` is present only when true (core/README.md). */
export function decodeDie(token: string): Die {
  const match = DIE_TOKEN.exec(token)
  if (!match) throw new Error(`Invalid die token "${token}"`)
  const color: DiceColor = match[1] === 'b' ? 'black' : 'white'
  const face = Number(match[2]) as DiceFace
  return match[3] ? { face, color, rotate90: true } : { face, color }
}

export function encodeGrid(grid: DiceGrid): string[] {
  return grid.rows.map((row) => row.map(encodeDie).join(' '))
}

/** Why `rows` is not a `width × height` grid, or null when it is. */
export function gridRowsProblem(rows: readonly string[], width: number, height: number): string | null {
  if (rows.length !== height) return `expected ${height} rows, got ${rows.length}`
  for (let y = 0; y < rows.length; y++) {
    const tokens = rows[y].split(' ')
    if (tokens.length !== width) return `row ${y}: expected ${width} dice, got ${tokens.length}`
    for (const token of tokens) {
      if (!DIE_TOKEN.test(token)) return `row ${y}: invalid die "${token}"`
    }
  }
  return null
}

/** The inverse of `encodeGrid`; throws when `rows` is not a `width × height` grid. */
export function decodeGrid(rows: readonly string[], width: number, height: number): DiceGrid {
  const problem = gridRowsProblem(rows, width, height)
  if (problem) throw new Error(`Invalid grid rows: ${problem}`)
  return { width, height, rows: rows.map((row) => row.split(' ').map(decodeDie)) }
}
