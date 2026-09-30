import { useEffect, useRef, type RefObject } from 'react'
import { animate } from 'motion'
import { computeViewBox, type GridPos, type ViewBox } from '@/core/dice'

interface Options {
    svgRef: RefObject<SVGSVGElement>
    current: GridPos
    cols: number
    rows: number
    zoomLevel: number
    /** Container width / height; `null` until the container has been measured. */
    aspect: number | null
    /** Called with the target view before panning there (materialize its dice first). */
    onView: (view: ViewBox) => void
}

const ANIMATION = { duration: 1, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
// Below this per-component delta the viewBox is applied directly instead of animated
const EPSILON = 0.01

const viewBoxClose = (a: ViewBox, b: ViewBox) =>
    Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON && Math.abs(a.w - b.w) < EPSILON && Math.abs(a.h - b.h) < EPSILON

const lerpViewBox = (from: ViewBox, to: ViewBox, t: number): ViewBox => ({
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    w: from.w + (to.w - from.w) * t,
    h: from.h + (to.h - from.h) * t,
})

/**
 * Keeps the `<svg viewBox>` on `current` (see `computeViewBox` for the pan rules)
 * and animates changes over one second. The attribute is written directly -
 * no React state, so pans never re-render the dice.
 */
export function useBuildViewBox({ svgRef, current, cols, rows, zoomLevel, aspect, onView }: Options) {
    // Depend on the coordinates, not the object, so unrelated re-renders never restart an animation
    const { x, y } = current
    // Where the view is right now; null until the first measured layout
    const viewRef = useRef<ViewBox | null>(null)
    // Where the view settled last time, for the pan-threshold rule
    const lastViewXRef = useRef<number | null>(null)

    useEffect(() => {
        // Wait for the container to be measured so the viewBox can match its aspect ratio
        if (aspect === null) return

        const apply = (view: ViewBox) => {
            viewRef.current = view
            svgRef.current?.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`)
        }

        const { viewBox: target, lastViewX } = computeViewBox({
            current: { x, y }, cols, rows, zoomLevel, aspect, lastViewX: lastViewXRef.current,
        })
        lastViewXRef.current = lastViewX

        // Make sure the dice for the target view exist in the DOM before panning there
        onView(target)

        const from = viewRef.current
        // First measured layout: nothing meaningful to animate from
        if (from === null || viewBoxClose(from, target)) {
            apply(target)
            return
        }

        // A new target (or unmount) stops the running animation where it is;
        // the next run animates on from there
        const animation = animate(0, 1, {
            ...ANIMATION,
            onUpdate: (t) => apply(lerpViewBox(from, target, t)),
            onComplete: () => apply(target),
        })
        return () => animation.stop()
    }, [svgRef, x, y, cols, rows, zoomLevel, aspect, onView])
}
