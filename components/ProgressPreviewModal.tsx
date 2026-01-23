'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Eye, Sparkles } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { DiceSVGRenderer } from '@/lib/dice/svg-renderer'

interface ProgressPreviewModalProps {
    isOpen: boolean
    onClose: () => void
}

const MAX_RASTER_SIZE = 1080 // Max pixels on longest side for free users

export default function ProgressPreviewModal({ isOpen, onClose }: ProgressPreviewModalProps) {
    const { data: session } = useSession()
    const diceGrid = useEditorStore(state => state.diceGrid)
    const buildProgress = useEditorStore(state => state.buildProgress)
    const svgRendererRef = useRef<DiceSVGRenderer>()

    // Toggle between progress view and final art view
    const [showFinalArt, setShowFinalArt] = useState(false)

    // Rasterized image data URL for non-pro users
    const [rasterizedImage, setRasterizedImage] = useState<string | null>(null)

    const isPro = session?.user?.isPro ?? false

    // Generate SVG content showing only completed dice (or all dice if showFinalArt)
    const progressSvgContent = useMemo(() => {
        if (!diceGrid) return ''

        if (!svgRendererRef.current) {
            svgRendererRef.current = new DiceSVGRenderer()
        }

        const cols = diceGrid.width
        const rows = diceGrid.height
        const svgElements: string[] = []

        // Track the current position in the build order
        // Build order: row by row from bottom (y=0) to top, left (x=0) to right
        const progressX = buildProgress.x
        const progressY = buildProgress.y

        // Iterate through all dice positions
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const dice = diceGrid.dice[x][y]
                // SVG Y coordinate needs to be flipped (SVG 0 is top, our 0 is bottom)
                const svgY = rows - 1 - y

                // Determine if this dice should be rendered as completed
                // A dice is completed if:
                // 1. It's in a row below the current progress row (y < progressY), OR
                // 2. It's in the current row AND at or before the current X position (y === progressY && x <= progressX)
                const isCompleted = showFinalArt || y < progressY || (y === progressY && x <= progressX)

                if (isCompleted) {
                    // Render the actual dice
                    const renderer = svgRendererRef.current!
                    const diceSvg = (renderer as any).getSvgDice(dice.face, dice.color, dice.rotate90 || false)
                    svgElements.push(
                        `<svg x='${x}' y='${svgY}' width='1' height='1' viewBox='0 0 100 100'>${diceSvg}</svg>`
                    )
                } else {
                    // Render a placeholder (light gray background)
                    svgElements.push(
                        `<rect x='${x}' y='${svgY}' width='1' height='1' fill='#e5e5e5' stroke='#d4d4d4' stroke-width='0.02' />`
                    )
                }
            }
        }

        return svgElements.join('\n')
    }, [diceGrid, buildProgress.x, buildProgress.y, showFinalArt])

    // Rasterize SVG to canvas for non-pro users
    useEffect(() => {
        if (!isOpen || !diceGrid || isPro) {
            setRasterizedImage(null)
            return
        }

        const cols = diceGrid.width
        const rows = diceGrid.height

        // Calculate raster dimensions maintaining aspect ratio, max 1080px on longest side
        let rasterWidth: number
        let rasterHeight: number

        if (cols >= rows) {
            rasterWidth = Math.min(cols * 10, MAX_RASTER_SIZE) // 10px per dice unit, capped
            rasterHeight = Math.round(rasterWidth * (rows / cols))
        } else {
            rasterHeight = Math.min(rows * 10, MAX_RASTER_SIZE)
            rasterWidth = Math.round(rasterHeight * (cols / rows))
        }

        // Create full SVG string
        const viewBox = `0 0 ${cols} ${rows}`
        const fullSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${rasterWidth}" height="${rasterHeight}">
                <rect width="${cols}" height="${rows}" fill="#e5e5e5" />
                ${progressSvgContent}
            </svg>
        `

        // Convert SVG to image
        const img = new Image()
        const blob = new Blob([fullSvg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)

        img.onload = () => {
            // Draw to canvas at fixed resolution
            const canvas = document.createElement('canvas')
            canvas.width = rasterWidth
            canvas.height = rasterHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(img, 0, 0, rasterWidth, rasterHeight)
                setRasterizedImage(canvas.toDataURL('image/png'))
            }
            URL.revokeObjectURL(url)
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
        }

        img.src = url

        return () => {
            URL.revokeObjectURL(url)
        }
    }, [isOpen, diceGrid, progressSvgContent, isPro])

    if (!isOpen || !diceGrid) return null

    const cols = diceGrid.width
    const rows = diceGrid.height
    const viewBox = `0 0 ${cols} ${rows}`

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
                            <Eye size={16} />
                            Progress
                        </button>
                        <button
                            onClick={() => setShowFinalArt(true)}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${showFinalArt
                                ? 'bg-pink-500 text-white shadow-lg'
                                : 'text-white/60 hover:text-white/80'
                                }`}
                        >
                            <Sparkles size={16} />
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
                        // Pro users get full vector SVG
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox={viewBox}
                            preserveAspectRatio="xMidYMid meet"
                            style={{
                                display: 'block',
                                width: '100%',
                                height: '100%',
                                imageRendering: 'crisp-edges'
                            }}
                        >
                            {/* Light gray background for entire canvas */}
                            <rect width={cols} height={rows} fill="#e5e5e5" />

                            {/* Render dice content */}
                            <g dangerouslySetInnerHTML={{ __html: progressSvgContent }} />
                        </svg>
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
