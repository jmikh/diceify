// Renders the /dice-art color-mode comparison: one photo as dice in each ColorMode, same settings otherwise.
// Run: npx tsx scripts/gen-color-mode-examples.ts (re-run after changing THRESHOLDS, like gen-fixtures).

import { mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { DEFAULT_DICE_PARAMS, generateDiceGrid, rasterSize, renderGridSvg, type ColorMode, type Pixels } from '../core/dice'

const ROOT = path.resolve(__dirname, '..')
const SOURCE = path.join(ROOT, 'public/images/hero/kids-photo.webp')
const OUT_DIR = path.join(ROOT, 'public/images/dice-art')
const NUM_ROWS = 50
const LONG_SIDE = 560
const MODES: ColorMode[] = ['black', 'white', 'both']

/** The source cropped to a centered square. */
async function squarePixels(file: string): Promise<Pixels> {
  const { width = 0, height = 0 } = await sharp(file).metadata()
  const side = Math.min(width, height)
  const { data, info } = await sharp(file)
    .extract({ left: Math.round((width - side) / 2), top: Math.round((height - side) / 2), width: side, height: side })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height }
}

async function main() {
  const px = await squarePixels(SOURCE)
  mkdirSync(OUT_DIR, { recursive: true })
  for (const colorMode of MODES) {
    const grid = generateDiceGrid(px, { ...DEFAULT_DICE_PARAMS, numRows: NUM_ROWS, colorMode })
    const svg = renderGridSvg(grid, rasterSize(grid.width, grid.height, LONG_SIDE))
    const file = path.join(OUT_DIR, `kids-${grid.width}x${grid.height}-${colorMode}.webp`)
    await sharp(Buffer.from(svg)).webp({ quality: 75 }).toFile(file)
    console.log(path.relative(ROOT, file))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
