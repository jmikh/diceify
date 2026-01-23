// Shared constants for dice rendering (both Canvas and SVG)

export const DICE_RENDERING = {
  // Dot sizing
  DOT_RADIUS_FACTOR: 0.12,  // 12% of dice size

  // Dice padding and layout
  PADDING_FACTOR: 0.25,  // Controls dot spacing (0 = furthest apart)

  // Dice appearance
  CORNER_RADIUS_FACTOR: 0.10,  // 10% corner radius for rounded dice
  BORDER_WIDTH_FACTOR: 0.05,   // 5% border width

  // Colors
  COLORS: {
    black: {
      background: '#1a1a1a',
      dot: '#ffffff',
      border: '#333'
    },
    white: {
      background: '#fafafa',
      dot: '#1a1a1a',
      border: '#ddd'
    },
    stroke: '#6b6b6b'  // SVG stroke color
  }
} as const

// Calculate dot positions based on dice size
export function getDotPositions(face: number, size: number): [number, number][] {
  const lower = size * (1 + DICE_RENDERING.PADDING_FACTOR) / 6
  const middle = size * 3 / 6
  const upper = size * (5 - DICE_RENDERING.PADDING_FACTOR) / 6

  const positions: [number, number][] = []

  if (face >= 2) { // top left
    positions.push([lower, lower])
  }
  if (face === 6) { // top center
    positions.push([middle, lower])
  }
  if (face >= 4) { // top right
    positions.push([upper, lower])
  }
  if (face % 2 === 1) { // center
    positions.push([middle, middle])
  }
  if (face >= 4) { // bottom left
    positions.push([lower, upper])
  }
  if (face === 6) { // bottom center
    positions.push([middle, upper])
  }
  if (face >= 2) { // bottom right
    positions.push([upper, upper])
  }

  return positions
}