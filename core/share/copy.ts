// The words around a share: page title/description (meta tags), the card image's alt text and the prefilled post.
// One source for the editor (post text), the Worker (meta tags) and the card image.

export interface ShareGrid {
  cols: number
  rows: number
}

export interface ShareCopy {
  title: string
  description: string
  imageAlt: string
  /** Prefilled post text (X, the native share sheet). The link is appended by the platform. */
  postText: string
}

export function formatDiceCount(count: number): string {
  return count.toLocaleString('en-US')
}

export function gridLabel({ cols, rows }: ShareGrid): string {
  return `${cols} × ${rows}`
}

export function shareCopy(grid: ShareGrid): ShareCopy {
  const dice = formatDiceCount(grid.cols * grid.rows)
  return {
    title: `Dice art made from ${dice} dice`,
    description: `A ${gridLabel(grid)} dice mosaic made with Diceify. Turn any photo into dice art you can build by hand.`,
    imageAlt: `Dice art mosaic made from ${dice} dice (${gridLabel(grid)})`,
    postText: `Look what I made with Diceify: dice art from ${dice} dice 🎲`,
  }
}
