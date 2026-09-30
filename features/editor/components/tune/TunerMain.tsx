'use client'

import { Loader2 } from 'lucide-react'
import DiceCanvas from './DiceCanvas'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'

export default function TunerMain() {
    const isGenerating = useDerivedStore(state => state.isGenerating)
    const previewUrl = useDerivedStore(state => state.previewUrl)

    // The pipeline flags generation as soon as an input changes (before its
    // debounce), so the spinner is immediate; also shown until the first preview
    const showLoading = isGenerating || !previewUrl

    return (
        <div className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Themed loading overlay */}
            {showLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div
                        className="flex flex-col items-center gap-4 px-8 py-6"
                        style={{
                            background: 'var(--bg-glass)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '1.25rem'
                        }}
                    >
                        {/* Glowing spinner container */}
                        <div
                            className="relative flex items-center justify-center"
                            style={{
                                width: '64px',
                                height: '64px'
                            }}
                        >
                            {/* Pink glow effect behind spinner */}
                            <div
                                className="absolute inset-0 rounded-full animate-pulse"
                                style={{
                                    background: 'var(--pink-glow)',
                                    filter: 'blur(16px)'
                                }}
                            />
                            {/* Spinner */}
                            <Loader2
                                className="relative z-10 animate-spin"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    color: 'var(--pink)'
                                }}
                            />
                        </div>
                        {/* Status text */}
                        <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Generating dice art...
                        </span>
                    </div>
                </div>
            )}

            <DiceCanvas />
        </div>
    )
}
