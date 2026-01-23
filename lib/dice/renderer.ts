import { DiceGrid } from './types'
import { DiceFaceCache } from './cache'

export class DiceRenderer {
  private cache: DiceFaceCache
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private offscreenCanvas: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.cache = new DiceFaceCache()

    // Create offscreen canvas for better performance
    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!
  }

  async initialize(diceSize: number = 100) {
    await this.cache.initialize(diceSize)
  }

  render(grid: DiceGrid, scale: number = 1, maxWidth: number = 1080, maxHeight: number = 1080) {
    const diceCountX = grid.width
    const diceCountY = grid.height

    // Calculate what dice size we need to fit within max dimensions
    // Start with a reasonable base size, then scale down if needed
    const baseDiceSize = 48 * scale
    const requiredWidth = diceCountX * baseDiceSize
    const requiredHeight = diceCountY * baseDiceSize

    const scaleFactor = Math.min(
      1,
      maxWidth / requiredWidth,
      maxHeight / requiredHeight
    )

    // Final dice size - must be integer for clean pixel alignment
    const diceSize = Math.max(1, Math.floor(baseDiceSize * scaleFactor))

    // Set canvas to exact final size
    this.canvas.width = diceCountX * diceSize
    this.canvas.height = diceCountY * diceSize

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Enable high-quality smoothing for scaling cached sprites to target size
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'

    // Draw each dice directly at target size (cache sprites are 100px)
    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        const dice = grid.dice[x][y]
        // Canvas Y needs to be flipped (canvas 0 is top, our 0 is bottom)
        const canvasX = x * diceSize
        const canvasY = (grid.height - 1 - y) * diceSize

        const diceFace = this.cache.getDiceFace(dice.face, dice.color, dice.rotate90 || false)
        if (diceFace) {
          // Draw cached sprite scaled to target dice size
          this.ctx.drawImage(diceFace, canvasX, canvasY, diceSize, diceSize)
        }
      }
    }
  }

  renderProgressive(grid: DiceGrid, diceSize: number = 1, onProgress?: (progress: number) => void) {

    // Set canvas size
    this.canvas.width = grid.width * diceSize
    this.canvas.height = grid.height * diceSize

    // Use offscreen canvas for smoother rendering
    this.offscreenCanvas.width = this.canvas.width
    this.offscreenCanvas.height = this.canvas.height

    // Clear offscreen canvas
    this.offscreenCtx.fillStyle = '#f5f5f5'
    this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height)

    const totalDice = grid.width * grid.height
    let renderedCount = 0

    const renderChunk = () => {
      const chunkSize = Math.min(100, totalDice - renderedCount)
      let count = 0

      // Find starting position (iterate in x,y order)
      const startIndex = renderedCount
      const startX = Math.floor(startIndex / grid.height)
      const startY = startIndex % grid.height

      for (let x = startX; x < grid.width && count < chunkSize; x++) {
        const yStart = x === startX ? startY : 0

        for (let y = yStart; y < grid.height && count < chunkSize; y++) {
          const dice = grid.dice[x][y]
          // Canvas Y coordinate needs to be flipped
          const canvasX = x * diceSize
          const canvasY = (grid.height - 1 - y) * diceSize

          // Get cached dice face
          const diceFace = this.cache.getDiceFace(dice.face, dice.color, dice.rotate90 || false)
          if (diceFace) {
            this.offscreenCtx.drawImage(diceFace, canvasX, canvasY, diceSize, diceSize)
          }

          count++
          renderedCount++
        }
      }

      // Copy to main canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.drawImage(this.offscreenCanvas, 0, 0)

      // Report progress
      if (onProgress) {
        onProgress(renderedCount / totalDice)
      }

      // Continue if more dice remain
      if (renderedCount < totalDice) {
        requestAnimationFrame(renderChunk)
      }
    }

    // Start rendering
    renderChunk()
  }

  private getVisibleBounds(): DOMRect | null {
    // Get canvas bounds relative to viewport
    const rect = this.canvas.getBoundingClientRect()

    // If canvas is not visible, return null
    if (rect.width === 0 || rect.height === 0) {
      return null
    }

    return rect
  }

  private isInBounds(x: number, y: number, size: number, bounds: DOMRect): boolean {
    return x + size >= 0 &&
      x <= bounds.width &&
      y + size >= 0 &&
      y <= bounds.height
  }

  exportAsImage(quality: number = 0.95): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to export image'))
          }
        },
        'image/jpeg',
        quality
      )
    })
  }
}