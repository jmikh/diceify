'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FixedCropper, FixedCropperRef, ImageRestriction, Coordinates } from 'react-advanced-cropper'
import 'react-advanced-cropper/dist/style.css'
import 'react-advanced-cropper/dist/themes/corners.css'
import styles from './Cropper.module.css'
import { devLog, devError } from '@/lib/utils/debug'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { aspectRatioOptions } from './CropperPanel'
import { AspectRatio } from '@/lib/types'

interface CropperMainProps {
    windowSize: { width: number; height: number }
}

export default function CropperMain({
    windowSize
}: CropperMainProps) {
    const imageUrl = useEditorStore(state => state.originalImage)
    const cropRotation = useEditorStore(state => state.cropRotation)
    const selectedRatio = useEditorStore(state => state.selectedRatio)

    // Store Actions
    const updateCrop = useEditorStore(state => state.updateCrop)

    // Store State
    const cropParams = useEditorStore(state => state.cropParams)

    // Local State
    const fixedCropperRef = useRef<FixedCropperRef>(null)
    const [imageLoaded, setImageLoaded] = useState(false)
    const cropChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Rotation synchronization
    const prevRotationRef = useRef(cropRotation)

    // Sync rotation from store to cropper
    useEffect(() => {
        const cropper = fixedCropperRef.current
        if (cropper && prevRotationRef.current !== cropRotation) {
            const delta = cropRotation - prevRotationRef.current
            cropper.rotateImage(delta)
            prevRotationRef.current = cropRotation
            devLog('[CROP] Synced rotation:', { delta, newRotation: cropRotation })
        }
    }, [cropRotation])

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
    const defaultCoordinates = cropParams ? {
        left: cropParams.x,
        top: cropParams.y,
        width: cropParams.width,
        height: cropParams.height
    } : undefined


    const performAutoCrop = useCallback(async () => {
        try {
            const cropper = fixedCropperRef.current
            if (!cropper) return

            const canvas = cropper.getCanvas({
                width: 2048,
                height: (!selectedOption.ratio) ? 2048 : 2048 / selectedOption.ratio,
            })

            if (canvas) {
                const coordinates = cropper.getCoordinates()
                const state = cropper.getState()
                const croppedImage = canvas.toDataURL('image/jpeg', 0.95)

                // Round to 2 decimal places to prevent floating point precision differences
                const cropData = {
                    x: Math.round((coordinates?.left || 0) * 100) / 100,
                    y: Math.round((coordinates?.top || 0) * 100) / 100,
                    width: Math.round((coordinates?.width || 0) * 100) / 100,
                    height: Math.round((coordinates?.height || 0) * 100) / 100,
                    rotation: Math.round((state?.transforms?.rotate || 0) * 100) / 100
                }

                updateCrop(croppedImage, cropData)
            }
        } catch (error) {
            devError('Error auto-cropping image:', error)
        }
    }, [selectedOption.ratio, updateCrop])

    const handleCropperChange = useCallback(() => {
        if (cropChangeTimeoutRef.current) {
            clearTimeout(cropChangeTimeoutRef.current)
        }
        cropChangeTimeoutRef.current = setTimeout(() => {
            performAutoCrop()
        }, 500)
    }, [performAutoCrop])

    // Auto-crop when image is ready or when aspect ratio changes
    useEffect(() => {
        if (imageLoaded) {
            const timeout = setTimeout(() => {
                performAutoCrop()
            }, 100)
            return () => clearTimeout(timeout)
        }
    }, [imageLoaded, selectedRatio, performAutoCrop])

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (cropChangeTimeoutRef.current) {
                clearTimeout(cropChangeTimeoutRef.current)
            }
        }
    }, [])

    if (!imageUrl) return null

    return (
        <FixedCropper
            ref={fixedCropperRef}
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

                if (fixedCropperRef.current) {
                    const state = fixedCropperRef.current.getState()
                    devLog('Cropper state on ready:', {
                        state: state,
                        coordinates: fixedCropperRef.current.getCoordinates()
                    })

                    // Refresh to ensure proper sizing
                    fixedCropperRef.current.refresh()
                }
            }}
            onChange={handleCropperChange}
        />
    )
}
