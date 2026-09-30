// The single crop path: original image + crop params → `Pixels` for the dice core.
// Live crops and restored drafts/projects both go through here, so they yield identical grids.

import type { Pixels } from '@/core/dice'
import { canvasToPixels, drawRegion, loadImage, type CropRegion } from './decode'

export const CROP_MAX_SIDE = 2048

export async function cropToPixels(src: string, crop: CropRegion, maxSide = CROP_MAX_SIDE): Promise<Pixels> {
  const img = await loadImage(src)
  return canvasToPixels(drawRegion(img, crop, maxSide))
}
