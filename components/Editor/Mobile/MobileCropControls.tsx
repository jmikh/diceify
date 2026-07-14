'use client'

import { RotateCw } from 'lucide-react'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { aspectRatioOptions } from '@/components/Editor/Cropper/CropperPanel'

/**
 * Mobile crop toolbar: aspect-ratio pills plus a rotate button, so the
 * cropper itself can fill the screen.
 */
export default function MobileCropControls() {
    const selectedRatio = useEditorStore(state => state.selectedRatio)
    const cropRotation = useEditorStore(state => state.cropRotation)
    const setSelectedRatio = useEditorStore(state => state.setSelectedRatio)
    const setCropRotation = useEditorStore(state => state.setCropRotation)

    return (
        <div className="bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center gap-2">
            <div
                className="flex-1 flex items-center justify-between gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }}
            >
                {aspectRatioOptions.map(option => (
                    <button
                        key={option.value}
                        onClick={() => setSelectedRatio(option.value)}
                        className={`h-11 px-3.5 flex-1 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors ${selectedRatio === option.value
                            ? 'bg-pink-500/10 border-pink-500 text-pink-500'
                            : 'bg-white/5 border-white/10 text-gray-400 active:bg-white/10'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <button
                onClick={() => setCropRotation(cropRotation + 90)}
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-300 active:bg-white/10 transition-colors"
                aria-label="Rotate 90°"
            >
                <RotateCw size={18} />
            </button>
        </div>
    )
}
