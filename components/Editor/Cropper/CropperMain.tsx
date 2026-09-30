'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FixedCropper, FixedCropperRef, ImageRestriction } from 'react-advanced-cropper'
import 'react-advanced-cropper/dist/style.css'
import 'react-advanced-cropper/dist/themes/corners.css'
import styles from './Cropper.module.css'
import { devLog, devError } from '@/lib/utils/debug'
import { cropParamsEqual, DEFAULT_ASPECT_RATIO, type CropParams } from '@/core/dice'
import { useDocumentHistoryBatcher } from '@/features/editor/store/historyBatcher'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { aspectRatioOptions } from './CropperPanel'
import { setCropperHandle } from './cropperHandle'

interface CropperMainProps {
    windowSize: { width: number; height: number }
}

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
export default function CropperMain({
    windowSize
}: CropperMainProps) {
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

    const selectedOption = aspectRatioOptions.find(opt => opt.value === selectedRatio) || aspectRatioOptions[2]

    // Calculate stencil size
    const getStencilSize = useCallback(() => {
        if (typeof window === 'undefined') return { width: 0, height: 0 }

        // Adaptive sizing based on screen width
        const isMobile = windowSize.width < 1024

        // On mobile the cropper fills the screen, minus small shell padding
        // On desktop, we subtract sidebar (350) + gap (24) + padding (32)
        const sidebarOffset = isMobile ? 40 : (350 + 24 + 32)

        const availableWidth = Math.min(900, windowSize.width - sidebarOffset)
        // Mobile: step bar + bottom toolbar; desktop: header + stepper
        const verticalOffset = 180
        const containerHeight = Math.max(300, Math.min(800, windowSize.height - verticalOffset))

        const availableHeight = containerHeight - 32

        const maxWidth = availableWidth * 0.95 // Use slightly more space
        const maxHeight = availableHeight * 0.95

        const ratio = selectedOption.ratio || 1

        let width = maxWidth
        let height = width / ratio

        if (height > maxHeight) {
            height = maxHeight
            width = height * ratio
        }

        return { width, height }
    }, [windowSize, selectedOption])

    const stencilSize = getStencilSize()

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
            devError('Error reading crop coordinates:', error)
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
            devLog('[CROP] Synced rotation:', { from: current.rotation, to: crop.rotation })
        }
        const rotated = readCrop(cropper, crop.aspectRatio)
        if (rotated && !cropParamsEqual(rotated, crop)) {
            cropper.setCoordinates({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
            devLog('[CROP] Synced coordinates:', crop)
        }
    }, [crop, imageLoaded])

    // Panel rotate: through the widget, so the one history entry carries the rotated coordinates
    useEffect(() => {
        setCropperHandle({
            rotate: (degrees) => {
                cropperRef.current?.rotateImage(degrees)
                report(true)
            },
        })
        return () => setCropperHandle(null)
    }, [report])

    useEffect(() => cancelPendingReport, [cancelPendingReport])

    if (!imageUrl) return null

    return (
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
            backgroundWrapperProps={{
                scaleImage: { wheel: { ratio: 0.1 } }
            }}
            onReady={() => {
                devLog('Cropper onReady fired')
                setImageLoaded(true)
                // Refresh to ensure proper sizing; the first crop is reported by the change this triggers
                cropperRef.current?.refresh()
                scheduleUntrackedReport()
            }}
            onChange={handleChange}
            onInteractionStart={handleInteractionStart}
            onInteractionEnd={handleInteractionEnd}
        />
    )
}
