'use client'

import { devLog } from '@/lib/utils/debug'
import { useState, useEffect, useRef, useCallback, useMemo, memo, type MouseEvent } from 'react'
import { animate } from 'motion'
import { useGesture } from '@use-gesture/react'
import { Plus, Minus, Loader2 } from 'lucide-react'
import { DiceSVGRenderer } from '@/lib/dice/svg-renderer'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { useBuildNavigation } from './useBuildNavigation'
import { useWakeLock } from '@/app/editor/hooks/useWakeLock'
import BuilderLimitToast from './BuilderLimitToast'

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
        navigateTo,
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
    const initializedRef = useRef(false) // First buildZoom applies the viewBox without animating
    const lastViewXRef = useRef<number | null>(null) // Track last viewX to enable free movement
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const animationRef = useRef<any>(null)
    const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null)

    // Window of cells currently present in the DOM (inclusive bounds, SVG rows)
    const renderedWindowRef = useRef<{ x0: number; x1: number; y0: number; y1: number } | null>(null)

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                animationRef.current.stop()
            }
        }
    }, [])

    // Selective generation: only materialize dice for the view rect plus a
    // buffer. Re-renders only when the view gets within `margin` dice of the
    // rendered window's edge; the buffer (one full viewport on each side)
    // provides hysteresis so single-step pans never touch the DOM.
    const ensureRendered = useCallback((viewX: number, viewY: number, viewW: number, viewH: number) => {
        if (!svgRendererRef.current) {
            svgRendererRef.current = new DiceSVGRenderer()
        }

        const margin = 1
        const needX0 = Math.max(0, Math.floor(viewX) - margin)
        const needX1 = Math.min(totalCols - 1, Math.ceil(viewX + viewW) + margin)
        const needY0 = Math.max(0, Math.floor(viewY) - margin)
        const needY1 = Math.min(totalRows - 1, Math.ceil(viewY + viewH) + margin)

        const w = renderedWindowRef.current
        if (w && needX0 >= w.x0 && needX1 <= w.x1 && needY0 >= w.y0 && needY1 <= w.y1) {
            return
        }

        const bufferX = Math.ceil(viewW)
        const bufferY = Math.ceil(viewH)
        const x0 = Math.max(0, Math.floor(viewX) - bufferX)
        const x1 = Math.min(totalCols - 1, Math.ceil(viewX + viewW) + bufferX)
        const y0 = Math.max(0, Math.floor(viewY) - bufferY)
        const y1 = Math.min(totalRows - 1, Math.ceil(viewY + viewH) + bufferY)

        renderedWindowRef.current = { x0, x1, y0, y1 }
        setSvgContent(svgRendererRef.current.renderWindow(grid, x0, x1, y0, y1))
    }, [grid, totalCols, totalRows])

    // Calculate and animate viewBox transition
    const buildZoom = useCallback(() => {
        // Wait for the container to be measured so the viewBox can match its aspect ratio
        if (!containerDimensions) return

        // Panning threshold configuration
        // SELECTOR_RESET_POSITION: Where the selector snaps to after panning (0.15 = 15% from left)
        // SELECTOR_PAN_THRESHOLD: When the selector triggers a pan (0.85 = 85% from left)
        const SELECTOR_RESET_POSITION = 0.15
        const SELECTOR_PAN_THRESHOLD = 0.85

        // View dimensions match the container's aspect ratio so the SVG fills it
        // exactly (zoomLevel = number of dice shown horizontally)
        const aspect = containerDimensions.width / containerDimensions.height
        let viewWidth = Math.max(3, Math.min(zoomLevel, totalCols))
        let viewHeight = viewWidth / aspect
        if (viewHeight < 3) {
            viewHeight = 3
            viewWidth = viewHeight * aspect
        }

        // Convert our coordinate system to SVG coordinates
        const svgY = totalRows - 1 - currentY

        const edgePadding = 0.1 // Extra space so highlights aren't cut off
        const padding = 0.5 // Keep the selected dice at least this far from the view edge

        // Calculate position to show current dice
        // Only pan when selector reaches threshold or goes past left edge (0%)
        let viewX: number

        if (lastViewXRef.current === null) {
            // First time: position dice at reset position
            viewX = currentX - viewWidth * SELECTOR_RESET_POSITION
        } else {
            // Calculate where the selector is relative to current view
            const relativeX = (currentX - lastViewXRef.current) / viewWidth

            if (relativeX >= SELECTOR_PAN_THRESHOLD || relativeX < 0) {
                // Selector crossed the right threshold or left edge, pan so it's back at reset position
                viewX = currentX - viewWidth * SELECTOR_RESET_POSITION
            } else {
                // Selector is within bounds, keep grid in place
                viewX = lastViewXRef.current
            }
        }

        let viewY = svgY - viewHeight * 0.6

        // Per axis: if the whole grid fits inside the view, center it; otherwise
        // clamp to the grid boundaries and make sure the selected dice stays visible
        if (viewWidth >= totalCols + 2 * edgePadding) {
            viewX = (totalCols - viewWidth) / 2
        } else {
            viewX = Math.min(Math.max(viewX, -edgePadding), totalCols + edgePadding - viewWidth)
            if (currentX < viewX + padding) viewX = Math.max(-edgePadding, currentX - padding)
            if (currentX >= viewX + viewWidth - padding) viewX = Math.min(totalCols + edgePadding - viewWidth, currentX - viewWidth + 1 + padding)
        }

        if (viewHeight >= totalRows + 2 * edgePadding) {
            viewY = (totalRows - viewHeight) / 2
        } else {
            viewY = Math.min(Math.max(viewY, -edgePadding), totalRows + edgePadding - viewHeight)
            if (svgY < viewY + padding) viewY = Math.max(-edgePadding, svgY - padding)
            if (svgY >= viewY + viewHeight - padding) viewY = Math.min(totalRows + edgePadding - viewHeight, svgY - viewHeight + 1 + padding)
        }

        // Remember where the view settled for the pan-threshold logic next time
        lastViewXRef.current = viewX

        // Make sure the dice for the target view exist in the DOM before panning there
        ensureRendered(viewX, viewY, viewWidth, viewHeight)

        const newViewBox = `${viewX} ${viewY} ${viewWidth} ${viewHeight}`

        // First measured layout: apply directly, there's nothing meaningful to animate from
        if (!initializedRef.current) {
            initializedRef.current = true
            viewBoxRef.current = newViewBox
            svgRef.current?.setAttribute('viewBox', newViewBox)
            return
        }

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
    }, [currentX, currentY, totalRows, totalCols, zoomLevel, containerDimensions, ensureRendered])

    // Regenerate the rendered window when the grid itself changes
    useEffect(() => {
        renderedWindowRef.current = null
        if (!initializedRef.current) return
        const [vx, vy, vw, vh] = viewBoxRef.current.split(' ').map(Number)
        if (![vx, vy, vw, vh].some(isNaN)) {
            ensureRendered(vx, vy, vw, vh)
        }
    }, [grid, ensureRendered])

    // Track container dimensions so the viewBox aspect ratio can follow them
    useEffect(() => {
        if (!containerRef.current) return

        const measure = () => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                setContainerDimensions(prev =>
                    prev?.width === rect.width && prev?.height === rect.height
                        ? prev
                        : { width: rect.width, height: rect.height }
                )
            }
        }

        measure()
        const resizeObserver = new ResizeObserver(measure)
        resizeObserver.observe(containerRef.current)
        return () => resizeObserver.disconnect()
    }, [])

    // Rebuild viewBox when position, container dimensions or zoom change
    useEffect(() => {
        buildZoom()
    }, [buildZoom])


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

    // Pinch-to-zoom (touch): pinching out shows fewer dice = zooming in.
    // Quantized to steps of 2 (like the buttons) so the viewBox animation
    // isn't re-triggered on every gesture frame.
    const zoomLevelRef = useRef(zoomLevel)
    useEffect(() => {
        zoomLevelRef.current = zoomLevel
    }, [zoomLevel])
    const pinchStartZoomRef = useRef(zoomLevel)

    useGesture({
        onPinch: ({ first, movement: [scale] }) => {
            if (first) pinchStartZoomRef.current = zoomLevelRef.current
            const target = Math.round(pinchStartZoomRef.current / scale / 2) * 2
            const next = Math.min(20, Math.max(4, target))
            if (next !== zoomLevelRef.current) setZoomLevel(next)
        }
    }, {
        target: containerRef,
        eventOptions: { passive: false }
    })

    // Dice cell currently under the mouse (SVG coordinates), for the hover indicator
    const [hoverCell, setHoverCell] = useState<{ x: number; svgY: number } | null>(null)

    // Map a mouse event from screen space into a dice cell (1 viewBox unit = 1 die)
    const cellFromEvent = useCallback((e: MouseEvent<SVGSVGElement>) => {
        const svg = svgRef.current
        if (!svg) return null

        const ctm = svg.getScreenCTM()
        if (!ctm) return null

        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
        const x = Math.floor(pt.x)
        const svgY = Math.floor(pt.y)
        if (x < 0 || x >= totalCols || svgY < 0 || svgY >= totalRows) return null

        return { x, svgY }
    }, [totalCols, totalRows])

    // Click a dice to jump the selector to it
    const handleSvgClick = useCallback((e: MouseEvent<SVGSVGElement>) => {
        const cell = cellFromEvent(e)
        if (cell) {
            navigateTo(cell.x, totalRows - 1 - cell.svgY)
        }
    }, [cellFromEvent, totalRows, navigateTo])

    const handleSvgMouseMove = useCallback((e: MouseEvent<SVGSVGElement>) => {
        const cell = cellFromEvent(e)
        // Only update state when the hovered cell actually changes
        setHoverCell(prev =>
            prev?.x === cell?.x && prev?.svgY === cell?.svgY ? prev : cell
        )
    }, [cellFromEvent])

    const handleSvgMouseLeave = useCallback(() => setHoverCell(null), [])

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
        <div className="flex w-full h-full justify-center items-center" data-testid="build-viewer">
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
                    className="relative w-full h-full backdrop-blur-xl rounded-2xl border overflow-hidden"
                    style={{
                        backgroundColor: theme.colors.glass.medium,
                        borderColor: theme.colors.glass.border,
                        // Floor keeps the builder usable on very small windows
                        minWidth: 280,
                        minHeight: 280,
                        // Keep pinch gestures for the dice grid, not browser zoom/scroll
                        touchAction: 'none',
                    }}
                >
                    {/* SVG Container - viewBox animates smoothly over 1 second */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                            ref={svgRef}
                            xmlns="http://www.w3.org/2000/svg"
                            preserveAspectRatio="xMidYMid meet"
                            style={{ width: '100%', height: '100%', imageRendering: 'crisp-edges', willChange: 'transform', cursor: 'pointer' }}
                            onClick={handleSvgClick}
                            onMouseMove={handleSvgMouseMove}
                            onMouseLeave={handleSvgMouseLeave}
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

                            {/* Hover indicator - subtler version of the selection highlight */}
                            {hoverCell && !(hoverCell.x === currentX && hoverCell.svgY === totalRows - 1 - currentY) && (
                                <rect
                                    x={hoverCell.x + 0.02}
                                    y={hoverCell.svgY + 0.02}
                                    width={0.96}
                                    height={0.96}
                                    fill={theme.colors.accent.pink}
                                    fillOpacity="0.08"
                                    stroke={theme.colors.dice.highlightColor}
                                    strokeWidth="0.04"
                                    strokeOpacity="0.45"
                                    rx="0.1"
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}

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
    // Building with physical dice takes a while - don't let the screen sleep
    useWakeLock()

    const diceGrid = useEditorStore(state => state.diceGrid)

    // The grid is regenerated by the dice pipeline after a restore -
    // show a spinner until it lands (also keeps BuildViewer's hooks from
    // ever mounting without a grid)
    if (!diceGrid) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.colors.accent.pink }} />
                <span className="text-sm" style={{ color: theme.colors.text.secondary }}>Preparing your build...</span>
            </div>
        )
    }

    return (
        <div className="relative w-full h-full">
            <BuilderLimitToast />
            <BuildViewer />
        </div>
    )
}
