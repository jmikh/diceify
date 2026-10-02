// Editor funnel events whose payload comes from the stores (plan step I1). Called at the moment of the transition;
// `lib/analytics` sends them.

import { buildIndex, buildMilestonesCrossed, type DiceGrid, type GridPos } from '@/core/dice'
import { track } from '@/lib/analytics'
import type { Step } from './steps'
import { useDerivedStore } from './store/useDerivedStore'
import { useDocumentStore } from './store/useDocumentStore'

/**
 * A step change. Leaving crop forwards = the crop is done; arriving at build = the tune settings the user builds
 * with (also when jumping there straight from crop).
 */
export function trackStepChange(from: Step, to: Step): void {
  if (from === to) return
  const { crop, dice } = useDocumentStore.getState()
  if (from === 'crop' && crop) track('crop_completed', { aspect_ratio: crop.aspectRatio })
  if (to === 'build') {
    const size = useDerivedStore.getState().gridSize
    track('tune_completed', {
      rows: dice.numRows,
      cols: size?.width ?? null,
      total_dice: size ? size.width * size.height : null,
      color_mode: dice.colorMode,
      contrast: dice.contrast,
      gamma: dice.gamma,
      edge_sharpening: dice.edgeSharpening,
      rotate6: dice.rotate6,
      rotate3: dice.rotate3,
      rotate2: dice.rotate2,
    })
  }
}

/** A build position change: the first die placed, and each progress milestone passed. */
export function trackBuildMove(from: GridPos, to: GridPos, grid: DiceGrid): void {
  const total = grid.width * grid.height
  const before = buildIndex(from, grid.width)
  const after = buildIndex(to, grid.width)
  if (before === 0 && after > 0) track('build_started', { total_dice: total })
  for (const percent of buildMilestonesCrossed(before, after, total)) {
    track('build_progress', { percent, total_dice: total })
  }
}
