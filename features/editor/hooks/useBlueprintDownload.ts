import { useCallback } from 'react'
import { renderGridSvg } from '@/core/dice'
import { track } from '@/lib/analytics'
import { reportError } from '@/lib/report-error'
import { useGate } from '@/features/editor/hooks/useGate'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'

/**
 * Download the full dice grid as an SVG blueprint: a Pro feature (the `hasSvgExport` entitlement); `pro` = the plan
 * lacks it, so the button carries a PRO tag and opens the upgrade modal. Shared by the desktop panels and the mobile
 * build controls.
 */
export function useBlueprintDownload() {
    const { ent, gate } = useGate()
    const allowed = ent.hasSvgExport

    const download = useCallback(() => {
        if (!gate(allowed, 'blueprint')) return

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
            track('blueprint_downloaded', { total_dice: grid.width * grid.height })
        } catch (error) {
            reportError(error, { where: 'blueprint-svg' })
        }
    }, [allowed, gate])

    return { download, pro: !allowed }
}
