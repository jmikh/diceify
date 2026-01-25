'use client'

import { devLog } from '@/lib/utils/debug'
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { animate } from 'motion'
import { Plus, Minus } from 'lucide-react'
import { DiceSVGRenderer } from '@/lib/dice/svg-renderer'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { useBuildNavigation } from './useBuildNavigation'

// --- BuildViewer Component (Internal) ---

const BuildViewer = memo(function BuildViewer() {
    const diceGrid = useEditorStore(state => state.diceGrid)

    const {
        currentX,
        currentY,
        navigatePrev,
        navigateNext,
        navigatePrevDiff,
        navigateNextDiff,
        canNavigate,
        currentDice,
        totalCols,
        totalRows
    } = useBuildNavigation()

    const grid = diceGrid
    if (!grid) return null

    // Performance monitoring
    const [showDebug, setShowDebug] = useState(false)
    const [fps, setFps] = useState(60)
    const frameCountRef = useRef(0)
    const lastTimeRef = useRef(performance.now())

    const [zoomLevel, setZoomLevel] = useState(8) // Number of dice to show horizontally
    const svgRendererRef = useRef<DiceSVGRenderer>()
    const [svgContent, setSvgContent] = useState<string>('')

    // Track viewBox with ref only - no React state to avoid re-renders
    const viewBoxRef = useRef(`0 0 ${totalCols} ${totalRows}`) // Initial fallback
    const lastViewXRef = useRef<number | null>(null) // Track last viewX to enable free movement
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const animationRef = useRef<any>(null)
    const [containerDimensions, setContainerDimensions] = useState({ width: 600, height: 600 })

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                animationRef.current.stop()
            }
        }
    }, [])

    // Calculate and animate viewBox transition
    const buildZoom = useCallback(() => {
        // Panning threshold configuration
        // SELECTOR_RESET_POSITION: Where the selector snaps to after panning (0.25 = 25% from left)
        // SELECTOR_PAN_THRESHOLD: When the selector triggers a pan (0.75 = 75% from left)
        const SELECTOR_RESET_POSITION = 0.15
        const SELECTOR_PAN_THRESHOLD = 0.85

        // Calculate container aspect ratio
        const containerAspect = containerDimensions.width / containerDimensions.height

        // Calculate view dimensions - width based on zoom level, height based on aspect ratio
        let viewWidth = Math.min(zoomLevel, totalCols)
        let viewHeight = viewWidth / containerAspect

        // Adjust if height exceeds grid bounds
        if (viewHeight > totalRows) {
            viewHeight = totalRows
            viewWidth = viewHeight * containerAspect
        }

        // Ensure minimum view size
        viewWidth = Math.max(3, viewWidth)
        viewHeight = Math.max(3, viewHeight)

        // Convert our coordinate system to SVG coordinates
        const svgY = totalRows - 1 - currentY

        // Calculate position to show current dice
        // Only pan when selector reaches threshold or goes past left edge (0%)
        const edgePadding = 0.1 // Extra space so highlights aren't cut off
        let viewX: number

        if (lastViewXRef.current === null) {
            // First time: position dice at reset position
            viewX = currentX - viewWidth * SELECTOR_RESET_POSITION
        } else {
            // Calculate where the selector is relative to current view
            const relativeX = (currentX - lastViewXRef.current) / viewWidth

            if (relativeX >= SELECTOR_PAN_THRESHOLD) {
                // Selector reached right edge threshold, pan so it's back at reset position
                viewX = currentX - viewWidth * SELECTOR_RESET_POSITION
            } else if (relativeX < 0) {
                // Selector went past left edge, pan so it's at reset position
                viewX = currentX - viewWidth * SELECTOR_RESET_POSITION
            } else {
                // Selector is within bounds, keep grid in place
                viewX = lastViewXRef.current
            }
        }

        let viewY = svgY - viewHeight * 0.6

        // Clamp to grid boundaries with extra padding for highlights
        if (viewX < -edgePadding) viewX = -edgePadding
        if (viewX + viewWidth > totalCols + edgePadding) viewX = totalCols + edgePadding - viewWidth
        if (viewY < -edgePadding) viewY = -edgePadding
        if (viewY + viewHeight > totalRows + edgePadding) viewY = totalRows + edgePadding - viewHeight

        // Remember this viewX for next time
        lastViewXRef.current = viewX

        // Ensure current dice is visible with some padding
        const padding = 0.5
        if (currentX < viewX + padding) viewX = Math.max(-edgePadding, currentX - padding)
        if (currentX >= viewX + viewWidth - padding) viewX = Math.min(totalCols + edgePadding - viewWidth, currentX - viewWidth + 1 + padding)
        if (svgY < viewY + padding) viewY = Math.max(-edgePadding, svgY - padding)
        if (svgY >= viewY + viewHeight - padding) viewY = Math.min(totalRows + edgePadding - viewHeight, svgY - viewHeight + 1 + padding)

        const newViewBox = `${viewX} ${viewY} ${viewWidth} ${viewHeight}`

        // Parse current viewBox values from ref to avoid dependency cycle
        const currentValues = viewBoxRef.current.split(' ').map(Number)
        const targetValues = newViewBox.split(' ').map(Number)

        // Check for valid values
        if (currentValues.some(isNaN) || targetValues.some(isNaN)) {
            viewBoxRef.current = newViewBox
            if (svgRef.current) {
                svgRef.current.setAttribute('viewBox', newViewBox)
            }
            return
        }

        // If viewBox hasn't changed significantly, just update it
        if (Math.abs(currentValues[0] - targetValues[0]) < 0.01 &&
            Math.abs(currentValues[1] - targetValues[1]) < 0.01 &&
            Math.abs(currentValues[2] - targetValues[2]) < 0.01 &&
            Math.abs(currentValues[3] - targetValues[3]) < 0.01) {
            viewBoxRef.current = newViewBox
            if (svgRef.current) {
                svgRef.current.setAttribute('viewBox', newViewBox)
            }
            return
        }

        // Cancel any existing animation
        if (animationRef.current) {
            animationRef.current.stop()
        }

        // Use a single progress value to interpolate all viewBox values
        animationRef.current = animate(
            0,  // from progress
            1,  // to progress
            {
                duration: 1, // 1 second animation
                ease: [0.25, 0.1, 0.25, 1], // Custom easing curve
                onUpdate: (progress) => {
                    // Manually interpolate each value based on progress
                    const x = currentValues[0] + (targetValues[0] - currentValues[0]) * progress
                    const y = currentValues[1] + (targetValues[1] - currentValues[1]) * progress
                    const width = currentValues[2] + (targetValues[2] - currentValues[2]) * progress
                    const height = currentValues[3] + (targetValues[3] - currentValues[3]) * progress

                    const interpolatedViewBox = `${x} ${y} ${width} ${height}`
                    viewBoxRef.current = interpolatedViewBox

                    // Update the SVG element directly - no React state
                    if (svgRef.current) {
                        svgRef.current.setAttribute('viewBox', interpolatedViewBox)
                    }
                },
                onComplete: () => {
                    // Ensure we end exactly at the target
                    viewBoxRef.current = newViewBox
                    if (svgRef.current) {
                        svgRef.current.setAttribute('viewBox', newViewBox)
                    }
                }
            }
        )
    }, [currentX, currentY, totalRows, totalCols, zoomLevel, containerDimensions.width, containerDimensions.height])

    // Initialize SVG renderer and generate SVG only when grid changes
    useEffect(() => {
        if (!svgRendererRef.current) {
            svgRendererRef.current = new DiceSVGRenderer()
        }

        // Generate SVG without highlighting (we handle it separately now)
        const svgResult = svgRendererRef.current.renderWithStats(grid)
        setSvgContent(svgResult.svg)
    }, [grid])

    // Initial setup effect - run once on mount
    useEffect(() => {
        // Calculate initial viewBox without animation
        // Needs currentX and currentY which are now from hook, so they are available immediately.
        // We can just rely on the main zoom effect, but need to initialize viewBoxRef correctly first time.
        // Actually, since buildZoom has dependencies on currentX, currentY, it will run on mount/update.
        // But to avoid animation from 0 0 0 0, we should set viewBoxRef to a reasonable start before first render if possible.
        // However, viewBoxRef is init with 0 0 totalCols totalRows.

        // Let's just manually trigger a calculation without animation for the very first frame if needed, or just let it animate.
        // The original code had a separate effect for initial setup.

        const containerAspect = containerDimensions.width / containerDimensions.height
        let viewWidth = Math.min(zoomLevel, totalCols)
        let viewHeight = viewWidth / containerAspect

        if (viewHeight > totalRows) {
            viewHeight = totalRows
            viewWidth = viewHeight * containerAspect
        }

        viewWidth = Math.max(3, viewWidth)
        viewHeight = Math.max(3, viewHeight)

        const svgY = totalRows - 1 - currentY
        let viewX = currentX - viewWidth * 0.25
        let viewY = svgY - viewHeight * 0.75

        const edgePadding = 0.1
        if (viewX < -edgePadding) viewX = -edgePadding
        if (viewX + viewWidth > totalCols + edgePadding) viewX = totalCols + edgePadding - viewWidth
        if (viewY < -edgePadding) viewY = -edgePadding
        if (viewY + viewHeight > totalRows + edgePadding) viewY = totalRows + edgePadding - viewHeight

        const padding = 0.5
        if (currentX < viewX + padding) viewX = Math.max(-edgePadding, currentX - padding)
        if (currentX >= viewX + viewWidth - padding) viewX = Math.min(totalCols + edgePadding - viewWidth, currentX - viewWidth + 1 + padding)
        if (svgY < viewY + padding) viewY = Math.max(-edgePadding, svgY - padding)
        if (svgY >= viewY + viewHeight - padding) viewY = Math.min(totalRows + edgePadding - viewHeight, svgY - viewHeight + 1 + padding)

        const initialViewBox = `${viewX} ${viewY} ${viewWidth} ${viewHeight}`
        viewBoxRef.current = initialViewBox

        // Set initial viewBox directly on the SVG element after it mounts
        setTimeout(() => {
            if (svgRef.current) {
                svgRef.current.setAttribute('viewBox', initialViewBox)
            }
        }, 0)
    }, []) // Run only once on mount

    // Track container dimensions
    useEffect(() => {
        if (!containerRef.current) return

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect
                setContainerDimensions({ width, height })
            }
        })

        resizeObserver.observe(containerRef.current)

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    // Rebuild viewBox when container dimensions or zoom changes
    useEffect(() => {
        buildZoom()
    }, [buildZoom, containerDimensions, zoomLevel])


    // FPS monitoring
    useEffect(() => {
        if (!showDebug) return

        let animationId: number
        const measureFPS = () => {
            frameCountRef.current++
            const now = performance.now()
            const delta = now - lastTimeRef.current

            if (delta >= 1000) {
                setFps(Math.round((frameCountRef.current * 1000) / delta))
                frameCountRef.current = 0
                lastTimeRef.current = now
            }

            animationId = requestAnimationFrame(measureFPS)
        }

        animationId = requestAnimationFrame(measureFPS)
        return () => cancelAnimationFrame(animationId)
    }, [showDebug])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Toggle debug with 'D' key
            if (e.key === 'd' || e.key === 'D') {
                setShowDebug(prev => !prev)
                return
            }

            switch (e.key) {
                case 'ArrowLeft':
                    if (e.shiftKey && canNavigate.prevDiff) {
                        navigatePrevDiff()
                    } else if (canNavigate.prev) {
                        navigatePrev()
                    }
                    break
                case 'ArrowRight':
                    if (e.shiftKey && canNavigate.nextDiff) {
                        navigateNextDiff()
                    } else if (canNavigate.next) {
                        navigateNext()
                    }
                    break
            }
        }

        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [canNavigate, navigatePrev, navigateNext, navigatePrevDiff, navigateNextDiff])

    return (
        <div className="flex w-full justify-center" data-testid="build-viewer">
            <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
            <div className="w-full h-full flex items-center justify-center p-4">
                <div
                    ref={containerRef}
                    className="relative backdrop-blur-xl rounded-2xl border overflow-hidden"
                    style={{
                        backgroundColor: theme.colors.glass.medium,
                        borderColor: theme.colors.glass.border,
                        width: '100%',
                        height: '100%',
                        aspectRatio: '1/1',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        minHeight: '320px',
                        minWidth: '320px',
                    }}
                >
                    {/* SVG Container - viewBox animates smoothly over 1 second */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                            ref={svgRef}
                            xmlns="http://www.w3.org/2000/svg"
                            preserveAspectRatio="xMidYMid meet"
                            style={{ width: '100%', height: '100%', imageRendering: 'crisp-edges', willChange: 'transform' }}
                        >
                            {/* Render dice content */}
                            <g dangerouslySetInnerHTML={{ __html: svgContent }} />

                            {/* Secondary rectangle over consecutive dice group (rendered behind highlight) */}
                            {currentDice && (() => {
                                // Find the extent of consecutive dice backward and forward
                                const currentFace = currentDice.face
                                const currentColor = currentDice.color

                                // Count backward
                                let startX = currentX
                                for (let x = currentX - 1; x >= 0; x--) {
                                    const dice = grid.dice[x][currentY]
                                    if (dice.face === currentFace && dice.color === currentColor) {
                                        startX = x
                                    } else {
                                        break
                                    }
                                }

                                // Count forward
                                let endX = currentX
                                for (let x = currentX + 1; x < totalCols; x++) {
                                    const dice = grid.dice[x][currentY]
                                    if (dice.face === currentFace && dice.color === currentColor) {
                                        endX = x
                                    } else {
                                        break
                                    }
                                }

                                const groupWidth = endX - startX + 1

                                // Always render the rectangle, it will be same size as highlight when groupWidth is 1
                                return (
                                    <rect
                                        x={startX + 0.02}
                                        y={totalRows - 1 - currentY + 0.02}
                                        width={groupWidth - 0.04}
                                        height={1 - 0.04}
                                        fill={theme.colors.accent.blue}
                                        fillOpacity="0.1"
                                        stroke={theme.colors.accent.purple}
                                        strokeWidth="0.06"
                                        strokeOpacity="1"
                                        rx="0.1"
                                        style={{
                                            transition: 'x 0.5s cubic-bezier(0.4, 0, 0.2, 1), y 0.5s cubic-bezier(0.4, 0, 0.2, 1), width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                            willChange: 'x, y, width'
                                        }}
                                    />
                                )
                            })()}

                            {/* Animated highlight overlay (rendered on top) */}
                            <rect
                                x={currentX + 0.02}
                                y={totalRows - 1 - currentY + 0.02}
                                width={0.96}
                                height={0.96}
                                fill={theme.colors.accent.pink}
                                fillOpacity="0.2"
                                stroke={theme.colors.dice.highlightColor}
                                strokeWidth="0.06"
                                rx="0.1"
                                style={{
                                    transition: 'x 0.5s cubic-bezier(0.4, 0, 0.2, 1), y 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                    filter: 'drop-shadow(0 0 2px rgba(236, 72, 153, 0.8))',
                                    willChange: 'x, y'
                                }}
                            />

                            {/* Consecutive count badges */}
                            {currentDice && (() => {
                                // Find the extent of consecutive dice
                                const currentFace = currentDice.face
                                const currentColor = currentDice.color

                                // Count backward to get total group width
                                let startX = currentX
                                for (let x = currentX - 1; x >= 0; x--) {
                                    const dice = grid.dice[x][currentY]
                                    if (dice.face === currentFace && dice.color === currentColor) {
                                        startX = x
                                    } else {
                                        break
                                    }
                                }

                                // Count forward for both group width and consecutive forward count
                                let endX = currentX
                                let consecutiveForward = 0
                                for (let x = currentX + 1; x < totalCols; x++) {
                                    const dice = grid.dice[x][currentY]
                                    if (dice.face === currentFace && dice.color === currentColor) {
                                        endX = x
                                        consecutiveForward++
                                    } else {
                                        break
                                    }
                                }

                                const groupWidth = endX - startX + 1

                                // Show badge only when part of a group (groupWidth > 1)
                                const showBadge = groupWidth > 1

                                // Position badges
                                let blueBadgeX = currentX + 0.5 // Center horizontally for blue badge
                                let purpleBadgeX = startX + 0.5 // First dice position for purple badge
                                let badgeY = totalRows - 1 - currentY - 0.32 // Above the dice

                                // Adjust position if at edges
                                const isAtTopEdge = currentY >= totalRows - 2

                                if (isAtTopEdge) {
                                    badgeY = totalRows - 1 - currentY + 1.3 // Move below
                                }

                                // Determine stick direction based on badge position
                                const stickY1 = isAtTopEdge ? -0.20 : 0.20 // Start from top if badge is below
                                const stickY2 = isAtTopEdge ? -0.35 : 0.35 // End at dice
                                const stickY1Blue = isAtTopEdge ? -0.22 : 0.22 // Slightly bigger for blue badge

                                if (!showBadge) return null

                                return (
                                    <>
                                        {/* Purple badge showing total group width (rendered first, so it's behind) */}
                                        {(
                                            <g
                                                transform={`translate(${purpleBadgeX}, ${badgeY})`}
                                                style={{
                                                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}
                                            >
                                                <g>
                                                    <circle
                                                        cx="0"
                                                        cy="0"
                                                        r="0.20"
                                                        fill={theme.colors.accent.purple}
                                                        fillOpacity="0.9"
                                                        stroke={theme.colors.accent.purple}
                                                        strokeWidth="0.04"
                                                        strokeOpacity="1"
                                                    />

                                                    <line
                                                        x1="0"
                                                        y1={stickY1}
                                                        x2="0"
                                                        y2={stickY2}
                                                        stroke={theme.colors.accent.purple}
                                                        strokeWidth="0.1"
                                                        strokeOpacity="1"
                                                    />

                                                    <text x="0" y="0.05" fontSize="0.16" fill="#fff" textAnchor="middle">
                                                        &times;{groupWidth}
                                                    </text>
                                                </g>
                                            </g>
                                        )}


                                        {/* Blue badge showing consecutive forward count (rendered second, so it's on top) */}
                                        <g
                                            transform={`translate(${blueBadgeX}, ${badgeY})`}
                                            style={{
                                                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            <g>
                                                <circle
                                                    cx="0"
                                                    cy="0"
                                                    r="0.22"
                                                    fill={theme.colors.accent.pink}
                                                    fillOpacity="0.9"
                                                    stroke={theme.colors.accent.pink}
                                                    strokeWidth="0.04"
                                                    strokeOpacity="1"
                                                />

                                                <line
                                                    x1="0"
                                                    y1={stickY1Blue}
                                                    x2="0"
                                                    y2={stickY2}
                                                    stroke={theme.colors.accent.pink}
                                                    strokeWidth="0.1"
                                                    strokeOpacity="1"
                                                />

                                                <text x="0" y="0.05" fontSize="0.16" fill="#fff" textAnchor="middle">
                                                    &times;{consecutiveForward + 1}
                                                </text>
                                            </g>
                                        </g>
                                    </>
                                )
                            })()}
                        </svg>
                    </div>


                    {/* Zoom Controls */}
                    <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
                        <button
                            onClick={() => setZoomLevel(Math.min(20, zoomLevel + 2))}
                            disabled={zoomLevel >= 20}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-500 hover:text-pink-400 transition-all backdrop-blur-md shadow-[0_0_15px_rgba(236,72,153,0.15)] disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Zoom Out"
                        >
                            <Minus className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setZoomLevel(Math.max(4, zoomLevel - 2))}
                            disabled={zoomLevel <= 4}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-500 hover:text-pink-400 transition-all backdrop-blur-md shadow-[0_0_15px_rgba(236,72,153,0.15)] disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Zoom In"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>


                    {/* Debug Overlay */}
                    {showDebug && (
                        <div className="absolute top-4 left-4 backdrop-blur-md rounded-lg p-3 font-mono text-xs"
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                            <div className="text-green-400">FPS: {fps}</div>
                            <div className="text-pink-400">Position: ({currentX}, {currentY})</div>
                            <div className="text-yellow-400">Zoom: {zoomLevel}</div>
                            <div className="text-purple-400">ViewBox: {viewBoxRef.current.split(' ').map(n => parseFloat(n).toFixed(1)).join(' ')}</div>
                            <div className="text-gray-400 mt-2">Press 'D' to toggle</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})

// --- BuilderMain Component ---

export default function BuilderMain() {
    return (
        <BuildViewer />
    )
}
