import { useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { DiceSVGRenderer } from '@/lib/dice/svg-renderer'

/**
 * Download the full dice grid as an SVG blueprint (PRO feature).
 * Gated behind auth + subscription; shared by the desktop panel and
 * the mobile build controls.
 */
export function useBlueprintDownload() {
    const { data: session } = useSession()

    return useCallback(() => {
        if (!session?.user) {
            useEditorStore.getState().setAuthModalMessage("You must be logged in to download blueprint.")
            useEditorStore.getState().setShowAuthModal(true)
            return
        }

        if (!session.user.isPro) {
            useEditorStore.getState().setShowProFeatureModal(true)
            return
        }

        const grid = useEditorStore.getState().diceGrid
        if (!grid) return

        try {
            const renderer = new DiceSVGRenderer()
            const svgString = renderer.render(grid)

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
            console.error('Error generating SVG:', error)
        }
    }, [session])
}
