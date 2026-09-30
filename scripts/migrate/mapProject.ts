// Legacy `Project` row → v1 document + stats, and the image geometry that scales its crop.
// The legacy uploader stored the raw file (data URL, no downscale) and the cropper worked in the browser-decoded
// pixel space of that original (EXIF auto-rotated). The new editor's crop lives in stored-image (≤ 2048 px)
// coordinates, so the crop is multiplied by `stored / autoRotatedOriginal`. Pure; sharp stays in the script.

import {
  DocumentError,
  documentStats,
  fromLegacyProjectRow,
  scaleCrop,
  type LegacyProjectRow,
  type ProjectDocument,
} from '../../core/dice'

export const MAX_IMAGE_SIDE = 2048
export const JPEG_QUALITY = 85
export const DEFAULT_PROJECT_NAME = 'Untitled Project'

/** The Prisma `Project` columns the migration reads (`LEGACY_PROJECT_COLUMNS`). */
export interface LegacyProjectFull extends LegacyProjectRow {
  id: string
  name: string | null
  userId: string
  originalImage: string | null
  totalDice: number
  completedDice: number
  percentComplete: number
  createdAt: Date
  updatedAt: Date
}

export interface ImageSize {
  width: number
  height: number
}

export interface ImageMeta extends ImageSize {
  /** EXIF orientation 1..8 (absent = 1). */
  orientation?: number
}

export function hasImage(row: Pick<LegacyProjectFull, 'originalImage'>): boolean {
  return typeof row.originalImage === 'string' && row.originalImage.startsWith('data:')
}

/** `data:<mime>;base64,<payload>` → bytes; null for anything else. */
export function parseDataUrl(dataUrl: string): { mime: string; data: Buffer } | null {
  const match = /^data:([^;,]+)(;[^,]*)?,(.*)$/s.exec(dataUrl)
  if (!match) return null
  const [, mime, params = '', payload] = match
  if (!params.split(';').includes('base64')) return null
  const data = Buffer.from(payload, 'base64')
  return data.length > 0 ? { mime, data } : null
}

/** The size a browser shows: EXIF orientations 5–8 rotate by 90°, swapping width and height. */
export function autoRotatedSize(meta: ImageMeta): ImageSize {
  const swap = meta.orientation !== undefined && meta.orientation >= 5 && meta.orientation <= 8
  return swap ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height }
}

/** `output / autoRotated(original)` along the width (the resize is uniform, so both axes agree). */
export function imageScaleFactor(original: ImageMeta, output: ImageSize): number {
  const shown = autoRotatedSize(original)
  if (shown.width <= 0 || output.width <= 0) throw new Error(`invalid image size ${shown.width}→${output.width}`)
  return output.width / shown.width
}

export function projectName(name: string | null): string {
  const trimmed = name?.trim() ?? ''
  return trimmed === '' ? DEFAULT_PROJECT_NAME : trimmed
}

export interface MappedProject {
  document: ProjectDocument
  totalDice: number
  completedDice: number
  /** True when the scaled crop did not validate and was dropped (step falls back to 'crop'). */
  cropDropped: boolean
}

/** `fromLegacyProjectRow` then the crop scaled by `factor`; a crop that fails validation after scaling is dropped. */
export function mapProjectDocument(row: LegacyProjectRow, factor: number): MappedProject {
  const base = fromLegacyProjectRow(row)
  let document = base
  let cropDropped = false
  if (base.crop) {
    const scaled = scaleCrop(base.crop, factor)
    if (scaled.width > 0 && scaled.height > 0 && Number.isFinite(scaled.x) && Number.isFinite(scaled.y)) {
      document = { ...base, crop: scaled }
    } else {
      cropDropped = true
      document = { ...base, crop: null, step: 'crop', buildProgress: { x: 0, y: 0 } }
    }
  }
  const stats = documentStats(document)
  return { document, ...stats, cropDropped }
}

export const isDocumentError = (e: unknown): e is DocumentError => e instanceof DocumentError
