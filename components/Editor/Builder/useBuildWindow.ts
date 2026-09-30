import { useCallback, useRef, useState } from 'react'
import {
    bufferedWindow,
    renderWindowSvg,
    visibleWindow,
    windowContains,
    type CellWindow,
    type DiceGrid,
    type ViewBox,
} from '@/core/dice'

/**
 * Selective generation: only materialize dice for the view rect plus a
 * buffer. Re-renders only when the view gets within one die of the rendered
 * window's edge; the buffer (one full viewport on each side) provides
 * hysteresis so single-step pans never touch the DOM.
 *
 * The rendered window is tagged with the grid it came from, so a new grid
 * is re-rendered on the next `ensureRendered` call.
 */
export function useBuildWindow(grid: DiceGrid) {
    const [svgContent, setSvgContent] = useState('')
    const renderedRef = useRef<{ grid: DiceGrid; win: CellWindow } | null>(null)

    const ensureRendered = useCallback((view: ViewBox) => {
        const need = visibleWindow(view, grid.width, grid.height)
        const rendered = renderedRef.current
        if (rendered && rendered.grid === grid && windowContains(rendered.win, need)) return

        const win = bufferedWindow(view, grid.width, grid.height)
        renderedRef.current = { grid, win }
        setSvgContent(renderWindowSvg(grid, win))
    }, [grid])

    return { svgContent, ensureRendered }
}
