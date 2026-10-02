// Commands the crop panels send to the mounted cropper widget. Rotation, zoom and the ratio preset go through the
// widget (not the store) so the history entry carries the resulting coordinates; undo then drives the widget from
// the store.

import type { AspectRatio } from '@/core/dice'

export interface CropperHandle {
    rotate: (degrees: number) => void
    /** > 1 zooms in, < 1 out. */
    zoom: (factor: number) => void
    setAspectRatio: (aspectRatio: AspectRatio) => void
}

let handle: CropperHandle | null = null

/** Registered by CropperMain while mounted. */
export function setCropperHandle(next: CropperHandle | null): void {
    handle = next
}

export function rotateCrop(degrees: number): void {
    handle?.rotate(degrees)
}

export function zoomCrop(factor: number): void {
    handle?.zoom(factor)
}

export function setCropAspectRatio(aspectRatio: AspectRatio): void {
    handle?.setAspectRatio(aspectRatio)
}
