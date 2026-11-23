'use client'

import { useState, useRef, useCallback, memo, type MouseEvent } from 'react'
import { gridRowFromSvg, svgRow, type DiceGrid } from '@/core/dice'
import { useBuildNavigation } from '@/features/editor/hooks/useBuildNavigation'
import { useBuildViewBox } from './useBuildViewBox'
import { useBuildWindow } from './useBuildWindow'
import { useBuildPinchZoom, useBuildZoomLevel } from './useBuildZoom'
import { useElementSize } from '@/features/editor/hooks/useElementSize'
import { DieHighlight, RunBadges, RunHighlight } from '@/components/BuildHighlight'
import UnplacedDiceMask, { UNPLACED_MASK_URL } from './UnplacedDiceMask'

interface BuildViewerProps {
    grid: DiceGrid
}

/** The zoomable dice viewer for the build step (+/- buttons: BuildZoomButtons). `grid` is never null: BuilderMain gates on it. */
const BuildViewer = memo(function BuildViewer({ grid }: BuildViewerProps) {
    // Arrow-key navigation lives in useEditorShortcuts (page level)
    const { current, run, navigateTo } = useBuildNavigation()
    const { x: currentX, y: currentY } = current
    const { width: cols, height: rows } = grid

    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    // View dimensions match the container's aspect ratio so the SVG fills it exactly
    const containerSize = useElementSize(containerRef)
    const aspect = containerSize ? containerSize.width / containerSize.height : null

    const zoomLevel = useBuildZoomLevel()
    useBuildPinchZoom(containerRef)
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
        <div className="w-full h-full" data-testid="build-viewer">
            <div className="w-full h-full">
                <div
                    ref={containerRef}
                    className="relative w-full h-full overflow-hidden"
                    style={{
                        // Floor keeps the builder usable on very small windows
                        minWidth: 240,
                        minHeight: 240,
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
                            {/* Render dice content; dice not placed yet are dimmed */}
                            <UnplacedDiceMask current={current} cols={cols} rows={rows} />
                            <g mask={UNPLACED_MASK_URL} dangerouslySetInnerHTML={{ __html: svgContent }} />

                            {run && <RunHighlight run={run} svgY={currentSvgY} />}

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

                            {/* Current die, on top */}
                            <DieHighlight x={currentX} svgY={currentSvgY} />

                            {run && <RunBadges run={run} current={current} rows={rows} />}
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
})

export default BuildViewer
