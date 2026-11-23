// The design paywall: dice settings a plan does not include. Any design can be tuned, previewed and built; one that
// uses a locked setting is watermarked in the previews until the user upgrades. (The blueprint is Pro on its own:
// `hasSvgExport`.)

import type { DiceParams } from '../dice'
import type { Entitlements } from './entitlements'

/** A setting of the design that the plan does not include. */
export type DesignLock = 'mixed_dice' | 'rows'

/** The design's locked settings, in display order; empty = the plan covers the whole design (no watermark). */
export function designLocks(
  ent: Pick<Entitlements, 'hasMixedDice' | 'designRowLimit'>,
  dice: Pick<DiceParams, 'colorMode' | 'numRows'>,
): DesignLock[] {
  const locks: DesignLock[] = []
  if (dice.colorMode === 'both' && !ent.hasMixedDice) locks.push('mixed_dice')
  if (ent.designRowLimit !== null && dice.numRows > ent.designRowLimit) locks.push('rows')
  return locks
}
