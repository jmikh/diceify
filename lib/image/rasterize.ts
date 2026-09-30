// SVG string → PNG data URL via an offscreen canvas. Used for the tune preview (with the Diceify logo pill)
// and the free-tier progress preview (without). The SVG must already carry `width`/`height` matching `size`
// (pass the same size to `renderGridSvg` / `renderProgressSvg`).

import type { SvgSize } from '@/core/dice'
import { loadImage } from './decode'

export interface RasterizeOptions {
  /** Draw this logo in a dark pill in the top-right corner. A string is loaded first. */
  logo?: HTMLImageElement | string
}

function drawLogoPill(ctx: CanvasRenderingContext2D, size: SvgSize, logo: HTMLImageElement): void {
  const brandingHeight = Math.round(size.height * 0.088)
  const brandingWidth = Math.round(brandingHeight * (logo.naturalWidth / logo.naturalHeight))
  const pad = Math.round(size.height * 0.025)
  const pillPadX = Math.round(pad * 0.8)
  const pillPadY = Math.round(pad * 0.5)
  const x = size.width - brandingWidth - pad - pillPadX
  const y = pad

  const pillH = brandingHeight + pillPadY * 2
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.beginPath()
  ctx.roundRect(x - pillPadX, y - pillPadY, brandingWidth + pillPadX * 2, pillH, Math.round(pillH / 2))
  ctx.fill()
  ctx.drawImage(logo, x, y, brandingWidth, brandingHeight)
}

/** Run `fn` when the browser is idle (bounded), so a large raster does not block an interaction. */
function whenIdle(fn: () => void): void {
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 100 })
  else setTimeout(fn, 0)
}

export async function rasterizeSvg(svg: string, size: SvgSize, opts: RasterizeOptions = {}): Promise<string> {
  const logo = typeof opts.logo === 'string' ? await loadImage(opts.logo) : opts.logo
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = await loadImage(url)
    return await new Promise<string>((resolve, reject) => {
      whenIdle(() => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = size.width
          canvas.height = size.height
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')
          ctx.drawImage(img, 0, 0, size.width, size.height)
          if (logo) drawLogoPill(ctx, size, logo)
          resolve(canvas.toDataURL('image/png'))
        } catch (err) {
          reject(err)
        }
      })
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
