'use client'

import { RotateCw } from 'lucide-react'
import { AspectRatioChips, useCropControls } from '@/features/editor/components/crop/CropperPanel'
import { MobileStepRow } from './MobileStepButtons'
import { mainRow, toolRow } from './rows'

/** Mobile crop toolbar: the aspect-ratio chips then next, above rotate. */
export default function MobileCropControls() {
    const { rotate } = useCropControls()
    return (
        <>
            <MobileStepRow>
                <AspectRatioChips className="flex-1 min-w-0 grid grid-cols-5 gap-2" chipClassName={mainRow} />
            </MobileStepRow>
            <button
                onClick={rotate}
                className={`${toolRow} flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-medium text-white active:bg-white/[0.12]`}
            >
                <RotateCw size={18} />
                Rotate 90°
            </button>
        </>
    )
}
