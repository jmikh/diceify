// Layout of the social card (the image X/Facebook show for a share): 1200×630, the 1.91:1 both platforms display.
// The art sits on the left at its own aspect ratio, a fixed-width text column on its right, the pair centred.
// `lib/image/shareCard.ts` draws it; this only decides where things go.

export const SHARE_CARD = { width: 1200, height: 630 } as const

const PAD = 56
const GAP = 64
const TEXT_WIDTH = 360

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface ShareCardLayout {
  width: number
  height: number
  art: Box
  /** The text column (lines are centred vertically inside it by the renderer). */
  text: Box
}

export function shareCardLayout(cols: number, rows: number): ShareCardLayout {
  const { width, height } = SHARE_CARD
  const maxArtWidth = width - 2 * PAD - GAP - TEXT_WIDTH
  const maxArtHeight = height - 2 * PAD
  const scale = Math.min(maxArtWidth / cols, maxArtHeight / rows)
  const artWidth = Math.round(cols * scale)
  const artHeight = Math.round(rows * scale)
  const left = Math.round((width - (artWidth + GAP + TEXT_WIDTH)) / 2)
  return {
    width,
    height,
    art: { x: left, y: Math.round((height - artHeight) / 2), width: artWidth, height: artHeight },
    text: { x: left + artWidth + GAP, y: PAD, width: TEXT_WIDTH, height: maxArtHeight },
  }
}
