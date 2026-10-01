import { useEffect, useRef } from 'react'
import { computeStats, generateDiceGrid, rasterSize, renderGridSvg, type Pixels } from '@/core/dice'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { cropToPixels } from '@/lib/image/crop'
import { makeThumbnail, type Thumbnail } from '@/lib/image/decode'
import { rasterizeSvg } from '@/lib/image/rasterize'
import { reportError } from '@/lib/report-error'

// ---------------------------------------------------------------------------
// The dice derivation pipeline, independent of which step is on screen:
//
//   A  imageSrc + crop  ->  Pixels + thumbnail (cropToPixels + makeThumbnail, cached per crop)
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

export function useDicePipeline() {
    const imageSrc = useProjectStore(state => state.imageSrc)
    const crop = useDocumentStore(state => state.crop)
    const dice = useDocumentStore(state => state.dice)

    const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
    // Stage A cache: slider drags reuse the cropped pixels and thumbnail
    const croppedRef = useRef<{ key: string; pixels: Pixels; thumbnail: Thumbnail } | null>(null)
    // Bumped per run so stale async results are dropped
    const runIdRef = useRef(0)

    useEffect(() => {
        return () => {
            // A run counter, not a DOM ref: bumping it on unmount is the point (stale async results are dropped).
            // eslint-disable-next-line react-hooks/exhaustive-deps
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
                // A (object URLs are short and unique per image)
                const key = `${imageSrc}|${JSON.stringify(crop)}`
                let cropped = croppedRef.current?.key === key ? croppedRef.current : null
                if (!cropped) {
                    const [pixels, thumbnail] = await Promise.all([cropToPixels(imageSrc, crop), makeThumbnail(imageSrc, crop)])
                    if (runId !== runIdRef.current) return
                    cropped = { key, pixels, thumbnail }
                    croppedRef.current = cropped
                }
                derived.setThumbnail(cropped.thumbnail)

                // B
                const grid = generateDiceGrid(cropped.pixels, dice)
                derived.setGrid(grid, computeStats(grid))

                // C
                const size = rasterSize(grid.width, grid.height, RASTER_LONG_SIDE)
                const dataUrl = await rasterizeSvg(renderGridSvg(grid, size), size)
                if (runId !== runIdRef.current) return
                derived.finishGeneration(dataUrl)
            } catch (error) {
                // A superseded run's failure is dropped like its result would be: one report per failure
                if (runId !== runIdRef.current) return
                reportError(error, { where: 'dice-pipeline', extra: { dice } })
                derived.failGeneration(error instanceof Error ? error.message : String(error))
            }
        }, REGENERATE_DEBOUNCE_MS)
    }, [imageSrc, crop, dice])
}
