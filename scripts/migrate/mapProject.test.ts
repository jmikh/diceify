import { describe, expect, it } from 'vitest'
import type { LegacyProjectRow } from '../../core/dice'
import { autoRotatedSize, hasImage, imageScaleFactor, mapProjectDocument, parseDataUrl, projectName } from './mapProject'

const row = (over: Partial<LegacyProjectRow> = {}): LegacyProjectRow => ({
  numRows: 40,
  colorMode: 'black',
  contrast: 20,
  gamma: 1.2,
  edgeSharpening: 10,
  rotate6: true,
  rotate3: false,
  rotate2: false,
  gridWidth: 30,
  gridHeight: 40,
  currentX: 5,
  currentY: 2,
  cropX: 100,
  cropY: 200,
  cropWidth: 3000,
  cropHeight: 2250,
  cropRotation: 90,
  ...over,
})

describe('parseDataUrl', () => {
  it('decodes a base64 data URL', () => {
    const parsed = parseDataUrl(`data:image/jpeg;base64,${Buffer.from('hello').toString('base64')}`)
    expect(parsed?.mime).toBe('image/jpeg')
    expect(parsed?.data.toString()).toBe('hello')
  })

  it('rejects non-data, non-base64 and empty payloads', () => {
    expect(parseDataUrl('https://x/y.jpg')).toBeNull()
    expect(parseDataUrl('data:image/png,abc')).toBeNull()
    expect(parseDataUrl('data:image/png;base64,')).toBeNull()
  })

  it('hasImage is true only for data URLs', () => {
    expect(hasImage({ originalImage: 'data:image/png;base64,AA==' })).toBe(true)
    expect(hasImage({ originalImage: null })).toBe(false)
    expect(hasImage({ originalImage: '' })).toBe(false)
  })
})

describe('image geometry', () => {
  it('orientations 5–8 swap width and height (the browser shows the rotated image)', () => {
    expect(autoRotatedSize({ width: 4000, height: 3000 })).toEqual({ width: 4000, height: 3000 })
    expect(autoRotatedSize({ width: 4000, height: 3000, orientation: 1 })).toEqual({ width: 4000, height: 3000 })
    expect(autoRotatedSize({ width: 4000, height: 3000, orientation: 3 })).toEqual({ width: 4000, height: 3000 })
    expect(autoRotatedSize({ width: 4000, height: 3000, orientation: 6 })).toEqual({ width: 3000, height: 4000 })
    expect(autoRotatedSize({ width: 4000, height: 3000, orientation: 8 })).toEqual({ width: 3000, height: 4000 })
  })

  it('factor = output width / shown width', () => {
    expect(imageScaleFactor({ width: 4000, height: 3000 }, { width: 2048, height: 1536 })).toBeCloseTo(0.512, 6)
    expect(imageScaleFactor({ width: 1000, height: 800 }, { width: 1000, height: 800 })).toBe(1)
  })

  it('EXIF-rotated landscape file shown as portrait: factor against the rotated dims', () => {
    // 4000×3000 stored with orientation 6 → browser showed 3000×4000 → sharp.rotate() outputs 1536×2048.
    expect(imageScaleFactor({ width: 4000, height: 3000, orientation: 6 }, { width: 1536, height: 2048 })).toBeCloseTo(0.512, 6)
  })

  it('throws on degenerate sizes', () => {
    expect(() => imageScaleFactor({ width: 0, height: 10 }, { width: 10, height: 10 })).toThrow()
  })
})

describe('mapProjectDocument', () => {
  it('scales the crop by the factor and keeps rotation/aspect, recomputing stats', () => {
    const { document, totalDice, completedDice, cropDropped } = mapProjectDocument(row(), 0.512)
    expect(document.schemaVersion).toBe(1)
    expect(document.step).toBe('build')
    expect(document.crop).toEqual({ x: 51.2, y: 102.4, width: 1536, height: 1152, rotation: 90, aspectRatio: '4:3' })
    expect(document.dice).toMatchObject({ numRows: 40, colorMode: 'black', contrast: 20, gamma: 1.2, edgeSharpening: 10, rotate6: true })
    expect(document.grid).toEqual({ width: 30, height: 40 })
    expect(document.buildProgress).toEqual({ x: 5, y: 2 })
    expect(totalDice).toBe(1200)
    expect(completedDice).toBe(2 * 30 + 5)
    expect(cropDropped).toBe(false)
  })

  it('factor 1 leaves the crop unchanged', () => {
    expect(mapProjectDocument(row(), 1).document.crop).toMatchObject({ x: 100, y: 200, width: 3000, height: 2250 })
  })

  it('a row without a crop maps to step crop with no crop', () => {
    const { document } = mapProjectDocument(row({ cropX: null, cropY: null, cropWidth: null, cropHeight: null, currentX: 0, currentY: 0 }), 0.5)
    expect(document.crop).toBeNull()
    expect(document.step).toBe('crop')
  })

  it('drops a crop that does not survive scaling', () => {
    const { document, cropDropped } = mapProjectDocument(row(), 0)
    expect(cropDropped).toBe(true)
    expect(document.crop).toBeNull()
    expect(document.step).toBe('crop')
    expect(document.buildProgress).toEqual({ x: 0, y: 0 })
  })

  it('projectName falls back for blank names', () => {
    expect(projectName('  My dice ')).toBe('My dice')
    expect(projectName('')).toBe('Untitled Project')
    expect(projectName(null)).toBe('Untitled Project')
  })
})
