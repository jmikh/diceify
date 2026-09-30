import { useEffect, useRef } from 'react'
import { computeStats, generateDiceGrid, rasterSize, renderGridSvg, type Pixels } from '@/core/dice'
import { cropToPixels } from '@/lib/image/crop'
import { loadImage } from '@/lib/image/decode'
import { rasterizeSvg } from '@/lib/image/rasterize'
import { useEditorStore } from '@/lib/store/useEditorStore'

// ---------------------------------------------------------------------------
// The dice derivation pipeline, independent of which step is on screen:
//
//   A  originalImage + cropParams  ->  Pixels                 (cropToPixels, cached per crop)
//   B  Pixels + diceParams         ->  diceGrid + diceStats   (core, sync)
//   C  diceGrid                    ->  processedImageUrl      (renderGridSvg + rasterizeSvg)
//
// Mounted once in the editor page. Because it always runs, every step can
// simply render for its own state (spinner until data arrives) instead of
// falling back to an earlier step's component. Restored drafts/projects need
// no special casing: stage A is the derivation of the cropped pixels.
// ---------------------------------------------------------------------------

const RASTER_LONG_SIDE = 1080
const REGENERATE_DEBOUNCE_MS = 300
const LOGO_SRC = '/logo-full.svg'

export function useDiceGeneration() {
    const originalImage = useEditorStore(state => state.originalImage)
    const cropParams = useEditorStore(state => state.cropParams)
    const params = useEditorStore(state => state.diceParams)

    const logoRef = useRef<HTMLImageElement | null>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
    // Stage A cache: slider drags reuse the cropped pixels
    const pixelsRef = useRef<{ key: string; pixels: Pixels } | null>(null)
    // Bumped per run so stale async results are dropped
    const runIdRef = useRef(0)

    useEffect(() => {
        loadImage(LOGO_SRC).then(img => { logoRef.current = img }).catch(() => { /* unbranded raster */ })
        return () => {
            runIdRef.current++
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    useEffect(() => {
        if (!originalImage || !cropParams) return

        const runId = ++runIdRef.current
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(async () => {
            try {
                // A
                const key = `${originalImage.length}|${JSON.stringify(cropParams)}`
                let pixels = pixelsRef.current?.key === key ? pixelsRef.current.pixels : null
                if (!pixels) {
                    pixels = await cropToPixels(originalImage, cropParams)
                    if (runId !== runIdRef.current) return
                    pixelsRef.current = { key, pixels }
                }

                // B
                const grid = generateDiceGrid(pixels, params)
                const store = useEditorStore.getState()
                store.setDiceStats(computeStats(grid))
                store.setDiceGrid(grid)

                // C
                const size = rasterSize(grid.width, grid.height, RASTER_LONG_SIDE)
                const dataUrl = await rasterizeSvg(renderGridSvg(grid, size), size, { logo: logoRef.current ?? undefined })
                if (runId !== runIdRef.current) return
                store.setProcessedImageUrl(dataUrl)
            } catch (error) {
                console.error('[DICE] Pipeline failed:', error)
            }
        }, REGENERATE_DEBOUNCE_MS)
    }, [originalImage, cropParams, params])
}
