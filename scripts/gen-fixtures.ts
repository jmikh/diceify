// Regenerates core/dice/__fixtures__/*.json. Run: npm run gen-fixtures (must be idempotent: clean git diff).
// sharp is only used here to decode/resize the portrait; the synthetic images are built in code.

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { DEFAULT_DICE_PARAMS, computeGridSize, generateDiceGrid, type DiceParams, type Pixels } from '../core/dice'
import type { Fixture } from '../core/dice/__fixtures__/format'
import { encodeGrid } from '../core/dice/encoding'

const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'core/dice/__fixtures__')
const PORTRAIT = path.join(ROOT, 'public/images/monalisa.webp')

const TUNED: DiceParams = { ...DEFAULT_DICE_PARAMS, contrast: 40, gamma: 1.3, edgeSharpening: 60, rotate6: true }

async function portrait(width: number, height: number): Promise<Pixels> {
  const data = await sharp(PORTRAIT).resize(width, height).ensureAlpha().raw().toBuffer()
  return { data: new Uint8ClampedArray(data), width, height }
}

/** Synthetic image from a per-pixel gray function; alpha 255. */
function synthetic(width: number, height: number, gray: (x: number, y: number) => number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4
      data[p] = data[p + 1] = data[p + 2] = gray(x, y)
      data[p + 3] = 255
    }
  }
  return { data, width, height }
}

/** Horizontal gradient: pixel (x, y) has gray x, so every 0..255 level appears in every row. */
const gradient = () => synthetic(256, 16, (x) => x)
/** 8×8 checkerboard of 4-px blocks, grays 64 / 192 (black top-left). */
const checker = () => synthetic(32, 32, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? 64 : 192))

function fixture(name: string, px: Pixels, params: DiceParams): Fixture {
  const grid = generateDiceGrid(px, params)
  const { cols, rows } = computeGridSize(px.width, px.height, params.numRows)
  if (grid.width !== cols || grid.height !== rows) throw new Error(`${name}: grid size mismatch`)
  return {
    name,
    width: px.width,
    height: px.height,
    rgbaBase64: Buffer.from(px.data).toString('base64'),
    params,
    expected: { width: grid.width, height: grid.height, rows: encodeGrid(grid) },
  }
}

async function main() {
  const p120 = await portrait(120, 90)
  const p64 = await portrait(64, 64)
  const fixtures: Fixture[] = [
    fixture('portrait-120x90-default', p120, DEFAULT_DICE_PARAMS),
    fixture('portrait-64x64-tuned', p64, TUNED),
    fixture('portrait-64x64-white-24', p64, { ...DEFAULT_DICE_PARAMS, colorMode: 'white', numRows: 24 }),
    fixture('gradient-256x16-both-16', gradient(), { ...DEFAULT_DICE_PARAMS, numRows: 16 }),
    fixture('gradient-256x16-black-16', gradient(), { ...DEFAULT_DICE_PARAMS, colorMode: 'black', numRows: 16 }),
    fixture('gradient-256x16-white-16', gradient(), { ...DEFAULT_DICE_PARAMS, colorMode: 'white', numRows: 16 }),
    fixture('checker-32x32-tuned-32', checker(), { ...TUNED, numRows: 32 }),
    fixture('checker-32x32-default', checker(), DEFAULT_DICE_PARAMS),
  ]
  for (const f of fixtures) {
    const file = path.join(OUT_DIR, `${f.name}.json`)
    writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
    console.log(`${f.name}: ${f.width}x${f.height} → ${f.expected.width}x${f.expected.height}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
