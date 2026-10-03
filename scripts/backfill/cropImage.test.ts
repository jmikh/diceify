import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { generateDiceGrid, DEFAULT_DICE_PARAMS, type CropParams } from '../../core/dice'
import { cropGeometry, cropWithSharp } from './cropImage'

const crop = (over: Partial<CropParams> = {}): CropParams => ({ x: 0, y: 0, width: 400, height: 300, rotation: 0, aspectRatio: '4:3', ...over })

/** 40 × 20: left half black, right half white (JPEG, like a stored original). */
async function halves(): Promise<Buffer> {
  const raw = Buffer.alloc(40 * 20 * 3)
  for (let y = 0; y < 20; y++) for (let x = 0; x < 40; x++) raw.fill(x < 20 ? 0 : 255, (y * 40 + x) * 3, (y * 40 + x) * 3 + 3)
  return sharp(raw, { raw: { width: 40, height: 20, channels: 3 } }).jpeg({ quality: 95 }).toBuffer()
}

describe('cropGeometry', () => {
  it('rounds the box to whole pixels and sizes the output like drawRegion', () => {
    const g = cropGeometry({ width: 1000, height: 800 }, crop({ x: 10.4, y: 20.6, width: 400.5, height: 300.2 }))
    expect(g.region).toEqual({ left: 10, top: 21, width: 401, height: 300 })
    expect(g.output).toEqual({ width: 401, height: 300 }) // no upscale, no downscale below maxSide
  })

  it('scales the output down to maxSide on the longer side', () => {
    const g = cropGeometry({ width: 5000, height: 5000 }, crop({ width: 4096, height: 2048 }))
    expect(g.output).toEqual({ width: 2048, height: 1024 })
    expect(g.region).toEqual({ left: 0, top: 0, width: 4096, height: 2048 })
  })

  it('keeps the box inside the image and normalises the rotation', () => {
    const g = cropGeometry({ width: 100, height: 100 }, crop({ x: 90, y: -5, width: 50, height: 120, rotation: -90 }))
    expect(g.region).toEqual({ left: 50, top: 0, width: 50, height: 100 })
    expect(g.rotation).toBe(270)
  })
})

describe('cropWithSharp', () => {
  it('cuts the region out of the unrotated image', async () => {
    const px = await cropWithSharp(await halves(), crop({ x: 0, y: 0, width: 20, height: 20 }))
    expect([px.width, px.height]).toEqual([20, 20])
    expect(px.data.length).toBe(20 * 20 * 4)
    expect(px.data[0]).toBeLessThan(20) // black
    const right = await cropWithSharp(await halves(), crop({ x: 20, y: 0, width: 20, height: 20 }))
    expect(right.data[0]).toBeGreaterThan(235) // white
  })

  it('rotates into the bounding box first (90°: the halves become top/bottom)', async () => {
    // Rotated 90° clockwise, the 40 × 20 image is 20 × 40 with black on top
    const px = await cropWithSharp(await halves(), crop({ x: 0, y: 0, width: 20, height: 40, rotation: 90 }))
    expect([px.width, px.height]).toEqual([20, 40])
    const grid = generateDiceGrid(px, { ...DEFAULT_DICE_PARAMS, numRows: 2, contrast: 0, edgeSharpening: 0 })
    expect(grid.rows[1][0].color).toBe('black') // top row of the image = last grid row
    expect(grid.rows[0][0].color).toBe('white')
  })

  it('scales the cut to maxSide', async () => {
    const px = await cropWithSharp(await halves(), crop({ width: 40, height: 20 }), 10)
    expect([px.width, px.height]).toEqual([10, 5])
  })
})
