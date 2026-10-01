// The social card of a share (what X/Facebook show for `/s/<id>`): dark background with the brand glow, the dice art,
// the logo, the dice count and where to make your own. `core/share/card.ts` decides where things go; this draws them.
// JPEG, for the public `share-images` bucket.

import { renderGridSvg, type DiceGrid } from '@/core/dice'
import { formatDiceCount, gridLabel, shareCardLayout } from '@/core/share'
import { encodeJpeg, loadImage } from './decode'

const PINK = '#FF2D92'
// public/logo-full.svg (viewBox 118 × 32), drawn 44 px tall
const LOGO = { src: '/logo-full.svg', width: Math.round((44 * 118) / 32), height: 44 }

async function loadSvg(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    return await loadImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** A static SVG with explicit pixel dimensions: canvases cannot draw an SVG that has only a viewBox (Firefox). */
async function loadSizedSvg(src: string, width: number, height: number): Promise<HTMLImageElement> {
  const text = await (await fetch(src)).text()
  return loadSvg(text.replace('<svg ', `<svg width="${width}" height="${height}" `))
}

/** The page's web fonts (next/font): body = Outfit, heading = Syne (`--font-syne` on <html>). */
function pageFonts(): { body: string; heading: string } {
  const body = getComputedStyle(document.body).fontFamily || 'sans-serif'
  const heading = getComputedStyle(document.documentElement).getPropertyValue('--font-syne').trim() || body
  return { body, heading }
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

interface TextLine {
  text: string
  font: string
  color: string
  size: number
  /** Space above this line. */
  gap: number
}

export async function renderShareCard(grid: DiceGrid): Promise<Blob> {
  const layout = shareCardLayout(grid.width, grid.height)
  const { art, text } = layout
  const fonts = pageFonts()

  const lines: TextLine[] = [
    { text: formatDiceCount(grid.width * grid.height), font: `700 {size}px ${fonts.heading}`, color: '#ffffff', size: 92, gap: 40 },
    { text: `dice · ${gridLabel({ cols: grid.width, rows: grid.height })}`, font: `500 {size}px ${fonts.body}`, color: 'rgba(255, 255, 255, 0.7)', size: 30, gap: 6 },
    { text: 'Turn any photo into dice art', font: `400 {size}px ${fonts.body}`, color: 'rgba(255, 255, 255, 0.6)', size: 24, gap: 48 },
    { text: 'diceify.art', font: `700 {size}px ${fonts.body}`, color: PINK, size: 30, gap: 8 },
  ]
  const fontOf = (line: TextLine) => line.font.replace('{size}', String(line.size))
  await Promise.all(lines.map((line) => document.fonts.load(fontOf(line), line.text)))

  const [artImage, logo] = await Promise.all([
    loadSvg(renderGridSvg(grid, { width: art.width, height: art.height })),
    loadSizedSvg(LOGO.src, LOGO.width, LOGO.height),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  // Background: the site's near-black with a pink glow behind the text and a purple one under the art
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, layout.width, layout.height)
  glow(ctx, text.x + text.width, 0, 560, 'rgba(255, 45, 146, 0.28)')
  glow(ctx, art.x, layout.height, 520, 'rgba(124, 58, 237, 0.22)')

  // The art, with rounded corners and a hairline border
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(art.x, art.y, art.width, art.height, 14)
  ctx.clip()
  ctx.drawImage(artImage, art.x, art.y, art.width, art.height)
  ctx.restore()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(art.x, art.y, art.width, art.height, 14)
  ctx.stroke()

  // Text column, vertically centred: logo, dice count (shrunk to fit), grid size, call to action
  ctx.textBaseline = 'top'
  for (const line of lines) {
    ctx.font = fontOf(line)
    const measured = ctx.measureText(line.text).width
    if (measured > text.width) line.size = Math.floor((line.size * text.width) / measured)
  }
  const blockHeight = LOGO.height + lines.reduce((sum, line) => sum + line.gap + line.size, 0)
  let y = text.y + Math.round((text.height - blockHeight) / 2)
  ctx.drawImage(logo, text.x, y, LOGO.width, LOGO.height)
  y += LOGO.height
  for (const line of lines) {
    y += line.gap
    ctx.font = fontOf(line)
    ctx.fillStyle = line.color
    ctx.fillText(line.text, text.x, y)
    y += line.size
  }

  return encodeJpeg(canvas, 0.9)
}
