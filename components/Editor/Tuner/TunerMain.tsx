'use client'

import { RefObject, useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import DiceCanvas, { DiceCanvasRef } from './DiceCanvas'
import { useEditorStore } from '@/lib/store/useEditorStore'

interface TunerMainProps {
    diceCanvasRef: RefObject<DiceCanvasRef>
}

export default function TunerMain({ diceCanvasRef }: TunerMainProps) {
    const params = useEditorStore(state => state.diceParams)
    const processedImageUrl = useEditorStore(state => state.processedImageUrl)
    const croppedImage = useEditorStore(state => state.croppedImage)

    const [isLoading, setIsLoading] = useState(false)
    const isFirstRender = useRef(true)
    const prevParamsRef = useRef(params)

    // Show loading immediately when params change (before debounce kicks in)
    useEffect(() => {
        // Skip the initial render
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        // Check if params actually changed
        if (JSON.stringify(prevParamsRef.current) !== JSON.stringify(params)) {
            setIsLoading(true)
            prevParamsRef.current = params
        }
    }, [params])

    // Also show loading when croppedImage changes (new crop area)
    useEffect(() => {
        if (croppedImage && !isFirstRender.current) {
            setIsLoading(true)
        }
    }, [croppedImage])

    // Hide loading when new processed image is ready
    useEffect(() => {
        if (processedImageUrl) {
            setIsLoading(false)
        }
    }, [processedImageUrl])

    // Show loading if no processed image exists yet
    const showLoading = isLoading || !processedImageUrl

    return (
        <div className="flex-1 relative w-full h-full flex items-center justify-center">
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

            <DiceCanvas
                ref={diceCanvasRef}
                maxWidth={1080}
                maxHeight={1080}
            />
        </div>
    )
}
