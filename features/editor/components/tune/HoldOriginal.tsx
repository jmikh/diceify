'use client'

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { NO_CAPTURE_CLASS } from '@/lib/analytics'
import { drawRegion, encodeJpeg, loadImage } from '@/lib/image/decode'
import { reportError } from '@/lib/report-error'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { panel } from '../common/ui'

/** Long side of the cropped photo: sharp on a retina canvas. */
const PHOTO_LONG_SIDE = 1600

/** Object URL of the cropped photo (what the dice are made from); null until rendered. */
function useCroppedPhotoUrl(): string | null {
    const imageSrc = useProjectStore(state => state.imageSrc)
    const crop = useDocumentStore(state => state.crop)
    const [url, setUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!imageSrc || !crop) return
        let cancelled = false
        let objectUrl: string | null = null
        loadImage(imageSrc)
            .then(img => encodeJpeg(drawRegion(img, crop, PHOTO_LONG_SIDE), 0.9))
            .then(blob => {
                if (cancelled) return
                objectUrl = URL.createObjectURL(blob)
                setUrl(objectUrl)
            })
            .catch(error => reportError(error, { where: 'hold-original' }))
        return () => {
            cancelled = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
            setUrl(null)
        }
    }, [imageSrc, crop])

    return url
}

/**
 * Hold to compare: while the button is pressed (pointer or Space/Enter) the cropped photo covers the dice preview,
 * letterboxed like it (`object-contain` in the same box).
 */
export default function HoldOriginal() {
    const photoUrl = useCroppedPhotoUrl()
    const hasPreview = useDerivedStore(state => state.previewUrl !== null)
    const [holding, setHolding] = useState(false)

    if (!hasPreview) return null

    const show = () => setHolding(true)
    const hide = () => setHolding(false)
    const isHoldKey = (key: string) => key === ' ' || key === 'Enter'

    return (
        <>
            {holding && photoUrl && (
                <img
                    src={photoUrl}
                    alt="Original photo"
                    className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${NO_CAPTURE_CLASS}`}
                />
            )}
            <button
                type="button"
                aria-label="Hold to see original"
                disabled={!photoUrl}
                onPointerDown={e => {
                    // Captured: the photo stays up until release even when the finger slides off the button
                    e.currentTarget.setPointerCapture(e.pointerId)
                    show()
                }}
                onPointerUp={hide}
                onPointerCancel={hide}
                onLostPointerCapture={hide}
                onKeyDown={e => isHoldKey(e.key) && show()}
                onKeyUp={e => isHoldKey(e.key) && hide()}
                onBlur={hide}
                onContextMenu={e => e.preventDefault()}
                className={`absolute bottom-3 right-3 z-20 h-10 px-3 inline-flex items-center gap-2 rounded-xl text-[13px] font-medium select-none touch-none [-webkit-touch-callout:none] transition-colors disabled:opacity-35 ${panel} ${
                    holding ? 'text-white border-white/20' : 'text-white/85 hover:text-white hover:border-white/20'
                }`}
            >
                <Eye size={18} />
                <span className="hidden lg:inline">Hold to see original</span>
            </button>
        </>
    )
}
