'use client'

import { useEffect, type RefObject } from 'react'
import type { FixedCropperRef } from 'react-advanced-cropper'

// A burst of wheel events is one gesture (one undo entry); it ends after this much quiet
const GESTURE_END_MS = 300
// Zoom = 2^(-pixels × speed). Trackpad pinches report much smaller deltas than scrolls, hence the multiplier.
const WHEEL_SPEED = 0.0015
const PINCH_MULTIPLIER = 8
// WheelEvent.deltaMode: 0 = pixels, 1 = lines, 2 = pages
const PIXELS_PER_DELTA_MODE = [1, 16, 800]

/**
 * Scale factor for one wheel event, proportional to its delta. (The widget's own handler zooms a fixed 10% per
 * event, which a Mac trackpad fires dozens of times a second.)
 */
export function wheelZoomFactor({ deltaY, deltaMode, ctrlKey }: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey'>): number {
    const pixels = deltaY * (PIXELS_PER_DELTA_MODE[deltaMode] ?? 1)
    return 2 ** (-pixels * WHEEL_SPEED * (ctrlKey ? PINCH_MULTIPLIER : 1))
}

/** Wheel / trackpad zoom for the crop widget (its built-in wheel zoom must be off), reported as one interaction per gesture. */
export function useWheelZoom(containerRef: RefObject<HTMLElement>, cropperRef: RefObject<FixedCropperRef>) {
    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let endTimer: ReturnType<typeof setTimeout> | undefined

        const onWheel = (event: WheelEvent) => {
            // Also keeps a trackpad pinch (ctrl + wheel) from zooming the whole page
            event.preventDefault()
            const cropper = cropperRef.current
            // Transform centres are relative to the widget's boundary element
            const boundary = container.querySelector('.advanced-cropper__boundary')
            if (!cropper || !boundary || cropper.getTransitions().active) return
            const { left, top } = boundary.getBoundingClientRect()
            cropper.transformImage({
                scale: { factor: wheelZoomFactor(event), center: { left: event.clientX - left, top: event.clientY - top } },
            })
            clearTimeout(endTimer)
            endTimer = setTimeout(() => cropper.transformImageEnd(), GESTURE_END_MS)
        }

        container.addEventListener('wheel', onWheel, { passive: false })
        return () => {
            container.removeEventListener('wheel', onWheel)
            clearTimeout(endTimer)
        }
    }, [containerRef, cropperRef])
}
