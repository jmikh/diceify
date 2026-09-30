import { useEffect, useRef } from 'react'
import { computeStats, generateDiceGrid, rasterSize, renderGridSvg, type Pixels } from '@/core/dice'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { cropToPixels } from '@/lib/image/crop'
import { loadImage } from '@/lib/image/decode'
import { rasterizeSvg } from '@/lib/image/rasterize'

// ---------------------------------------------------------------------------
// The dice derivation pipeline, independent of which step is on screen:
//
//   A  imageSrc + crop  ->  Pixels            (cropToPixels, cached per crop)
//   B  Pixels + dice    ->  grid + stats      (core, sync)
//   C  grid             ->  previewUrl        (renderGridSvg + rasterizeSvg)
//
// Mounted once in the editor page; the only writer of useDerivedStore.
// Because it always runs, every step can simply render for its own state
// (spinner until data arrives) instead of falling back to an earlier step's
// component. Restored drafts/projects need no special casing: stage A is
// the derivation of the cropped pixels.
// ---------------------------------------------------------------------------

const RASTER_LONG_SIDE = 1080
const REGENERATE_DEBOUNCE_MS = 300
const LOGO_SRC = '/logo-full.svg'

export function useDiceGeneration() {
    const imageSrc = useProjectStore(state => state.imageSrc)
    const crop = useDocumentStore(state => state.crop)
    const dice = useDocumentStore(state => state.dice)

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
        if (!imageSrc || !crop) return

        const derived = useDerivedStore.getState()
        // Spinner right away, before the debounce
        derived.startGeneration()

        const runId = ++runIdRef.current
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(async () => {
            try {
                // A
                const key = `${imageSrc.length}|${JSON.stringify(crop)}`
                let pixels = pixelsRef.current?.key === key ? pixelsRef.current.pixels : null
                if (!pixels) {
                    pixels = await cropToPixels(imageSrc, crop)
                    if (runId !== runIdRef.current) return
                    pixelsRef.current = { key, pixels }
                }

                // B
                const grid = generateDiceGrid(pixels, dice)
                derived.setGrid(grid, computeStats(grid))

                // C
                const size = rasterSize(grid.width, grid.height, RASTER_LONG_SIDE)
                const dataUrl = await rasterizeSvg(renderGridSvg(grid, size), size, { logo: logoRef.current ?? undefined })
                if (runId !== runIdRef.current) return
                derived.finishGeneration(dataUrl)
            } catch (error) {
                console.error('[DICE] Pipeline failed:', error)
                if (runId === runIdRef.current) {
                    derived.failGeneration(error instanceof Error ? error.message : String(error))
                }
            }
        }, REGENERATE_DEBOUNCE_MS)
    }, [imageSrc, crop, dice])
}
