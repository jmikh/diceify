'use client'

import { ChevronRight, Minus, Plus, RotateCw } from 'lucide-react'

import { DEFAULT_ASPECT_RATIO, type AspectRatio } from '@/core/dice'
import { rotateCrop, setCropAspectRatio, zoomCrop } from './cropperHandle'
import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { Inspector, InspectorSection } from '../common/Inspector'
import { choiceOff, choiceOn, ghostButton, primaryButton } from '../common/ui'

// One zoom-button click; gentler than a wheel notch
const ZOOM_STEP = 1.15

export interface AspectRatioOption {
    value: AspectRatio
    label: string
    ratio: number | null
    width: number
    height: number
    icon: JSX.Element
}

export const aspectRatioOptions: AspectRatioOption[] = [
    {
        value: '1:1',
        label: '1:1',
        ratio: 1,
        width: 1,
        height: 1,
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
        ),
    },
    {
        value: '3:4',
        label: '3:4',
        ratio: 3 / 4,
        width: 3,
        height: 4,
        icon: (
            <svg className="w-4 h-5" viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="28" rx="2" />
            </svg>
        ),
    },
    {
        value: '4:3',
        label: '4:3',
        ratio: 4 / 3,
        width: 4,
        height: 3,
        icon: (
            <svg className="w-5 h-4" viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="28" height="20" rx="2" />
            </svg>
        ),
    },
    {
        value: '2:3',
        label: '2:3',
        ratio: 2 / 3,
        width: 2,
        height: 3,
        icon: (
            <svg className="w-4 h-6" viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="32" rx="2" />
            </svg>
        ),
    },
    {
        value: '16:9',
        label: '16:9',
        ratio: 16 / 9,
        width: 16,
        height: 9,
        icon: (
            <svg className="w-6 h-4" viewBox="0 0 36 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="32" height="16" rx="2" />
            </svg>
        ),
    },
]

/** Ratio / rotation / zoom controls shared by the desktop panel and the mobile toolbar. */
export function useCropControls() {
    const crop = useDocumentStore(state => state.crop)
    return {
        selectedRatio: crop?.aspectRatio ?? DEFAULT_ASPECT_RATIO,
        setSelectedRatio: setCropAspectRatio,
        rotate: () => rotateCrop(90),
        zoomIn: () => zoomCrop(ZOOM_STEP),
        zoomOut: () => zoomCrop(1 / ZOOM_STEP),
    }
}

/** Ratio chips shared by the desktop inspector and the mobile toolbar. */
export function AspectRatioChips({ className = 'grid grid-cols-5 gap-1.5', chipClassName = 'h-16' }: { className?: string; chipClassName?: string }) {
    const { selectedRatio, setSelectedRatio } = useCropControls()
    return (
        <div role="group" aria-label="Aspect ratio" className={className}>
            {aspectRatioOptions.map(option => {
                const on = selectedRatio === option.value
                return (
                    <button
                        key={option.value}
                        onClick={() => setSelectedRatio(option.value)}
                        aria-pressed={on}
                        className={`${chipClassName} flex flex-col items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors ${on ? choiceOn : choiceOff}`}
                    >
                        <span className={on ? 'text-accent-pink-light' : 'text-white/70'}>{option.icon}</span>
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

/** Desktop inspector for the crop step. */
export default function CropperPanel() {
    const { rotate, zoomIn, zoomOut } = useCropControls()
    // Progress invalidation is handled centrally: enterBuild() compares the
    // current params against the baseline the progress was built on
    const { canGoNext, goNext } = useStepNavigation()

    return (
        <Inspector
            title="Crop"
            description="Drag to frame your subject, scroll or pinch to zoom. Close-up portraits work better than full-body shots."
            footer={
                <button onClick={goNext} disabled={!canGoNext} className={`${primaryButton} h-12 flex-1 text-[15px]`}>
                    Continue to Tune
                    <ChevronRight size={18} />
                </button>
            }
        >
            <InspectorSection label="Aspect ratio">
                <AspectRatioChips />
            </InspectorSection>
            <div className="flex gap-1.5">
                <button onClick={zoomOut} aria-label="Zoom out" title="Zoom out" className={`${ghostButton} h-12 flex-1 rounded-xl`}>
                    <Minus size={17} />
                </button>
                <button onClick={zoomIn} aria-label="Zoom in" title="Zoom in" className={`${ghostButton} h-12 flex-1 rounded-xl`}>
                    <Plus size={17} />
                </button>
                <button onClick={rotate} className={`${ghostButton} h-12 flex-[2] rounded-xl text-sm`}>
                    <RotateCw size={17} />
                    Rotate 90°
                </button>
            </div>
        </Inspector>
    )
}
