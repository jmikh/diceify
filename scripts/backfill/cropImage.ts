// The web's crop (`lib/image/crop.ts` → `drawRegion`) redone with sharp for the backfill: rotate the stored original
// into its bounding box, cut the crop region out of it, scale the cut so its longer side is at most `maxSide`, and
// hand the RGBA bytes to the dice core. Same arithmetic as the browser (rotation about the centre, region in
// rotated-bounding-box coordinates, `fitScale` + rounding of the output size); the resampling filter differs, which
// is why a backfilled grid can differ from the browser's by a cell near a threshold (plans/ios/ios-app-plan.md § 5).

import sharp from 'sharp'
import type { CropParams, Pixels } from '../../core/dice'
import { fitScale } from '../../lib/image/decode'

export const CROP_MAX_SIDE = 2048

export interface CropGeometry {
  /** Degrees, normalised to [0, 360). */
  rotation: number
  /** The crop box as whole pixels inside the rotated image (`bounds`). */
  region: { left: number; top: number; width: number; height: number }
  /** Size of the cut after scaling (what `drawRegion` sizes its canvas to). */
  output: { width: number; height: number }
}

const clampInt = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

/**
 * Where to cut and how big the result is, given the rotated image's actual size. The crop box is rounded to whole
 * pixels and kept inside the image (the cropper reports fractional, occasionally slightly-out-of-bounds boxes).
 */
export function cropGeometry(bounds: { width: number; height: number }, crop: CropParams, maxSide = CROP_MAX_SIDE): CropGeometry {
  const rotation = ((crop.rotation % 360) + 360) % 360
  const width = clampInt(crop.width, 1, bounds.width)
  const height = clampInt(crop.height, 1, bounds.height)
  const left = clampInt(crop.x, 0, bounds.width - width)
  const top = clampInt(crop.y, 0, bounds.height - height)
  const scale = fitScale(crop.width, crop.height, maxSide)
  return {
    rotation,
    region: { left, top, width, height },
    output: { width: Math.max(1, Math.round(crop.width * scale)), height: Math.max(1, Math.round(crop.height * scale)) },
  }
}

/** `crop` of the encoded image (JPEG/PNG/WebP bytes) as RGBA pixels for `generateDiceGrid`. */
export async function cropWithSharp(image: Buffer, crop: CropParams, maxSide = CROP_MAX_SIDE): Promise<Pixels> {
  const rotation = ((crop.rotation % 360) + 360) % 360
  // Rotating first (into a buffer) gives the real bounding-box size to clamp against; a 90° multiple is exact.
  const rotated = rotation === 0 ? image : await sharp(image).rotate(rotation).toBuffer()
  const meta = await sharp(rotated).metadata()
  if (!meta.width || !meta.height) throw new Error('image has no dimensions')
  const { region, output } = cropGeometry({ width: meta.width, height: meta.height }, crop, maxSide)
  const { data, info } = await sharp(rotated)
    .extract(region)
    .resize(output.width, output.height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height }
}
