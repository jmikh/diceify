'use client'

import { useDerivedStore } from '@/features/editor/store/useDerivedStore'

/**
 * Displays the rasterized dice art preview. Generation happens in the
 * useDicePipeline pipeline (mounted once in the editor page), which
 * writes previewUrl to the derived store.
 */
export default function DiceCanvas() {
    const processedImageUrl = useDerivedStore(state => state.previewUrl)

    if (!processedImageUrl) return null

    return (
        <div className="flex-1 w-full h-full min-w-0 min-h-0 relative overflow-hidden">
            <img
                src={processedImageUrl}
                alt="Dice art preview"
                className="absolute inset-0 w-full h-full object-contain"
                style={{
                    imageRendering: 'pixelated'
                }}
            />
        </div>
    )
}
