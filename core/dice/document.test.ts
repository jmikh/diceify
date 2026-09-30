import { describe, expect, it } from 'vitest'
import {
  createDefaultDocument,
  cropParamsEqual,
  DocumentError,
  documentsEqual,
  documentStats,
  fromLegacyProjectRow,
  migrateDocument,
  nearestAspectRatio,
  progressApplies,
  scaleCrop,
  type CropParams,
  type LegacyProjectRow,
  type ProjectDocument,
} from './document'
import { CURRENT_SCHEMA_VERSION, DICE_PARAM_BOUNDS, projectDocumentSchema } from './document.schema'
import { DEFAULT_DICE_PARAMS } from './types'

const crop: CropParams = { x: 10, y: 20, width: 400, height: 300, rotation: 90, aspectRatio: '4:3' }

const fullDoc = (): ProjectDocument => ({
  schemaVersion: 1,
  step: 'build',
  crop,
  dice: { ...DEFAULT_DICE_PARAMS, numRows: 40, contrast: 30 },
  grid: { width: 53, height: 40 },
  buildProgress: { x: 7, y: 3 },
})

const expectError = (raw: unknown, code: DocumentError['code']) => {
  try {
    migrateDocument(raw)
  } catch (e) {
    expect(e).toBeInstanceOf(DocumentError)
    expect((e as DocumentError).code).toBe(code)
    return
  }
  throw new Error('expected migrateDocument to throw')
}

describe('createDefaultDocument', () => {
  it('is a valid current document', () => {
    const doc = createDefaultDocument()
    expect(projectDocumentSchema.safeParse(doc).success).toBe(true)
    expect(doc).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      step: 'crop',
      crop: null,
      dice: DEFAULT_DICE_PARAMS,
      grid: null,
      buildProgress: { x: 0, y: 0 },
    })
    expect(doc.dice).not.toBe(DEFAULT_DICE_PARAMS)
  })
})

describe('migrateDocument: current documents', () => {
  it('passes a valid v1 document through unchanged', () => {
    const doc = fullDoc()
    expect(migrateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('rejects unknown keys, NaN, out-of-range and wrong-type fields', () => {
    expectError({ ...fullDoc(), extra: 1 }, 'INVALID')
    expectError({ ...fullDoc(), crop: { ...crop, rotation: NaN } }, 'INVALID')
    expectError({ ...fullDoc(), dice: { ...DEFAULT_DICE_PARAMS, numRows: DICE_PARAM_BOUNDS.numRows.max + 1 } }, 'INVALID')
    expectError({ ...fullDoc(), dice: { ...DEFAULT_DICE_PARAMS, gamma: 0.49 } }, 'INVALID')
    expectError({ ...fullDoc(), buildProgress: { x: -1, y: 0 } }, 'INVALID')
    expectError({ ...fullDoc(), step: 'upload' }, 'INVALID')
    expectError({ ...fullDoc(), crop: { ...crop, aspectRatio: '5:4' } }, 'INVALID')
  })

  it('rejects non-objects and unsupported versions', () => {
    expectError(null, 'INVALID')
    expectError('doc', 'INVALID')
    expectError([], 'INVALID')
    expectError({ ...fullDoc(), schemaVersion: 2 }, 'UNSUPPORTED_VERSION')
    expectError({ ...fullDoc(), schemaVersion: '1' }, 'UNSUPPORTED_VERSION')
  })
})

describe('migrateDocument: legacy draft snapshot (no schemaVersion)', () => {
  const draft = {
    name: 'My draft',
    step: 'build',
    cropParams: { x: 1.5, y: 2.5, width: 640, height: 360, rotation: 180 },
    diceParams: { ...DEFAULT_DICE_PARAMS, numRows: 50, edgeSharpening: 20 },
    buildProgress: { x: 4, y: 2 },
    gridWidth: 89,
    gridHeight: 50,
    totalDice: 4450,
  }

  it('converts a full snapshot and infers the aspect preset', () => {
    expect(migrateDocument(draft)).toEqual({
      schemaVersion: 1,
      step: 'build',
      crop: { x: 1.5, y: 2.5, width: 640, height: 360, rotation: 180, aspectRatio: '16:9' },
      dice: { ...DEFAULT_DICE_PARAMS, numRows: 50, edgeSharpening: 20 },
      grid: { width: 89, height: 50 },
      buildProgress: { x: 4, y: 2 },
    })
  })

  it('maps the upload step to crop, and tolerates missing pieces', () => {
    const doc = migrateDocument({ step: 'upload', projectName: 'old', originalImage: 'data:…', cropParams: null })
    expect(doc).toEqual({ ...createDefaultDocument(), step: 'crop' })
    expect(migrateDocument({}).step).toBe('crop')
    expect(migrateDocument({ step: 'tune', cropParams: draft.cropParams, diceParams: {} }).step).toBe('tune')
  })

  it('defaults missing progress to the origin and ignores negative or fractional values', () => {
    expect(migrateDocument({ ...draft, buildProgress: undefined }).buildProgress).toEqual({ x: 0, y: 0 })
    expect(migrateDocument({ ...draft, buildProgress: { x: -3, y: 1.4 } }).buildProgress).toEqual({ x: 0, y: 1 })
  })

  it('clamps out-of-range tune params and drops unknown color modes', () => {
    const doc = migrateDocument({
      ...draft,
      diceParams: { numRows: 10, contrast: 500, gamma: 3, edgeSharpening: -5, colorMode: 'sepia', rotate6: 'yes' },
    })
    expect(doc.dice).toEqual({
      numRows: DICE_PARAM_BOUNDS.numRows.min,
      colorMode: 'both',
      contrast: 100,
      gamma: 1.5,
      edgeSharpening: 0,
      rotate6: false,
      rotate3: false,
      rotate2: false,
    })
  })

  it('drops a crop with a non-positive size and an incomplete grid', () => {
    const doc = migrateDocument({ ...draft, cropParams: { x: 0, y: 0, width: 0, height: 10 }, gridWidth: 10, gridHeight: null })
    expect(doc.crop).toBeNull()
    expect(doc.grid).toBeNull()
  })
})

describe('fromLegacyProjectRow', () => {
  const row: LegacyProjectRow = {
    numRows: 60,
    colorMode: 'black',
    contrast: 10,
    gamma: 1.2,
    edgeSharpening: 0,
    rotate6: true,
    rotate3: false,
    rotate2: false,
    gridWidth: 45,
    gridHeight: 60,
    currentX: 3,
    currentY: 9,
    cropX: 12.5,
    cropY: 0,
    cropWidth: 300,
    cropHeight: 400,
    cropRotation: 270,
  }

  it('maps columns, keeps rotation, infers the aspect and the build step', () => {
    expect(fromLegacyProjectRow(row)).toEqual({
      schemaVersion: 1,
      step: 'build',
      crop: { x: 12.5, y: 0, width: 300, height: 400, rotation: 270, aspectRatio: '3:4' },
      dice: { numRows: 60, colorMode: 'black', contrast: 10, gamma: 1.2, edgeSharpening: 0, rotate6: true, rotate3: false, rotate2: false },
      grid: { width: 45, height: 60 },
      buildProgress: { x: 3, y: 9 },
    })
  })

  it('infers tune when cropped without progress, crop when not cropped', () => {
    expect(fromLegacyProjectRow({ ...row, currentX: 0, currentY: 0 }).step).toBe('tune')
    const uncropped = fromLegacyProjectRow({ ...row, currentX: 0, currentY: 0, cropX: null, cropY: null, cropWidth: null, cropHeight: null })
    expect(uncropped.step).toBe('crop')
    expect(uncropped.crop).toBeNull()
  })

  it('treats a crop with null width as no crop and clamps params', () => {
    const doc = fromLegacyProjectRow({ ...row, cropWidth: null, numRows: 500, colorMode: 'rainbow', gridWidth: null, gridHeight: null })
    expect(doc.crop).toBeNull()
    expect(doc.grid).toBeNull()
    expect(doc.dice.numRows).toBe(DICE_PARAM_BOUNDS.numRows.max)
    expect(doc.dice.colorMode).toBe('both')
  })
})

describe('crop helpers', () => {
  it('nearestAspectRatio picks the closest preset and falls back to 1:1', () => {
    expect(nearestAspectRatio(100, 100)).toBe('1:1')
    expect(nearestAspectRatio(300, 400)).toBe('3:4')
    expect(nearestAspectRatio(400, 300)).toBe('4:3')
    expect(nearestAspectRatio(200, 300)).toBe('2:3')
    expect(nearestAspectRatio(1920, 1080)).toBe('16:9')
    expect(nearestAspectRatio(1900, 1080)).toBe('16:9')
    expect(nearestAspectRatio(700, 1000)).toBe('2:3')
    expect(nearestAspectRatio(100, 0)).toBe('1:1')
    expect(nearestAspectRatio(NaN, 1)).toBe('1:1')
  })

  it('scaleCrop scales the box only', () => {
    expect(scaleCrop(crop, 0.5)).toEqual({ x: 5, y: 10, width: 200, height: 150, rotation: 90, aspectRatio: '4:3' })
  })
})

describe('documentStats', () => {
  it('derives totals and clamps completed to the grid', () => {
    expect(documentStats(fullDoc())).toEqual({ totalDice: 2120, completedDice: 166 })
    expect(documentStats({ grid: { width: 10, height: 2 }, buildProgress: { x: 5, y: 7 } })).toEqual({ totalDice: 20, completedDice: 20 })
    expect(documentStats({ grid: null, buildProgress: { x: 5, y: 7 } })).toEqual({ totalDice: 0, completedDice: 0 })
  })
})

describe('equality', () => {
  it('documentsEqual ignores key order and nested order', () => {
    const a = fullDoc()
    const b = { buildProgress: { y: 3, x: 7 }, grid: { height: 40, width: 53 }, dice: { ...a.dice }, crop: { ...a.crop }, step: 'build', schemaVersion: 1 }
    expect(documentsEqual(a, b)).toBe(true)
    expect(documentsEqual(a, { ...b, step: 'tune' })).toBe(false)
  })

  it('cropParamsEqual tolerates sub-pixel jitter and handles null', () => {
    expect(cropParamsEqual(crop, { ...crop, x: crop.x + 0.009 })).toBe(true)
    expect(cropParamsEqual(crop, { ...crop, x: crop.x + 0.011 })).toBe(false)
    expect(cropParamsEqual(crop, { ...crop, rotation: 0 })).toBe(false)
    expect(cropParamsEqual(crop, { ...crop, x: crop.x + 0.5 }, 1)).toBe(true)
    expect(cropParamsEqual(null, null)).toBe(true)
    expect(cropParamsEqual(crop, null)).toBe(false)
  })

  it('progressApplies detects crop/tune drift from the baseline', () => {
    const doc = fullDoc()
    const baseline = { crop: { ...crop }, dice: { ...doc.dice } }
    expect(progressApplies(doc, baseline)).toBe(true)
    expect(progressApplies(doc, null)).toBe(false)
    expect(progressApplies({ ...doc, dice: { ...doc.dice, contrast: 31 } }, baseline)).toBe(false)
    expect(progressApplies({ ...doc, crop: { ...crop, width: 401 } }, baseline)).toBe(false)
    expect(progressApplies({ ...doc, crop: { ...crop, width: 400.001 } }, baseline)).toBe(true)
    expect(progressApplies({ ...doc, crop: null }, baseline)).toBe(false)
  })
})
