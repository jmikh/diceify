import { useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { renderGridSvg } from '@/core/dice'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'

/**
 * Download the full dice grid as an SVG blueprint (PRO feature).
 * Gated behind auth + subscription; shared by the desktop panel and
 * the mobile build controls.
 */
export function useBlueprintDownload() {
    const { data: session } = useSession()

    return useCallback(() => {
        if (!session?.user) {
            useEditorUiStore.getState().openModal('signIn', { message: "You must be logged in to download blueprint." })
            return
        }

        if (!session.user.isPro) {
            useEditorUiStore.getState().openModal('proFeature')
            return
        }

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
            console.error('Error generating SVG:', error)
        }
    }, [session])
}
