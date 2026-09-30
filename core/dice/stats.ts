import type { DiceGrid, DiceStats } from './types'

export function computeStats(grid: DiceGrid): DiceStats {
  let blackCount = 0
  let whiteCount = 0
  for (const row of grid.rows) {
    for (const die of row) {
      if (die.color === 'black') blackCount++
      else whiteCount++
    }
  }
  return { blackCount, whiteCount, totalCount: blackCount + whiteCount }
}
