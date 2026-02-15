/**
 * DiceCanvas Component
 * 
 * SVG-based rendering engine for the dice art generation step.
 * Uses vector graphics for clean scaling, then rasterizes in the background.
 * 
 * Rendering Pipeline:
 * 1. Image → DiceGenerator → DiceGrid (data)
 * 2. DiceGrid → DiceSVGRenderer → SVG string
 * 3. SVG → Background rasterization → PNG data URL
 * 4. Display with loading overlay during processing
 */

'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { DiceGenerator } from '@/lib/dice/generator'
import { DiceSVGRenderer } from '@/lib/dice/svg-renderer'

import { DiceGrid } from '@/lib/dice/types'
import { devError } from '@/lib/utils/debug'
import { useEditorStore } from '@/lib/store/useEditorStore'

interface DiceCanvasProps {
  maxWidth?: number
  maxHeight?: number
}

export interface DiceCanvasRef {
  download: () => void;
}

const MAX_RASTER_SIZE = 1080 // Max pixels on longest side

const DiceCanvas = forwardRef<DiceCanvasRef, DiceCanvasProps>(({ maxWidth = 1080, maxHeight = 1080 }, ref) => {
  const imageUrl = useEditorStore(state => state.croppedImage)
  const params = useEditorStore(state => state.diceParams)
  const cropArea = useEditorStore(state => state.cropParams)

  const setDiceStats = useEditorStore(state => state.setDiceStats)
  const setDiceGrid = useEditorStore(state => state.setDiceGrid)
  const setProcessedImageUrl = useEditorStore(state => state.setProcessedImageUrl)

  const containerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [rasterizedImage, setRasterizedImage] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  const generatorRef = useRef<DiceGenerator>()
  const svgRendererRef = useRef<DiceSVGRenderer>()
  const currentGridRef = useRef<DiceGrid | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isInitializedRef = useRef(false)
  const logoImageRef = useRef<HTMLImageElement | null>(null)
  const rasterAbortRef = useRef<boolean>(false)

  // Initialize once on mount
  useEffect(() => {
    if (isInitializedRef.current) return

    generatorRef.current = new DiceGenerator()
    svgRendererRef.current = new DiceSVGRenderer()
    isInitializedRef.current = true

    // Preload the Diceify logo for branding on the rasterized image
    const logoImg = new Image()
    logoImg.onload = () => { logoImageRef.current = logoImg }
    logoImg.src = '/logo-full.svg'

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      rasterAbortRef.current = true
    }
  }, [])

  // Rasterize SVG to PNG in background
  const rasterizeSvg = useCallback((grid: DiceGrid): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!svgRendererRef.current) {
        reject(new Error('SVG renderer not initialized'))
        return
      }

      const cols = grid.width
      const rows = grid.height

      // Calculate raster dimensions maintaining aspect ratio
      // Always use MAX_RASTER_SIZE for the longer side
      let rasterWidth: number
      let rasterHeight: number

      if (cols >= rows) {
        rasterWidth = MAX_RASTER_SIZE
        rasterHeight = Math.round(MAX_RASTER_SIZE * (rows / cols))
      } else {
        rasterHeight = MAX_RASTER_SIZE
        rasterWidth = Math.round(MAX_RASTER_SIZE * (cols / rows))
      }

      // Generate SVG using the renderer
      const svgString = svgRendererRef.current.render(grid)

      // Modify the SVG to have proper dimensions for rasterization
      // Replace the opening svg tag with one that has explicit width/height
      // Use [\s\S]*? to match across newlines (since [^>]* doesn't match newlines)
      const fullSvg = svgString.replace(
        /<svg[\s\S]*?>/,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" width="${rasterWidth}" height="${rasterHeight}">`
      )

      // Convert SVG to image in background
      const img = new Image()
      const blob = new Blob([fullSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        if (rasterAbortRef.current) {
          URL.revokeObjectURL(url)
          reject(new Error('Aborted'))
          return
        }

        // Use requestIdleCallback or setTimeout to keep UI responsive
        const doRasterize = () => {
          const canvas = document.createElement('canvas')
          canvas.width = rasterWidth
          canvas.height = rasterHeight
          const ctx = canvas.getContext('2d')

          if (ctx) {
            ctx.drawImage(img, 0, 0, rasterWidth, rasterHeight)

            // Draw Diceify branding in top-right corner
            if (logoImageRef.current) {
              const brandingHeight = Math.round(rasterHeight * 0.088)
              const logoAspect = logoImageRef.current.naturalWidth / logoImageRef.current.naturalHeight
              const brandingWidth = Math.round(brandingHeight * logoAspect)
              const pad = Math.round(rasterHeight * 0.025)
              const pillPadX = Math.round(pad * 0.8)
              const pillPadY = Math.round(pad * 0.5)
              const x = rasterWidth - brandingWidth - pad - pillPadX
              const y = pad

              // Semi-transparent dark pill backdrop
              const pillX = x - pillPadX
              const pillY = y - pillPadY
              const pillW = brandingWidth + pillPadX * 2
              const pillH = brandingHeight + pillPadY * 2
              const pillR = Math.round(pillH / 2)
              ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
              ctx.beginPath()
              ctx.roundRect(pillX, pillY, pillW, pillH, pillR)
              ctx.fill()

              // Draw the logo
              ctx.drawImage(logoImageRef.current, x, y, brandingWidth, brandingHeight)
            }

            const dataUrl = canvas.toDataURL('image/png')
            URL.revokeObjectURL(url)
            resolve(dataUrl)
          } else {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to get canvas context'))
          }
        }

        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(doRasterize, { timeout: 100 })
        } else {
          setTimeout(doRasterize, 0)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load SVG'))
      }

      img.src = url
    })
  }, [])

  const generateDiceArt = useCallback(async () => {
    if (!generatorRef.current || !imageUrl) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    rasterAbortRef.current = false
    setIsGenerating(true)

    try {
      // Generate the dice grid
      const grid = await generatorRef.current.generateDiceGrid(
        imageUrl,
        params.numRows,
        params.colorMode,
        params.contrast,
        params.gamma,
        params.edgeSharpening,
        params.rotate6,
        params.rotate3,
        params.rotate2,
        null
      )

      currentGridRef.current = grid

      const stats = generatorRef.current.calculateStats(grid)
      setDiceStats(stats)
      setDiceGrid(grid)

      // Rasterize SVG in background
      const dataUrl = await rasterizeSvg(grid)

      if (!rasterAbortRef.current) {
        setRasterizedImage(dataUrl)
        setProcessedImageUrl(dataUrl)

        // Calculate display dimensions
        const cols = grid.width
        const rows = grid.height
        let displayWidth: number
        let displayHeight: number

        if (cols >= rows) {
          displayWidth = MAX_RASTER_SIZE
          displayHeight = Math.round(MAX_RASTER_SIZE * (rows / cols))
        } else {
          displayHeight = MAX_RASTER_SIZE
          displayWidth = Math.round(MAX_RASTER_SIZE * (cols / rows))
        }

        setImageDimensions({ width: displayWidth, height: displayHeight })
      }
    } catch (error) {
      if ((error as Error).message !== 'Aborted') {
        devError('Error generating dice art:', error)
      }
    } finally {
      setIsGenerating(false)
    }
  }, [imageUrl, params.numRows, params.colorMode, params.contrast, params.gamma, params.edgeSharpening, params.rotate6, params.rotate3, params.rotate2, setDiceStats, setDiceGrid, setProcessedImageUrl, rasterizeSvg])

  // Generate on image change
  useEffect(() => {
    if (isInitializedRef.current && imageUrl) {
      generateDiceArt()
    }
  }, [imageUrl])

  // Debounced regeneration on param changes
  useEffect(() => {
    if (!isInitializedRef.current) return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    rasterAbortRef.current = true // Abort any in-progress rasterization

    timeoutRef.current = setTimeout(() => {
      generateDiceArt()
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [params.numRows, params.colorMode, params.contrast, params.gamma, params.edgeSharpening, params.rotate6, params.rotate3, params.rotate2])

  const handleDownload = async () => {
    if (!rasterizedImage) return

    try {
      // Convert data URL to blob for download
      const response = await fetch(rasterizedImage)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dice-art-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      devError('Error downloading image:', error)
    }
  }

  useImperativeHandle(ref, () => ({
    download: handleDownload
  }));

  if (!imageUrl) return null

  return (
    <div className="flex-1 w-full h-full min-w-0 min-h-0 relative overflow-hidden" ref={containerRef}>
      {/* Rasterized image */}
      {rasterizedImage && (
        <img
          src={rasterizedImage}
          alt="Dice art preview"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            imageRendering: 'pixelated'
          }}
        />
      )}
    </div>
  )
})

DiceCanvas.displayName = 'DiceCanvas'

export default DiceCanvas