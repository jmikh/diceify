'use client'

import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'

export default function UploaderPanel() {
    const { canGoNext, goNext } = useStepNavigation()

    return (
        <>
            {/* Info / Instructions */}
            <div>
                <h3 className="text-xl font-bold text-white mb-2">Upload Image</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                    Choose a photo to turn into dice art. High contrast images with clear subjects work best.
                </p>
            </div>

            {/* Spacer */}
            <div className="flex-grow" />

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-white/10 flex-shrink-0">
                <button
                    onClick={goNext}
                    disabled={!canGoNext}
                    className={`
            flex-1 py-3.5 rounded-full font-semibold transition-all flex items-center justify-center gap-2 text-sm
            ${canGoNext
                            ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]'
                            : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                        }
          `}
                >
                    Continue
                </button>
            </div>
        </>
    )
}
