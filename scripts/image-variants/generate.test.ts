// The committed manifest must describe public/images: a stale one makes the loader emit variant URLs that do not exist
// (or miss variants). Fix: npm run images:variants, commit lib/image-variants.manifest.json. The variant files
// themselves are gitignored, so only sources, widths and candidate lists are checked (not file existence).
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { candidateWidths } from '../../lib/image-variants'
import { listSourceImages, readManifest } from './generate'

const ROOT = path.resolve(__dirname, '../..')

describe('image variants manifest', () => {
  it('lists only /images/**/*.webp sources, never variants', () => {
    const sources = listSourceImages(ROOT)
    expect(sources.length).toBeGreaterThan(0)
    for (const src of sources) expect(src).toMatch(/^\/images\/.+(?<!\.w\d+)\.webp$/)
  })

  it('matches the images on disk (run `npm run images:variants` when this fails)', async () => {
    const manifest = readManifest(ROOT)
    expect(Object.keys(manifest)).toEqual(listSourceImages(ROOT))
    for (const [src, entry] of Object.entries(manifest)) {
      const { width } = await sharp(path.join(ROOT, 'public', src)).metadata()
      expect(entry.width, src).toBe(width)
      const candidates = candidateWidths(entry.width)
      expect(entry.variants, src).toEqual(candidates.filter((w) => entry.variants.includes(w)))
    }
  })
})
