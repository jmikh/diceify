// The persisted project document: what the editor needs to restore a project (besides the image).
// Migration from the legacy localStorage draft and the legacy Prisma row lives here so every reader
// (client, migration script) produces the same v1 document.

import { countCompleted } from './build'
import {
  ASPECT_RATIOS,
  COLOR_MODES,
  CURRENT_SCHEMA_VERSION,
  DICE_PARAM_BOUNDS,
  projectDocumentSchema,
} from './document.schema'
import { DEFAULT_DICE_PARAMS, type DiceParams, type GridPos } from './types'

export type AspectRatio = (typeof ASPECT_RATIOS)[number]
export type DocumentStep = 'crop' | 'tune' | 'build'

/** The crop preset used before the user picks one (and for degenerate legacy crops). */
export const DEFAULT_ASPECT_RATIO: AspectRatio = '1:1'

/** Crop box in downscaled-image coordinates. */
export interface CropParams {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  aspectRatio: AspectRatio
}

export interface GridSize {
  width: number
  height: number
}

export interface ProjectDocument {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  /** 'upload' is never persisted: a project always has an image. */
  step: DocumentStep
  crop: CropParams | null
  dice: DiceParams
  /** Dimensions `buildProgress` refers to (null until a grid has been generated). */
  grid: GridSize | null
  buildProgress: GridPos
}

export class DocumentError extends Error {
  constructor(
    readonly code: 'INVALID' | 'UNSUPPORTED_VERSION',
    message: string,
  ) {
    super(message)
    this.name = 'DocumentError'
  }
}

export function createDefaultDocument(): ProjectDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    step: 'crop',
    crop: null,
    dice: { ...DEFAULT_DICE_PARAMS },
    grid: null,
    buildProgress: { x: 0, y: 0 },
  }
}

// ---------------------------------------------------------------------------
// Helpers shared by the migrations
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

const clamp = (v: number, b: { min: number; max: number }) => Math.min(b.max, Math.max(b.min, v))

/** Defaults ⊕ the raw params, numbers clamped to the slider ranges so an old draft never fails validation. */
function normalizeDiceParams(raw: unknown): DiceParams {
  const r = isObject(raw) ? raw : {}
  const d = DEFAULT_DICE_PARAMS
  const colorMode = COLOR_MODES.find((m) => m === r.colorMode) ?? d.colorMode
  return {
    numRows: Math.round(clamp(num(r.numRows, d.numRows), DICE_PARAM_BOUNDS.numRows)),
    colorMode,
    contrast: clamp(num(r.contrast, d.contrast), DICE_PARAM_BOUNDS.contrast),
    gamma: clamp(num(r.gamma, d.gamma), DICE_PARAM_BOUNDS.gamma),
    edgeSharpening: clamp(num(r.edgeSharpening, d.edgeSharpening), DICE_PARAM_BOUNDS.edgeSharpening),
    rotate6: r.rotate6 === true,
    rotate3: r.rotate3 === true,
    rotate2: r.rotate2 === true,
  }
}

/** Crop from legacy numeric fields; null unless x/y are numbers and width/height are positive. */
function legacyCrop(x: unknown, y: unknown, width: unknown, height: unknown, rotation: unknown): CropParams | null {
  if (typeof x !== 'number' || typeof y !== 'number') return null
  const w = num(width, 0)
  const h = num(height, 0)
  if (w <= 0 || h <= 0) return null
  return { x, y, width: w, height: h, rotation: num(rotation, 0), aspectRatio: nearestAspectRatio(w, h) }
}

function legacyGrid(width: unknown, height: unknown): GridSize | null {
  const w = num(width, 0)
  const h = num(height, 0)
  return w > 0 && h > 0 ? { width: Math.round(w), height: Math.round(h) } : null
}

function legacyProgress(x: unknown, y: unknown): GridPos {
  return { x: Math.max(0, Math.round(num(x, 0))), y: Math.max(0, Math.round(num(y, 0))) }
}

function validate(candidate: unknown): ProjectDocument {
  const result = projectDocumentSchema.safeParse(candidate)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new DocumentError('INVALID', `Invalid project document: ${issue.path.join('.') || '<root>'}: ${issue.message}`)
  }
  return result.data
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

/**
 * Legacy localStorage draft (`useAutosave.buildSnapshot`, no `schemaVersion`):
 * `{ name, step, cropParams, diceParams, buildProgress, gridWidth, gridHeight, totalDice }`
 * (older drafts also carried `originalImage`/`projectName`; they are ignored — `name` is not part of the document).
 */
function fromLegacyDraft(raw: Raw): ProjectDocument {
  const crop = isObject(raw.cropParams)
    ? legacyCrop(raw.cropParams.x, raw.cropParams.y, raw.cropParams.width, raw.cropParams.height, raw.cropParams.rotation)
    : null
  const progress = isObject(raw.buildProgress) ? legacyProgress(raw.buildProgress.x, raw.buildProgress.y) : { x: 0, y: 0 }
  const step: DocumentStep = raw.step === 'tune' || raw.step === 'build' ? raw.step : 'crop'
  return validate({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    step,
    crop,
    dice: normalizeDiceParams(raw.diceParams),
    grid: legacyGrid(raw.gridWidth, raw.gridHeight),
    buildProgress: progress,
  })
}

/**
 * Accepts a current document (validated strictly) or a legacy draft snapshot (converted, then validated).
 * Throws `DocumentError` for anything else.
 */
export function migrateDocument(raw: unknown): ProjectDocument {
  if (!isObject(raw)) throw new DocumentError('INVALID', 'Project document must be an object')
  if (raw.schemaVersion === undefined) return fromLegacyDraft(raw)
  if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) return validate(raw)
  throw new DocumentError('UNSUPPORTED_VERSION', `Unsupported project document version ${String(raw.schemaVersion)}`)
}

/** Columns of the Prisma `Project` model that map onto the document. */
export interface LegacyProjectRow {
  numRows: number
  colorMode: string
  contrast: number
  gamma: number
  edgeSharpening: number
  rotate6: boolean
  rotate3: boolean
  rotate2: boolean
  gridWidth: number | null
  gridHeight: number | null
  currentX: number
  currentY: number
  cropX: number | null
  cropY: number | null
  cropWidth: number | null
  cropHeight: number | null
  cropRotation: number
}

/** Legacy Prisma row → v1. Step: build when progress > 0, else tune when cropped, else crop. */
export function fromLegacyProjectRow(row: LegacyProjectRow): ProjectDocument {
  const crop = legacyCrop(row.cropX, row.cropY, row.cropWidth, row.cropHeight, row.cropRotation)
  const buildProgress = legacyProgress(row.currentX, row.currentY)
  const step: DocumentStep = buildProgress.x > 0 || buildProgress.y > 0 ? 'build' : crop ? 'tune' : 'crop'
  return validate({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    step,
    crop,
    dice: normalizeDiceParams(row),
    grid: legacyGrid(row.gridWidth, row.gridHeight),
    buildProgress,
  })
}

// ---------------------------------------------------------------------------
// Crop helpers
// ---------------------------------------------------------------------------

const ratioOf = (aspect: AspectRatio): number => {
  const [w, h] = aspect.split(':').map(Number)
  return w / h
}

/** The preset closest to w/h; `DEFAULT_ASPECT_RATIO` for degenerate input. */
export function nearestAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height
  if (!Number.isFinite(ratio) || ratio <= 0) return DEFAULT_ASPECT_RATIO
  let best: AspectRatio = ASPECT_RATIOS[0]
  let bestDistance = Infinity
  for (const aspect of ASPECT_RATIOS) {
    const distance = Math.abs(ratio - ratioOf(aspect))
    if (distance < bestDistance) {
      best = aspect
      bestDistance = distance
    }
  }
  return best
}

/** Rescale a crop box when the image it refers to is resized by `factor` (rotation and preset unchanged). */
export function scaleCrop(crop: CropParams, factor: number): CropParams {
  return { ...crop, x: crop.x * factor, y: crop.y * factor, width: crop.width * factor, height: crop.height * factor }
}

// ---------------------------------------------------------------------------
// Derived values and comparisons
// ---------------------------------------------------------------------------

export function documentStats(doc: Pick<ProjectDocument, 'grid' | 'buildProgress'>): { totalDice: number; completedDice: number } {
  if (!doc.grid) return { totalDice: 0, completedDice: 0 }
  const totalDice = doc.grid.width * doc.grid.height
  const completedDice = Math.min(totalDice, Math.max(0, countCompleted(doc.buildProgress, doc.grid.width)))
  return { totalDice, completedDice }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isObject(value)) {
    const keys = Object.keys(value).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** Structural equality independent of key order. */
export function documentsEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b)
}

/** Crop coordinates jitter by fractions of a pixel when the cropper remounts, so compare with a tolerance. */
export function cropParamsEqual(a: CropParams | null, b: CropParams | null, tolerance = 0.01): boolean {
  if (!a || !b) return a === b
  return (
    Math.abs(a.x - b.x) < tolerance &&
    Math.abs(a.y - b.y) < tolerance &&
    Math.abs(a.width - b.width) < tolerance &&
    Math.abs(a.height - b.height) < tolerance &&
    Math.abs(a.rotation - b.rotation) < tolerance
  )
}

export interface BuildBaseline {
  crop: CropParams | null
  dice: DiceParams
}

/** Does build progress made against `baseline` still apply to the document's current crop/tune params? */
export function progressApplies(doc: Pick<ProjectDocument, 'crop' | 'dice'>, baseline: BuildBaseline | null): boolean {
  return !!baseline && cropParamsEqual(baseline.crop, doc.crop) && documentsEqual(baseline.dice, doc.dice)
}
