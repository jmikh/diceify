import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useGesture } from '@use-gesture/react'

// Zoom level = number of dice shown horizontally.
const ZOOM = { initial: 8, min: 4, max: 20, step: 2 } as const

const clampZoom = (level: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, level))

/** Zoom level for the build viewer: +/- buttons and pinch-to-zoom on `containerRef`. */
export function useBuildZoom(containerRef: RefObject<HTMLElement>) {
    const [zoomLevel, setZoomLevel] = useState<number>(ZOOM.initial)

    // Zooming in shows fewer dice
    const zoomIn = useCallback(() => setZoomLevel(level => clampZoom(level - ZOOM.step)), [])
    const zoomOut = useCallback(() => setZoomLevel(level => clampZoom(level + ZOOM.step)), [])

    // Pinch-to-zoom (touch): pinching out shows fewer dice = zooming in.
    // Quantized to ZOOM.step (like the buttons) so the viewBox animation
    // isn't re-triggered on every gesture frame.
    const zoomLevelRef = useRef(zoomLevel)
    useEffect(() => {
        zoomLevelRef.current = zoomLevel
    }, [zoomLevel])
    const pinchStartZoomRef = useRef(zoomLevel)

    useGesture({
        onPinch: ({ first, movement: [scale] }) => {
            if (first) pinchStartZoomRef.current = zoomLevelRef.current
            const target = Math.round(pinchStartZoomRef.current / scale / ZOOM.step) * ZOOM.step
            const next = clampZoom(target)
            if (next !== zoomLevelRef.current) setZoomLevel(next)
        }
    }, {
        target: containerRef,
        eventOptions: { passive: false }
    })

    return {
        zoomLevel,
        zoomIn,
        zoomOut,
        canZoomIn: zoomLevel > ZOOM.min,
        canZoomOut: zoomLevel < ZOOM.max,
    }
}
