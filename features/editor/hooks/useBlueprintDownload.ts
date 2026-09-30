import { useCallback } from 'react'
import { renderGridSvg } from '@/core/dice'
import { reportError } from '@/lib/report-error'
import { useGate } from '@/features/editor/hooks/useGate'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'

/**
 * Download the full dice grid as an SVG blueprint (the `hasSvgExport` entitlement).
 * Shared by the desktop panel and the mobile build controls.
 */
export function useBlueprintDownload() {
    const { ent, gate } = useGate()

    return useCallback(() => {
        if (!gate(ent.hasSvgExport, { signInMessage: 'You must be logged in to download blueprint.' })) return

        const grid = useDerivedStore.getState().grid
        if (!grid) return

        try {
            const svgString = renderGridSvg(grid)

            const blob = new Blob([svgString], { type: 'image/svg+xml' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `dice-art-${Date.now()}.svg`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            reportError(error, { where: 'blueprint-svg' })
        }
    }, [ent.hasSvgExport, gate])
}
