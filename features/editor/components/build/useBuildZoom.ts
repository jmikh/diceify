import { useEffect, useRef, type RefObject } from 'react'
import { create } from 'zustand'
import { useGesture } from '@use-gesture/react'

// Zoom level = number of dice shown horizontally.
const ZOOM = { initial: 8, min: 4, max: 20, step: 2 } as const

const clampZoom = (level: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, level))

// Shared by the viewer (reads it, pinch writes it) and the +/- buttons (BuildZoomButtons: under the canvas on desktop, on it on mobile).
const useBuildZoomStore = create<{ zoomLevel: number; setZoomLevel: (level: number) => void }>()(set => ({
    zoomLevel: ZOOM.initial,
    setZoomLevel: level => set({ zoomLevel: clampZoom(level) }),
}))

export const useBuildZoomLevel = () => useBuildZoomStore(state => state.zoomLevel)

/** +/- zoom for the build viewer. Zooming in shows fewer dice. */
export function useBuildZoom() {
    const zoomLevel = useBuildZoomLevel()
    const setZoomLevel = useBuildZoomStore(state => state.setZoomLevel)

    return {
        zoomIn: () => setZoomLevel(zoomLevel - ZOOM.step),
        zoomOut: () => setZoomLevel(zoomLevel + ZOOM.step),
        canZoomIn: zoomLevel > ZOOM.min,
        canZoomOut: zoomLevel < ZOOM.max,
    }
}

/** Pinch-to-zoom (touch) on `containerRef`: pinching out shows fewer dice = zooming in. */
export function useBuildPinchZoom(containerRef: RefObject<HTMLElement>) {
    // Quantized to ZOOM.step (like the buttons) so the viewBox animation
    // isn't re-triggered on every gesture frame.
    const pinchStartZoomRef = useRef<number>(ZOOM.initial)

    // Each viewer mount (entering the build step, switching project) starts at the default zoom
    useEffect(() => () => useBuildZoomStore.getState().setZoomLevel(ZOOM.initial), [])

    useGesture({
        onPinch: ({ first, movement: [scale] }) => {
            const { zoomLevel, setZoomLevel } = useBuildZoomStore.getState()
            if (first) pinchStartZoomRef.current = zoomLevel
            const next = clampZoom(Math.round(pinchStartZoomRef.current / scale / ZOOM.step) * ZOOM.step)
            if (next !== zoomLevel) setZoomLevel(next)
        }
    }, {
        target: containerRef,
        eventOptions: { passive: false }
    })
}
