'use client'

import { Proportions, RotateCw } from 'lucide-react'

import { AspectRatio } from '@/lib/types'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { usePersistence } from '@/app/editor/hooks/usePersistence'

export interface AspectRatioOption {
    value: AspectRatio
    label: string
    ratio: number | null
    width: number
    height: number
    icon: JSX.Element
}

export const aspectRatioOptions: AspectRatioOption[] = [
    {
        value: '1:1',
        label: '1:1',
        ratio: 1,
        width: 1,
        height: 1,
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
        ),
    },
    {
        value: '3:4',
        label: '3:4',
        ratio: 3 / 4,
        width: 3,
        height: 4,
        icon: (
            <svg className="w-4 h-5" viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="28" rx="2" />
            </svg>
        ),
    },
    {
        value: '4:3',
        label: '4:3',
        ratio: 4 / 3,
        width: 4,
        height: 3,
        icon: (
            <svg className="w-5 h-4" viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="28" height="20" rx="2" />
            </svg>
        ),
    },
    {
        value: '2:3',
        label: '2:3',
        ratio: 2 / 3,
        width: 2,
        height: 3,
        icon: (
            <svg className="w-4 h-6" viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="32" rx="2" />
            </svg>
        ),
    },
    {
        value: '16:9',
        label: '16:9',
        ratio: 16 / 9,
        width: 16,
        height: 9,
        icon: (
            <svg className="w-6 h-4" viewBox="0 0 36 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="32" height="16" rx="2" />
            </svg>
        ),
    },
]

export default function CropperPanel() {
    // Store State
    const selectedRatio = useEditorStore(state => state.selectedRatio)
    const cropRotation = useEditorStore(state => state.cropRotation)

    // Store Actions
    const setSelectedRatio = useEditorStore(state => state.setSelectedRatio)
    const setCropRotation = useEditorStore(state => state.setCropRotation)
    const setStep = useEditorStore(state => state.setStep)


    const handleRotate = () => {
        setCropRotation(cropRotation + 90)
    }

    const handleBack = () => {
        setStep('upload')
    }

    const { saveCropStep } = usePersistence()

    const handleContinue = () => {
        const cropParams = useEditorStore.getState().cropParams
        const savedCropParams = useEditorStore.getState().savedCropParams

        // Default to dirty if no saved params
        let isDirty = !savedCropParams

        if (savedCropParams && cropParams) {
            // Check for any differences
            if (
                cropParams.x !== savedCropParams.x ||
                cropParams.y !== savedCropParams.y ||
                cropParams.width !== savedCropParams.width ||
                cropParams.height !== savedCropParams.height ||
                cropParams.rotation !== savedCropParams.rotation
            ) {
                isDirty = true
            } else {
                isDirty = false
            }
        }

        if (isDirty) {
            console.log('[CROPPER] Params changed, saving to DB...')
            saveCropStep()
            // Reset build progress in store
            useEditorStore.getState().setBuildProgress({ x: 0, y: 0, percentage: 0 })
        } else {
            console.log('[CROPPER] No changes detected, skipping DB save.')
        }

        setStep('tune')
    }

    return (
        <>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Proportions className="w-4 h-4 text-pink-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Aspect Ratio</h3>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-6">
                {aspectRatioOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setSelectedRatio(option.value)}
                        className={`
              group relative flex flex-col items-center justify-center gap-3
              w-20 h-20 rounded-xl border transition-all duration-200 flex-shrink-0
              ${selectedRatio === option.value
                                ? 'bg-pink-500/10 border-pink-500'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                            }
            `}
                    >
                        <div className={`
              transition-colors duration-200
              ${selectedRatio === option.value ? 'text-pink-500' : 'text-gray-400 group-hover:text-gray-300'}
            `}>
                            {option.icon}
                        </div>
                        <span className={`
              text-xs font-semibold
              ${selectedRatio === option.value ? 'text-pink-500' : 'text-gray-500 group-hover:text-gray-400'}
            `}>
                            {option.label}
                        </span>

                        {/* Selected glow effect */}
                        {selectedRatio === option.value && (
                            <div className="absolute inset-0 bg-pink-500/5 rounded-xl animate-pulse pointer-events-none" />
                        )}
                    </button>
                ))}
            </div>

            {/* Additional Controls */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleRotate}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-colors text-sm font-medium text-gray-300"
                >
                    <RotateCw className="w-4 h-4" />
                    Rotate 90°
                </button>
                <p className="text-white/60 text-sm leading-relaxed text-center px-1">
                    Pan and zoom into the desired area. Zoomed in portraits work better than fullbody shots.
                </p>
            </div>

            {/* Spacer to push buttons to bottom */}
            <div className="flex-grow" />

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                <button
                    onClick={handleBack}
                    className="flex-1 py-3.5 rounded-full border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                >
                    ← Back
                </button>

                <button
                    onClick={handleContinue}
                    className="
            flex-1 py-3.5 rounded-full
            bg-pink-500 hover:bg-pink-600
            text-white font-semibold
            shadow-[0_0_20px_rgba(236,72,153,0.3)]
            hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 text-sm
          "
                >
                    Continue →
                </button>
            </div>
        </>
    )
}

