'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { FixedCropper, FixedCropperRef, ImageRestriction } from 'react-advanced-cropper'
import 'react-advanced-cropper/dist/style.css'
import 'react-advanced-cropper/dist/themes/corners.css'
import styles from './Cropper.module.css'
import { rotatedBounds } from '@/lib/image/decode'
import { reportError } from '@/lib/report-error'
import { cropParamsEqual, DEFAULT_ASPECT_RATIO, reframeCrop, type CropParams } from '@/core/dice'
import { useElementSize } from '@/features/editor/hooks/useElementSize'
import { useDocumentHistoryBatcher } from '@/features/editor/store/historyBatcher'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { aspectRatioOptions } from './CropperPanel'
import { setCropperHandle } from './cropperHandle'
import { useWheelZoom } from './useWheelZoom'

// The widget reconciles in bursts (mount, ratio change, boundary refresh); one report per burst
const REPORT_DELAY_MS = 100

const round2 = (n: number) => Math.round(n * 100) / 100

/** The widget's crop box in the rotated image's space (what the dice pipeline consumes). */
function readCrop(cropper: FixedCropperRef, aspectRatio: CropParams['aspectRatio']): CropParams | null {
    const coordinates = cropper.getCoordinates()
    if (!coordinates) return null
    return {
        x: round2(coordinates.left),
        y: round2(coordinates.top),
        width: round2(coordinates.width),
        height: round2(coordinates.height),
        rotation: round2(cropper.getState()?.transforms?.rotate ?? 0),
        aspectRatio,
    }
}

/**
 * The crop widget. The document's `crop` is the source of truth: user gestures report into it as one history
 * entry each (`onInteractionStart/End`), while everything the widget does on its own (reconciling to the stencil
 * ratio, following an undo via the sync effect) is written back untracked, so it neither adds undo steps nor
 * drops the redo stack.
 */
export default function CropperMain() {
    const containerRef = useRef<HTMLDivElement>(null)
    const containerSize = useElementSize(containerRef)
    const imageUrl = useProjectStore(state => state.imageSrc)
    const crop = useDocumentStore(state => state.crop)
    const setCrop = useDocumentStore(state => state.setCrop)
    const { untracked } = useDocumentHistoryBatcher()

    // The crop is the single source for the preset and rotation; before the
    // first report (a few ms after mount) the defaults apply
    const selectedRatio = crop?.aspectRatio ?? DEFAULT_ASPECT_RATIO
    const cropRotation = crop?.rotation ?? 0

    const cropperRef = useRef<FixedCropperRef>(null)
    const [imageLoaded, setImageLoaded] = useState(false)
    const reportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const interactingRef = useRef(false)
    useWheelZoom(containerRef, cropperRef)

    const selectedOption = aspectRatioOptions.find(opt => opt.value === selectedRatio) || aspectRatioOptions[2]

    // The stencil: the selected ratio fitted into the canvas panel, with a margin around it
    const stencilSize = useMemo(() => {
        if (!containerSize) return { width: 0, height: 0 }
        const margin = containerSize.width < 480 ? 16 : 40
        const maxWidth = Math.max(0, containerSize.width - margin * 2)
        const maxHeight = Math.max(0, containerSize.height - margin * 2)
        const ratio = selectedOption.ratio || 1
        const width = Math.min(maxWidth, maxHeight * ratio)
        return { width, height: width / ratio }
    }, [containerSize, selectedOption])

    // Create default coordinates from saved params
    const defaultCoordinates = crop ? {
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height
    } : undefined

    const cancelPendingReport = useCallback(() => {
        if (reportTimerRef.current) {
            clearTimeout(reportTimerRef.current)
            reportTimerRef.current = null
        }
    }, [])

    // Write the widget's crop into the document. Tracked = a user gesture (one undo entry);
    // untracked = the widget catching up with props or the store.
    const report = useCallback((tracked: boolean) => {
        cancelPendingReport()
        const cropper = cropperRef.current
        if (!cropper) return
        try {
            const aspectRatio = useDocumentStore.getState().crop?.aspectRatio ?? DEFAULT_ASPECT_RATIO
            const next = readCrop(cropper, aspectRatio)
            if (!next) return
            if (tracked) setCrop(next)
            else untracked(() => setCrop(next))
        } catch (error) {
            reportError(error, { where: 'crop-read' })
        }
    }, [cancelPendingReport, setCrop, untracked])

    const scheduleUntrackedReport = useCallback(() => {
        cancelPendingReport()
        reportTimerRef.current = setTimeout(() => report(false), REPORT_DELAY_MS)
    }, [cancelPendingReport, report])

    // Every state change fires onChange; only the ones outside a gesture are the widget's own doing
    const handleChange = useCallback(() => {
        if (!interactingRef.current) scheduleUntrackedReport()
    }, [scheduleUntrackedReport])

    const handleInteractionStart = useCallback(() => {
        interactingRef.current = true
        cancelPendingReport()
    }, [cancelPendingReport])

    const handleInteractionEnd = useCallback(() => {
        interactingRef.current = false
        report(true)
    }, [report])

    // Store → widget: after undo/redo (or any external change) rotate and re-position the widget to match.
    // Its onChange then writes back whatever it could apply, untracked and within tolerance, so this settles.
    useEffect(() => {
        const cropper = cropperRef.current
        if (!cropper || !crop || !imageLoaded) return
        const current = readCrop(cropper, crop.aspectRatio)
        if (!current) return

        if (Math.abs(current.rotation - crop.rotation) > 0.01) {
            cropper.rotateImage(crop.rotation - current.rotation)
        }
        const rotated = readCrop(cropper, crop.aspectRatio)
        if (rotated && !cropParamsEqual(rotated, crop)) {
            cropper.setCoordinates({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
        }
    }, [crop, imageLoaded])

    // Panel rotate / zoom: through the widget, so the one history entry carries the resulting coordinates.
    // A new ratio is reframed here (the widget alone would zoom in on every switch) and reaches it via the sync effect.
    useEffect(() => {
        const command = (apply: (cropper: FixedCropperRef) => void) => {
            const cropper = cropperRef.current
            if (!cropper) return
            apply(cropper)
            report(true)
        }
        setCropperHandle({
            rotate: (degrees) => command(cropper => cropper.rotateImage(degrees)),
            zoom: (factor) => command(cropper => cropper.zoomImage(factor)),
            setAspectRatio: (aspectRatio) => {
                const cropper = cropperRef.current
                const state = cropper?.getState()
                const current = cropper && readCrop(cropper, aspectRatio)
                if (!state || !current) return
                cancelPendingReport()
                const { width, height } = state.imageSize
                setCrop(reframeCrop(current, aspectRatio, rotatedBounds(width, height, state.transforms.rotate)))
            },
        })
        return () => setCropperHandle(null)
    }, [report, cancelPendingReport, setCrop])

    useEffect(() => cancelPendingReport, [cancelPendingReport])

    return (
        <div ref={containerRef} className="w-full h-full">
            {imageUrl && containerSize && (
                <FixedCropper
                    ref={cropperRef}
                    src={imageUrl}
                    className={`h-full ${styles.cropper}`}
                    stencilProps={{
                        aspectRatio: selectedOption.ratio || undefined,
                        grid: true,
                        overlayClassName: styles.overlay,
                        handlers: false,
                        lines: true,
                        movable: false,
                        resizable: false,
                    }}
                    stencilSize={stencilSize}
                    defaultTransforms={{ rotate: cropRotation }}
                    defaultCoordinates={defaultCoordinates}
                    imageRestriction={ImageRestriction.stencil}
                    // Wheel zoom is ours (useWheelZoom); touch pinch stays the widget's
                    backgroundWrapperProps={{ scaleImage: { wheel: false } }}
                    onReady={() => {
                        setImageLoaded(true)
                        // Refresh to ensure proper sizing; the first crop is reported by the change this triggers
                        cropperRef.current?.refresh()
                        scheduleUntrackedReport()
                    }}
                    onChange={handleChange}
                    onInteractionStart={handleInteractionStart}
                    onInteractionEnd={handleInteractionEnd}
                />
            )}
        </div>
    )
}
