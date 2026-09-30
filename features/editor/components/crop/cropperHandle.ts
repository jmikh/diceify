// Commands the crop panels send to the mounted cropper widget. Rotation goes through the widget (not the
// store) so the history entry carries the rotated coordinates; undo then drives the widget from the store.

export interface CropperHandle {
    rotate: (degrees: number) => void
}

let handle: CropperHandle | null = null

/** Registered by CropperMain while mounted. */
export function setCropperHandle(next: CropperHandle | null): void {
    handle = next
}

export function rotateCrop(degrees: number): void {
    handle?.rotate(degrees)
}
