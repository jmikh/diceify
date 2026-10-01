// SVG string → PNG data URL via an offscreen canvas. Used for the tune preview and the free-tier progress
// preview. The SVG must already carry `width`/`height` matching `size` (pass the same size to `renderGridSvg` /
// `renderProgressSvg`).

import type { SvgSize } from '@/core/dice'
import { loadImage } from './decode'

/** Run `fn` when the browser is idle (bounded), so a large raster does not block an interaction. */
function whenIdle(fn: () => void): void {
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 100 })
  else setTimeout(fn, 0)
}

export async function rasterizeSvg(svg: string, size: SvgSize): Promise<string> {
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
