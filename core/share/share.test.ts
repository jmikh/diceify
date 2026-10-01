import { describe, expect, it } from 'vitest'
import {
  SHARE_CARD,
  SHARE_ID_ALPHABET,
  SHARE_ID_LENGTH,
  escapeHtml,
  isShareId,
  parseShareRows,
  postIntentUrl,
  shareCardLayout,
  shareCopy,
  shareIdFromBytes,
  shareImageUrl,
  shareMetaTags,
  shareUrl,
} from '.'

describe('share ids', () => {
  it('maps each byte to one of 32 symbols (low 5 bits), so every byte value is usable', () => {
    expect(SHARE_ID_ALPHABET).toHaveLength(32)
    expect(new Set(SHARE_ID_ALPHABET).size).toBe(32)
    expect(shareIdFromBytes(new Uint8Array([0, 1, 31, 32, 255, 63, 2, 3, 4, 5]))).toBe('ab9a99cdef')
  })

  it('round-trips through isShareId and rejects anything else', () => {
    const id = shareIdFromBytes(Uint8Array.from({ length: SHARE_ID_LENGTH }, (_, i) => i * 37))
    expect(isShareId(id)).toBe(true)
    expect(isShareId(id.slice(1))).toBe(false)
    expect(isShareId(`${id}a`)).toBe(false)
    expect(isShareId('abcdefghil')).toBe(false) // `l` is not in the alphabet
    expect(isShareId('ABCDEFGHIJ')).toBe(false)
    expect(isShareId('abc/../efg')).toBe(false)
  })

  it('needs enough bytes', () => {
    expect(() => shareIdFromBytes(new Uint8Array(3))).toThrow()
  })
})

describe('share urls', () => {
  it('tags the page URL with the source', () => {
    expect(shareUrl('https://diceify.art', 'abcdefghij', 'x')).toBe(
      'https://diceify.art/s/abcdefghij?utm_source=x&utm_medium=social&utm_campaign=share',
    )
  })

  it('builds the public image URL (tolerating a trailing slash)', () => {
    expect(shareImageUrl('https://ref.supabase.co/', 'abcdefghij')).toBe(
      'https://ref.supabase.co/storage/v1/object/public/share-images/abcdefghij.jpg',
    )
  })

  it('opens the X composer with text + url and the Facebook sharer with the url only', () => {
    const url = 'https://diceify.art/s/abcdefghij?utm_source=x'
    const x = new URL(postIntentUrl('x', url, 'Look 🎲 & see'))
    expect(x.origin + x.pathname).toBe('https://x.com/intent/tweet')
    expect(x.searchParams.get('text')).toBe('Look 🎲 & see')
    expect(x.searchParams.get('url')).toBe(url)

    const fb = new URL(postIntentUrl('facebook', url, 'ignored'))
    expect(fb.origin + fb.pathname).toBe('https://www.facebook.com/sharer/sharer.php')
    expect([...fb.searchParams.keys()]).toEqual(['u'])
    expect(fb.searchParams.get('u')).toBe(url)
  })
})

describe('shareCopy', () => {
  it('counts the dice and names the grid', () => {
    expect(shareCopy({ cols: 48, rows: 48 })).toEqual({
      title: 'Dice art made from 2,304 dice',
      description: 'A 48 × 48 dice mosaic made with Diceify. Turn any photo into dice art you can build by hand.',
      imageAlt: 'Dice art mosaic made from 2,304 dice (48 × 48)',
      postText: 'Look what I made with Diceify: dice art from 2,304 dice 🎲',
    })
  })
})

describe('shareCardLayout', () => {
  const inside = (box: { x: number; y: number; width: number; height: number }) =>
    box.x >= 0 && box.y >= 0 && box.x + box.width <= SHARE_CARD.width && box.y + box.height <= SHARE_CARD.height

  it.each([
    [48, 48],
    [36, 48], // portrait
    [80, 45], // wide
    [120, 20], // extreme wide
    [20, 120], // extreme tall
  ])('%i × %i: art keeps its aspect ratio, nothing leaves the card, art and text do not overlap', (cols, rows) => {
    const { art, text } = shareCardLayout(cols, rows)
    expect(Math.abs(art.width / art.height - cols / rows)).toBeLessThan(0.05 * (cols / rows))
    expect(inside(art)).toBe(true)
    expect(inside(text)).toBe(true)
    expect(art.x + art.width).toBeLessThanOrEqual(text.x)
    // The pair is centred horizontally (within rounding)
    expect(Math.abs(art.x - (SHARE_CARD.width - (text.x + text.width)))).toBeLessThanOrEqual(1)
    // The art is centred vertically
    expect(Math.abs(art.y - (SHARE_CARD.height - (art.y + art.height)))).toBeLessThanOrEqual(1)
  })
})

describe('parseShareRows', () => {
  const row = { id: 'abcdefghij', grid_cols: 48, grid_rows: 36, created_at: '2026-10-01T10:00:00Z' }

  it('reads the first row', () => {
    expect(parseShareRows([row])).toEqual({ id: 'abcdefghij', cols: 48, rows: 36, createdAt: '2026-10-01T10:00:00Z' })
  })

  it('is null for no row or a malformed one', () => {
    expect(parseShareRows([])).toBeNull()
    expect(parseShareRows(null)).toBeNull()
    expect(parseShareRows({ message: 'error' })).toBeNull()
    expect(parseShareRows([{ ...row, id: 'nope' }])).toBeNull()
    expect(parseShareRows([{ ...row, grid_cols: 0 }])).toBeNull()
    expect(parseShareRows([{ ...row, grid_rows: '36' }])).toBeNull()
  })
})

describe('shareMetaTags', () => {
  it('escapes every value and emits the card tags', () => {
    const html = shareMetaTags({
      title: 'A "quoted" <title>',
      description: 'd & e',
      imageAlt: "it's",
      imageUrl: 'https://img/x.jpg',
      pageUrl: 'https://diceify.art/s/abcdefghij?utm_source=facebook&utm_medium=social',
      canonicalUrl: 'https://diceify.art/s/abcdefghij',
    })
    expect(html).toContain('<meta property="og:title" content="A &quot;quoted&quot; &lt;title&gt;">')
    expect(html).toContain('<meta name="description" content="d &amp; e">')
    expect(html).toContain('<meta property="og:image:alt" content="it&#39;s">')
    expect(html).toContain('<meta property="og:url" content="https://diceify.art/s/abcdefghij?utm_source=facebook&amp;utm_medium=social">')
    expect(html).toContain('<link rel="canonical" href="https://diceify.art/s/abcdefghij">')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(html).toContain('<meta property="og:image:width" content="1200">')
    expect(html).not.toMatch(/<(?!meta |link |\/)/) // nothing but meta/link tags
  })

  it('escapeHtml leaves plain text alone', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123')
  })
})
