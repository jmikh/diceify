import { DiceColor, DiceFace } from './types'
import { DICE_RENDERING, getDotPositions } from './constants'

interface DiceCache {
  black: Map<DiceFace, ImageBitmap>
  white: Map<DiceFace, ImageBitmap>
  blackRotated: Map<DiceFace, ImageBitmap>
  whiteRotated: Map<DiceFace, ImageBitmap>
}

export class DiceFaceCache {
  private cache: DiceCache = {
    black: new Map(),
    white: new Map(),
    blackRotated: new Map(),
    whiteRotated: new Map(),
  }
  private initialized = false

  async initialize(diceSize: number = 32) {
    if (this.initialized) return

    // Create canvases for each dice face
    const faces: DiceFace[] = [1, 2, 3, 4, 5, 6]

    for (const face of faces) {
      // Black dice - normal
      const blackCanvas = this.createDiceFace(face, 'black', diceSize, false)
      const blackBitmap = await createImageBitmap(blackCanvas)
      this.cache.black.set(face, blackBitmap)

      // Black dice - rotated
      const blackRotatedCanvas = this.createDiceFace(face, 'black', diceSize, true)
      const blackRotatedBitmap = await createImageBitmap(blackRotatedCanvas)
      this.cache.blackRotated.set(face, blackRotatedBitmap)

      // White dice - normal
      const whiteCanvas = this.createDiceFace(face, 'white', diceSize, false)
      const whiteBitmap = await createImageBitmap(whiteCanvas)
      this.cache.white.set(face, whiteBitmap)

      // White dice - rotated
      const whiteRotatedCanvas = this.createDiceFace(face, 'white', diceSize, true)
      const whiteRotatedBitmap = await createImageBitmap(whiteRotatedCanvas)
      this.cache.whiteRotated.set(face, whiteRotatedBitmap)
    }

    this.initialized = true
  }

  private createDiceFace(face: DiceFace, color: DiceColor, size: number, rotate90: boolean = false): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    // Get colors from shared constants
    const colors = DICE_RENDERING.COLORS[color]

    // Apply rotation if needed
    if (rotate90) {
      ctx.translate(size / 2, size / 2)
      ctx.rotate(Math.PI / 2)
      ctx.translate(-size / 2, -size / 2)
    }

    // Draw rounded square
    ctx.fillStyle = colors.background
    ctx.strokeStyle = DICE_RENDERING.COLORS.stroke  // Use unified stroke color like SVG
    ctx.lineWidth = size * DICE_RENDERING.BORDER_WIDTH_FACTOR  // Scale border with size like SVG

    const radius = size * DICE_RENDERING.CORNER_RADIUS_FACTOR
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.arcTo(size, 0, size, size, radius)
    ctx.arcTo(size, size, 0, size, radius)
    ctx.arcTo(0, size, 0, 0, radius)
    ctx.arcTo(0, 0, size, 0, radius)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Draw dots
    ctx.fillStyle = colors.dot
    const dotRadius = size * DICE_RENDERING.DOT_RADIUS_FACTOR
    const positions = getDotPositions(face, size)

    positions.forEach(([x, y]) => {
      ctx.beginPath()
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
      ctx.fill()
    })

    return canvas
  }


  getDiceFace(face: DiceFace, color: DiceColor, rotated: boolean = false): ImageBitmap | null {
    if (rotated) {
      const rotatedCache = color === 'black' ? this.cache.blackRotated : this.cache.whiteRotated
      return rotatedCache.get(face) || null
    }
    return this.cache[color].get(face) || null
  }

  isInitialized(): boolean {
    return this.initialized
  }
}