'use client'

import { Minus, Plus } from 'lucide-react'
import { useBuildZoom } from './useBuildZoom'

interface BuildZoomButtonsProps {
    /** Layout of the pair. */
    className: string
    /** Look and size of each button. */
    buttonClassName: string
}

/** Zoom out · zoom in for the build viewer (desktop: under the canvas; mobile: on it). */
export default function BuildZoomButtons({ className, buttonClassName }: BuildZoomButtonsProps) {
    const { zoomIn, zoomOut, canZoomIn, canZoomOut } = useBuildZoom()
    return (
        <div className={className}>
            <button onClick={zoomOut} disabled={!canZoomOut} className={buttonClassName} title="Zoom out" aria-label="Zoom out">
                <Minus size={16} />
            </button>
            <button onClick={zoomIn} disabled={!canZoomIn} className={buttonClassName} title="Zoom in" aria-label="Zoom in">
                <Plus size={16} />
            </button>
        </div>
    )
}
