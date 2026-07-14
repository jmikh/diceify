'use client'

import { useEditorStore } from '@/lib/store/useEditorStore'

/**
 * Displays the rasterized dice art preview. Generation happens in the
 * useDiceGeneration pipeline (mounted once in the editor page), which
 * writes processedImageUrl to the store.
 */
export default function DiceCanvas() {
    const processedImageUrl = useEditorStore(state => state.processedImageUrl)

    if (!processedImageUrl) return null

    return (
        <div className="flex-1 w-full h-full min-w-0 min-h-0 relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
