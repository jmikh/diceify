// Browser image adapters: HTMLImageElement / canvas in, core `Pixels` (or a Blob) out.
// Everything that touches the DOM for image decoding lives here; `core/` never does.

import type { Pixels } from '@/core/dice'

/** A rectangle in the (rotated) source image's coordinate space plus the rotation that produced it. */
export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
  /** Degrees, clockwise. The region is expressed in the rotated image's bounding box. */
  rotation?: number
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

/** Scale factor that fits `width × height` inside `maxSide` on its longer axis. Never upscales. */
export function fitScale(width: number, height: number, maxSide: number): number {
  return Math.min(1, maxSide / Math.max(width, height))
}

/** Size of the axis-aligned box that contains `width × height` rotated by `rotationDeg` (rounded to whole pixels). */
export function rotatedBounds(width: number, height: number, rotationDeg: number): { width: number; height: number } {
  const rad = (rotationDeg * Math.PI) / 180
  return {
    width: Math.round(Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad))),
    height: Math.round(Math.abs(width * Math.sin(rad)) + Math.abs(height * Math.cos(rad))),
  }
}

/**
 * Draw `region` of `img` (after rotating the image into its bounding box, which is the space the cropper
 * reports coordinates in) onto a new canvas, scaled so the longer side is at most `maxSide`.
 */
export function drawRegion(img: HTMLImageElement, region: CropRegion, maxSide: number): HTMLCanvasElement {
  const rotation = (((region.rotation ?? 0) % 360) + 360) % 360
  const w = img.naturalWidth
  const h = img.naturalHeight
  const bounds = rotation === 0 ? { width: w, height: h } : rotatedBounds(w, h, rotation)
  const scale = fitScale(region.width, region.height, maxSide)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(region.width * scale))
  canvas.height = Math.max(1, Math.round(region.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Output ← scale ← crop offset ← rotation about the bounding-box centre ← image centred.
  ctx.scale(scale, scale)
  ctx.translate(-region.x, -region.y)
  ctx.translate(bounds.width / 2, bounds.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(img, -w / 2, -h / 2)
  return canvas
}

export function canvasToPixels(canvas: HTMLCanvasElement): Pixels {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Could not get canvas context')
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { data, width, height }
}

function fullRegion(img: HTMLImageElement): CropRegion {
  return { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight, rotation: 0 }
}

/** Decode a whole image (data or object URL) to `Pixels`, downscaled to `maxSide` on the longer side. */
export async function dataUrlToPixels(src: string, maxSide = 2048): Promise<Pixels> {
  const img = await loadImage(src)
  return canvasToPixels(drawRegion(img, fullRegion(img), maxSide))
}

/** Re-encode an uploaded image as a JPEG no larger than `maxSide` (the immutable per-project original). */
export async function downscaleForUpload(file: File | Blob, maxSide = 2048, quality = 0.85): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const canvas = drawRegion(img, fullRegion(img), maxSide)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))), 'image/jpeg', quality)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
