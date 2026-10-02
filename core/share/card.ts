// Layout of the social card (the image X/Facebook show for a share): 1200×630, the 1.91:1 both platforms display.
// The art bleeds off the left edge at full card height and its own aspect ratio (art too wide for that is scaled to
// the widest it may be and centred vertically); a fixed-width text column is centred in the space to its right.
// `lib/image/shareCard.ts` draws it; this only decides where things go.

export const SHARE_CARD = { width: 1200, height: 630 } as const

/** Minimum space on either side of the text column, and above/below its lines. */
const PAD = 56
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
  const maxArtWidth = width - 2 * PAD - TEXT_WIDTH
  const scale = Math.min(maxArtWidth / cols, height / rows)
  const artWidth = Math.round(cols * scale)
  const artHeight = Math.round(rows * scale)
  return {
    width,
    height,
    art: { x: 0, y: Math.round((height - artHeight) / 2), width: artWidth, height: artHeight },
    text: {
      x: artWidth + Math.round((width - artWidth - TEXT_WIDTH) / 2),
      y: PAD,
      width: TEXT_WIDTH,
      height: height - 2 * PAD,
    },
  }
}
