import { describe, expect, it } from 'vitest'
import {
  type ImageManifest,
  VARIANT_WIDTHS,
  candidateWidths,
  imageSrcSet,
  isVariantFile,
  isVariantSource,
  pickVariantWidth,
  resolveImageSrc,
  variantPath,
} from './image-variants'

const manifest: ImageManifest = {
  '/images/frida.webp': { width: 600, variants: [320, 480] },
  // 640/960 re-encoded bigger than the original, so the generator kept only 320/480.
  '/images/hero/kids-dice.webp': { width: 1240, variants: [320, 480] },
  '/images/blog/post.webp': { width: 1024, variants: [320, 480, 640, 960] },
  '/images/tiny.webp': { width: 300, variants: [] },
}

describe('variant naming', () => {
  it('inserts the width before the extension', () => {
    expect(variantPath('/images/a/b.webp', 320)).toBe('/images/a/b.w320.webp')
    expect(variantPath('public/images/b.webp', 1240)).toBe('public/images/b.w1240.webp')
  })

  it('tells sources from generated variants', () => {
    expect(isVariantSource('/images/a.webp')).toBe(true)
    expect(isVariantSource('/images/a.w320.webp')).toBe(false)
    expect(isVariantSource('/images/og-card.jpg')).toBe(false)
    expect(isVariantSource('/favicon.svg')).toBe(false)
    expect(isVariantFile('a.w480.webp')).toBe(true)
    expect(isVariantFile('a.webp')).toBe(false)
  })
})

describe('candidate widths', () => {
  it('are ascending candidates strictly below the source width (never upscaled)', () => {
    expect([...VARIANT_WIDTHS]).toEqual([...VARIANT_WIDTHS].sort((a, b) => a - b))
    expect(candidateWidths(600)).toEqual([320, 480])
    expect(candidateWidths(640)).toEqual([320, 480])
    expect(candidateWidths(1240)).toEqual([320, 480, 640, 960])
    expect(candidateWidths(300)).toEqual([])
  })
})

describe('pickVariantWidth', () => {
  it('picks the smallest existing variant at or above the request, else the original', () => {
    const frida = manifest['/images/frida.webp']
    expect(pickVariantWidth(frida, 144)).toBe(320)
    expect(pickVariantWidth(frida, 320)).toBe(320)
    expect(pickVariantWidth(frida, 321)).toBe(480)
    expect(pickVariantWidth(frida, 560)).toBeNull()
    expect(pickVariantWidth(manifest['/images/hero/kids-dice.webp'], 640)).toBeNull()
    expect(pickVariantWidth(manifest['/images/tiny.webp'], 100)).toBeNull()
  })
})

describe('resolveImageSrc (the next/image loader)', () => {
  it('maps a listed source to its variant', () => {
    expect(resolveImageSrc('/images/frida.webp', 320, manifest)).toBe('/images/frida.w320.webp')
    expect(resolveImageSrc('/images/frida.webp', 400, manifest)).toBe('/images/frida.w480.webp')
    expect(resolveImageSrc('/images/blog/post.webp', 640, manifest)).toBe('/images/blog/post.w640.webp')
  })

  it('falls back to the original above the largest variant', () => {
    expect(resolveImageSrc('/images/frida.webp', 640, manifest)).toBe('/images/frida.webp')
    expect(resolveImageSrc('/images/frida.webp', 1240, manifest)).toBe('/images/frida.webp')
    expect(resolveImageSrc('/images/hero/kids-dice.webp', 960, manifest)).toBe('/images/hero/kids-dice.webp')
    expect(resolveImageSrc('/images/tiny.webp', 320, manifest)).toBe('/images/tiny.webp')
  })

  it('passes everything without variants through untouched', () => {
    for (const src of [
      '/images/unknown.webp',
      '/images/og-card.jpg',
      '/favicon.svg',
      'https://xyz.supabase.co/storage/v1/object/sign/project-images/u/p/preview.jpg?token=abc',
      'data:image/png;base64,AAAA',
      'blob:https://diceify.art/1234',
    ]) {
      expect(resolveImageSrc(src, 320, manifest)).toBe(src)
    }
  })
})

describe('imageSrcSet (raw <img>)', () => {
  it('lists the variants then the original at its own width', () => {
    expect(imageSrcSet('/images/blog/post.webp', manifest)).toBe(
      '/images/blog/post.w320.webp 320w, /images/blog/post.w480.webp 480w, /images/blog/post.w640.webp 640w, /images/blog/post.w960.webp 960w, /images/blog/post.webp 1024w',
    )
    expect(imageSrcSet('/images/frida.webp', manifest)).toBe('/images/frida.w320.webp 320w, /images/frida.w480.webp 480w, /images/frida.webp 600w')
    expect(imageSrcSet('/images/tiny.webp', manifest)).toBe('/images/tiny.webp 300w')
  })

  it('is undefined for sources outside the manifest', () => {
    expect(imageSrcSet('/images/unknown.webp', manifest)).toBeUndefined()
    expect(imageSrcSet('https://example.com/a.webp', manifest)).toBeUndefined()
  })
})
