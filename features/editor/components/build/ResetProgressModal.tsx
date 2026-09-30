'use client'

import { X } from 'lucide-react'
import Image from 'next/image'
import { useBuildProgress } from '@/features/editor/hooks/useBuildProgress'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { ProgressBar } from './BuilderPanel'

/**
 * Confirmation shown when leaving the build step with progress (opened by
 * useStepNavigation with the step to enter once confirmed).
 */
export default function ResetProgressModal() {
    const isOpen = useEditorUiStore(state => state.modal === 'resetProgress')
    const pendingStep = useEditorUiStore(state => state.pendingStep)
    const closeModal = useEditorUiStore(state => state.closeModal)
    const setStep = useEditorUiStore(state => state.setStep)
    const { percent: percentage } = useBuildProgress()

    if (!isOpen) return null

    const onClose = closeModal
    const onConfirm = () => {
        closeModal()
        if (pendingStep) setStep(pendingStep)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="glass relative w-full max-w-md p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
                {/* Glow Effects - same as AuthModal */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-[var(--pink-glow)] rounded-full blur-[80px] pointer-events-none opacity-50" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none opacity-50" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 z-10"
                >
                    <X size={20} className="text-white/60 hover:text-white transition-colors" />
                </button>

                {/* Content */}
                <div className="mb-6 flex flex-col items-center relative z-10 w-full">
                    {/* Icon */}
                    <div className="relative w-16 h-16 mb-4">
                        <Image
                            src="/favicon.svg"
                            alt="Diceify Icon"
                            fill
                            className="object-contain drop-shadow-[0_0_15px_rgb(var(--pink-rgb)/0.5)]"
                        />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Reset Progress?</h2>

                    <p className="text-[var(--text-muted)] text-sm mb-6">
                        Changing settings will reset your build progress.
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full mb-6">
                        <ProgressBar percentage={percentage} showComplete={false} />
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-semibold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 rounded-xl bg-accent-pink hover:bg-accent-pink-light text-white font-semibold shadow-[0_0_20px_rgb(var(--pink-rgb)/0.3)] hover:shadow-[0_0_30px_rgb(var(--pink-rgb)/0.5)] transition-all"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
