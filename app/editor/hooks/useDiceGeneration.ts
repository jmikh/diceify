import { useEffect, useRef } from 'react'
import { DiceGenerator } from '@/lib/dice/generator'
import { DiceSVGRenderer } from '@/lib/dice/svg-renderer'
import { DiceGrid } from '@/lib/dice/types'
import { cropImage } from '@/lib/utils/image'
import { devError } from '@/lib/utils/debug'
import { useEditorStore } from '@/lib/store/useEditorStore'

// ---------------------------------------------------------------------------
// The dice derivation pipeline, independent of which step is on screen:
//
//   originalImage + cropParams  ->  croppedImage          (self-heal on restore)
//   croppedImage  + diceParams  ->  diceGrid + diceStats  ->  processedImageUrl
//
// Mounted once in the editor page. Because it always runs, every step can
// simply render for its own state (spinner until data arrives) instead of
// falling back to an earlier step's component.
// ---------------------------------------------------------------------------

const MAX_RASTER_SIZE = 1080 // Max pixels on longest side
const REGENERATE_DEBOUNCE_MS = 300

// Rasterize the dice grid SVG to a branded PNG data URL
function rasterizeSvg(renderer: DiceSVGRenderer, grid: DiceGrid, logo: HTMLImageElement | null): Promise<string> {
    return new Promise((resolve, reject) => {
        const cols = grid.width
        const rows = grid.height

        // Raster dimensions maintaining aspect ratio, MAX_RASTER_SIZE on the longer side
        let rasterWidth: number
        let rasterHeight: number
        if (cols >= rows) {
            rasterWidth = MAX_RASTER_SIZE
            rasterHeight = Math.round(MAX_RASTER_SIZE * (rows / cols))
        } else {
            rasterHeight = MAX_RASTER_SIZE
            rasterWidth = Math.round(MAX_RASTER_SIZE * (cols / rows))
        }

        // Give the SVG explicit dimensions for rasterization
        // Use [\s\S]*? to match across newlines (since [^>]* doesn't match newlines)
        const fullSvg = renderer.render(grid).replace(
            /<svg[\s\S]*?>/,
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" width="${rasterWidth}" height="${rasterHeight}">`
        )

        const img = new Image()
        const blob = new Blob([fullSvg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)

        img.onload = () => {
            // Use requestIdleCallback or setTimeout to keep UI responsive
            const doRasterize = () => {
                const canvas = document.createElement('canvas')
                canvas.width = rasterWidth
                canvas.height = rasterHeight
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    URL.revokeObjectURL(url)
                    reject(new Error('Failed to get canvas context'))
                    return
                }

                ctx.drawImage(img, 0, 0, rasterWidth, rasterHeight)

                // Draw Diceify branding in top-right corner
                if (logo) {
                    const brandingHeight = Math.round(rasterHeight * 0.088)
                    const logoAspect = logo.naturalWidth / logo.naturalHeight
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
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
                    ctx.beginPath()
                    ctx.roundRect(pillX, pillY, pillW, pillH, Math.round(pillH / 2))
                    ctx.fill()

                    ctx.drawImage(logo, x, y, brandingWidth, brandingHeight)
                }

                const dataUrl = canvas.toDataURL('image/png')
                URL.revokeObjectURL(url)
                resolve(dataUrl)
            }

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
}

export function useDiceGeneration() {
    const originalImage = useEditorStore(state => state.originalImage)
    const cropParams = useEditorStore(state => state.cropParams)
    const croppedImage = useEditorStore(state => state.croppedImage)
    const params = useEditorStore(state => state.diceParams)

    const generatorRef = useRef<DiceGenerator>()
    const rendererRef = useRef<DiceSVGRenderer>()
    const logoRef = useRef<HTMLImageElement | null>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
    // Bumped per run so stale async results are dropped
    const runIdRef = useRef(0)

    // Initialize once on mount
    useEffect(() => {
        generatorRef.current = new DiceGenerator()
        rendererRef.current = new DiceSVGRenderer()

        // Preload the Diceify logo for branding on the rasterized image
        const logoImg = new Image()
        logoImg.onload = () => { logoRef.current = logoImg }
        logoImg.src = '/logo-full.svg'

        return () => {
            runIdRef.current++
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    // Self-heal the cropped image: it's derived state that restores (draft or
    // project) don't carry - regenerate it whenever it's missing
    useEffect(() => {
        if (!croppedImage && originalImage && cropParams) {
            cropImage(originalImage, cropParams)
                .then(useEditorStore.getState().setCroppedImage)
                .catch(err => devError('[DICE] Failed to regenerate crop:', err))
        }
    }, [croppedImage, originalImage, cropParams])

    // Regenerate grid, stats and preview whenever the inputs change
    useEffect(() => {
        if (!croppedImage) return

        const runId = ++runIdRef.current
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(async () => {
            const generator = generatorRef.current
            const renderer = rendererRef.current
            if (!generator || !renderer) return

            try {
                const grid = await generator.generateDiceGrid(
                    croppedImage,
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
                if (runId !== runIdRef.current) return

                const store = useEditorStore.getState()
                store.setDiceStats(generator.calculateStats(grid))
                store.setDiceGrid(grid)

                const dataUrl = await rasterizeSvg(renderer, grid, logoRef.current)
                if (runId !== runIdRef.current) return
                store.setProcessedImageUrl(dataUrl)
            } catch (error) {
                devError('Error generating dice art:', error)
            }
        }, REGENERATE_DEBOUNCE_MS)
    }, [croppedImage, params])
}
