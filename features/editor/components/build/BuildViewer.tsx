'use client'

import { useState, useRef, useCallback, useMemo, memo, type MouseEvent } from 'react'
import { Plus, Minus } from 'lucide-react'
import { findRun, gridRowFromSvg, svgRow, type DiceGrid } from '@/core/dice'
import { useBuildNavigation } from '@/features/editor/hooks/useBuildNavigation'
import { useBuildViewBox } from './useBuildViewBox'
import { useBuildWindow } from './useBuildWindow'
import { useBuildZoom } from './useBuildZoom'
import { useElementSize } from './useElementSize'
import RunBadges from './RunBadges'

interface BuildViewerProps {
    grid: DiceGrid
}

const HIGHLIGHT_TRANSITION = 'x 0.5s cubic-bezier(0.4, 0, 0.2, 1), y 0.5s cubic-bezier(0.4, 0, 0.2, 1)'

const zoomButtonClass =
    'w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink/10 hover:bg-accent-pink/20 border border-accent-pink/20 text-accent-pink hover:text-accent-pink-light transition-all backdrop-blur-md shadow-[0_0_15px_rgb(var(--pink-rgb)/0.15)] disabled:opacity-30 disabled:cursor-not-allowed'

/** The zoomable dice viewer for the build step. `grid` is never null: BuilderMain gates on it. */
const BuildViewer = memo(function BuildViewer({ grid }: BuildViewerProps) {
    // Arrow-key navigation lives in useEditorShortcuts (page level)
    const { current, currentDie, navigateTo } = useBuildNavigation()
    const { x: currentX, y: currentY } = current
    const { width: cols, height: rows } = grid

    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    // View dimensions match the container's aspect ratio so the SVG fills it exactly
    const containerSize = useElementSize(containerRef)
    const aspect = containerSize ? containerSize.width / containerSize.height : null

    const { zoomLevel, zoomIn, zoomOut, canZoomIn, canZoomOut } = useBuildZoom(containerRef)
    const { svgContent, ensureRendered } = useBuildWindow(grid)
    useBuildViewBox({
        svgRef,
        current,
        cols,
        rows,
        zoomLevel,
        aspect,
        onView: ensureRendered,
    })

    // The run of identical dice the selector is in (group rectangle + badges)
    const run = useMemo(
        () => (currentDie ? findRun(grid.rows[currentY], currentX) : null),
        [grid, currentDie, currentX, currentY]
    )
    const currentSvgY = svgRow(currentY, rows)

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
        if (x < 0 || x >= cols || svgY < 0 || svgY >= rows) return null

        return { x, svgY }
    }, [cols, rows])

    // Click a dice to jump the selector to it
    const handleSvgClick = useCallback((e: MouseEvent<SVGSVGElement>) => {
        const cell = cellFromEvent(e)
        if (cell) {
            navigateTo(cell.x, gridRowFromSvg(cell.svgY, rows))
        }
    }, [cellFromEvent, rows, navigateTo])

    const handleSvgMouseMove = useCallback((e: MouseEvent<SVGSVGElement>) => {
        const cell = cellFromEvent(e)
        // Only update state when the hovered cell actually changes
        setHoverCell(prev =>
            prev?.x === cell?.x && prev?.svgY === cell?.svgY ? prev : cell
        )
    }, [cellFromEvent])

    const handleSvgMouseLeave = useCallback(() => setHoverCell(null), [])

    return (
        <div className="flex w-full h-full justify-center items-center" data-testid="build-viewer">
            <div className="w-full h-full flex items-center justify-center p-4">
                <div
                    ref={containerRef}
                    className="relative w-full h-full backdrop-blur-xl rounded-2xl border overflow-hidden"
                    style={{
                        backgroundColor: 'var(--glass-medium)',
                        borderColor: 'var(--border-glass)',
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

                            {/* Rectangle over the run of identical dice (behind the highlight; same size as it for a run of one) */}
                            {run && (
                                <rect
                                    x={run.start + 0.02}
                                    y={currentSvgY + 0.02}
                                    width={run.end - run.start + 1 - 0.04}
                                    height={1 - 0.04}
                                    fillOpacity="0.1"
                                    strokeWidth="0.06"
                                    strokeOpacity="1"
                                    rx="0.1"
                                    style={{
                                        fill: 'var(--accent-blue)',
                                        stroke: 'var(--accent-purple)',
                                        transition: `${HIGHLIGHT_TRANSITION}, width 0.5s cubic-bezier(0.4, 0, 0.2, 1)`,
                                        willChange: 'x, y, width'
                                    }}
                                />
                            )}

                            {/* Hover indicator - subtler version of the selection highlight */}
                            {hoverCell && !(hoverCell.x === currentX && hoverCell.svgY === currentSvgY) && (
                                <rect
                                    x={hoverCell.x + 0.02}
                                    y={hoverCell.svgY + 0.02}
                                    width={0.96}
                                    height={0.96}
                                                                        fillOpacity="0.08"
                                    strokeWidth="0.04"
                                    strokeOpacity="0.45"
                                    rx="0.1"
                                    style={{ fill: 'var(--pink)', stroke: 'var(--pink)', pointerEvents: 'none' }}
                                />
                            )}

                            {/* Animated highlight overlay (rendered on top) */}
                            <rect
                                x={currentX + 0.02}
                                y={currentSvgY + 0.02}
                                width={0.96}
                                height={0.96}
                                                                fillOpacity="0.2"
                                strokeWidth="0.06"
                                rx="0.1"
                                style={{
                                    fill: 'var(--pink)',
                                    stroke: 'var(--pink)',
                                    transition: HIGHLIGHT_TRANSITION,
                                    filter: 'drop-shadow(0 0 2px rgb(var(--pink-rgb)/0.8))',
                                    willChange: 'x, y'
                                }}
                            />

                            {run && <RunBadges run={run} current={current} rows={rows} />}
                        </svg>
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
                        <button onClick={zoomOut} disabled={!canZoomOut} className={zoomButtonClass} title="Zoom Out">
                            <Minus className="w-5 h-5" />
                        </button>
                        <button onClick={zoomIn} disabled={!canZoomIn} className={zoomButtonClass} title="Zoom In">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
})

export default BuildViewer
