import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { encodeGrid, type Fixture } from './__fixtures__/format'
import { computeGridSize, generateDiceGrid } from './generate'
import { DEFAULT_DICE_PARAMS, type Pixels } from './types'

describe('computeGridSize', () => {
  it.each([
    [120, 90, 30, 40, 30],
    [64, 64, 30, 30, 30],
    [256, 16, 16, 256, 16],
    [32, 32, 30, 30, 30],
    [1000, 10, 1, 100, 1],
    [10, 1000, 30, 1, 30], // round(0.3) = 0 → clamped to 1 column
  ])('%ix%i with %i rows → %ix%i', (w, h, numRows, cols, rows) => {
    expect(computeGridSize(w, h, numRows)).toEqual({ cols, rows })
  })
})

describe('generateDiceGrid', () => {
  it('puts the top image row at the highest grid row (rows[0] is the bottom)', () => {
    // 1 px wide, 2 px tall: dark on top, light at the bottom
    const px: Pixels = { data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]), width: 1, height: 2 }
    const grid = generateDiceGrid(px, { ...DEFAULT_DICE_PARAMS, numRows: 2 })
    expect(grid.width).toBe(1)
    expect(grid.height).toBe(2)
    expect(grid.rows[0]).toEqual([{ face: 1, color: 'white' }])
    expect(grid.rows[1]).toEqual([{ face: 1, color: 'black' }])
  })
  it('skips sharpening at 0 and applies it above 0', () => {
    const px: Pixels = {
      data: new Uint8ClampedArray(9 * 4).fill(255),
      width: 3,
      height: 3,
    }
    px.data.set([64, 64, 64, 255], 4 * 4) // dark center
    const plain = generateDiceGrid(px, { ...DEFAULT_DICE_PARAMS, numRows: 3 })
    const sharp = generateDiceGrid(px, { ...DEFAULT_DICE_PARAMS, numRows: 3, edgeSharpening: 100 })
    expect(plain.rows[1][1]).toEqual({ face: 6, color: 'black' })
    expect(sharp.rows[1][1]).toEqual({ face: 1, color: 'black' }) // 64*5 - 4*255 < 0 → clamped to 0
    expect(sharp.rows[0]).toEqual(plain.rows[0]) // border untouched
  })
})

describe('fixtures', () => {
  const dir = path.join(__dirname, '__fixtures__')
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

  it('exist', () => {
    expect(files.length).toBeGreaterThanOrEqual(8)
  })

  for (const file of files) {
    it(file, () => {
      const fixture = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as Fixture
      expect(fixture.name + '.json').toBe(file)
      const data = new Uint8ClampedArray(Buffer.from(fixture.rgbaBase64, 'base64'))
      expect(data.length).toBe(fixture.width * fixture.height * 4)

      const px: Pixels = { data, width: fixture.width, height: fixture.height }
      const { cols, rows } = computeGridSize(px.width, px.height, fixture.params.numRows)
      expect({ cols, rows }).toEqual({ cols: fixture.expected.width, rows: fixture.expected.height })

      const grid = generateDiceGrid(px, fixture.params)
      expect(grid.width).toBe(cols)
      expect(grid.height).toBe(rows)
      expect(encodeGrid(grid)).toEqual(fixture.expected.rows)
    })
  }
})
