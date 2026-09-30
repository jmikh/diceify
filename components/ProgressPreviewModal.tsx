'use client'

import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { RiProgress5Line, RiProgress8Line } from 'react-icons/ri'
import { useSession } from 'next-auth/react'
import { rasterSize, renderProgressSvg } from '@/core/dice'
import { rasterizeSvg } from '@/lib/image/rasterize'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'

interface ProgressPreviewModalProps {
    isOpen: boolean
    onClose: () => void
}

const MAX_RASTER_SIZE = 1080 // Max pixels on longest side for free users
const RASTER_PX_PER_DIE = 10

export default function ProgressPreviewModal({ isOpen, onClose }: ProgressPreviewModalProps) {
    const { data: session } = useSession()
    const diceGrid = useEditorStore(state => state.diceGrid)
    const buildProgress = useEditorStore(state => state.buildProgress)

    // Toggle between progress view and final art view
    const [showFinalArt, setShowFinalArt] = useState(false)

    // Rasterized image data URL for non-pro users
    const [rasterizedImage, setRasterizedImage] = useState<string | null>(null)

    const isPro = session?.user?.isPro ?? false

    // Free users get a raster capped at MAX_RASTER_SIZE (10 px per die below that)
    const raster = useMemo(() => {
        if (!diceGrid) return null
        const longSide = Math.min(Math.max(diceGrid.width, diceGrid.height) * RASTER_PX_PER_DIE, MAX_RASTER_SIZE)
        return rasterSize(diceGrid.width, diceGrid.height, longSide)
    }, [diceGrid])

    // Standalone SVG showing only the placed dice (or all dice if showFinalArt)
    const progressSvg = useMemo(() => {
        if (!diceGrid) return ''
        return renderProgressSvg(diceGrid, buildProgress, { showAll: showFinalArt, ...(isPro ? {} : raster) })
    }, [diceGrid, buildProgress, showFinalArt, isPro, raster])

    // Rasterize SVG to canvas for non-pro users
    useEffect(() => {
        if (!isOpen || !progressSvg || !raster || isPro) {
            setRasterizedImage(null)
            return
        }
        let cancelled = false
        rasterizeSvg(progressSvg, raster)
            .then(url => { if (!cancelled) setRasterizedImage(url) })
            .catch(error => console.error('[PREVIEW] Rasterize failed:', error))
        return () => { cancelled = true }
    }, [isOpen, progressSvg, raster, isPro])

    if (!isOpen || !diceGrid) return null

    const cols = diceGrid.width
    const rows = diceGrid.height

    // Calculate aspect ratio for proper sizing
    const aspectRatio = cols / rows

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="glass relative w-fit p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
                {/* Glow Effects */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-[var(--pink-glow)] rounded-full blur-[80px] pointer-events-none opacity-50" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none opacity-50" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 z-10"
                >
                    <X size={20} className="text-white/60 hover:text-white transition-colors" />
                </button>

                {/* Left/Right Toggle */}
                <div className="mb-4 flex flex-col items-center relative z-10">
                    <div
                        className="flex rounded-full p-1"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}
                    >
                        <button
                            onClick={() => setShowFinalArt(false)}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${!showFinalArt
                                ? 'bg-pink-500 text-white shadow-lg'
                                : 'text-white/60 hover:text-white/80'
                                }`}
                        >
                            <RiProgress5Line size={16} />
                            Progress
                        </button>
                        <button
                            onClick={() => setShowFinalArt(true)}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${showFinalArt
                                ? 'bg-pink-500 text-white shadow-lg'
                                : 'text-white/60 hover:text-white/80'
                                }`}
                        >
                            <RiProgress8Line size={16} />
                            Full
                        </button>
                    </div>
                </div>

                {/* Canvas Preview - container sized to fit properly */}
                <div
                    className="overflow-hidden"
                    style={{
                        border: `2px solid ${theme.colors.accent.pink}`,
                        // Use CSS to calculate proper dimensions based on available space
                        width: aspectRatio >= 1
                            ? 'min(calc(100vw - 48px), calc((85vh) * ' + aspectRatio + '))'
                            : 'calc((85vh) * ' + aspectRatio + ')',
                        maxWidth: 'calc(100vw - 48px)',
                        maxHeight: '85vh',
                        aspectRatio: `${cols} / ${rows}`,
                    }}
                >
                    {isPro ? (
                        // Pro users get the full vector SVG (it fills its box)
                        <div className="w-full h-full leading-none" dangerouslySetInnerHTML={{ __html: progressSvg }} />
                    ) : (
                        // Free users get rasterized image (max 1080px)
                        rasterizedImage ? (
                            <img
                                src={rasterizedImage}
                                alt="Dice art preview"
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    imageRendering: 'pixelated'
                                }}
                            />
                        ) : (
                            // Loading state
                            <div
                                className="flex items-center justify-center bg-gray-200"
                                style={{ width: '100%', height: '100%' }}
                            >
                                <span className="text-gray-500">Loading...</span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )

    // Use portal to render at body level, ensuring fullscreen overlay
    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body)
    }

    return modalContent
}
