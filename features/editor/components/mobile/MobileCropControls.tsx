'use client'

import { AspectRatioChips } from '@/features/editor/components/crop/CropperPanel'
import { MobileStepRow } from './MobileStepButtons'
import { mainRow } from './rows'

/** Mobile crop toolbar: the aspect-ratio chips then next. Rotate sits on the canvas (MobileEditor). */
export default function MobileCropControls() {
    return (
        <MobileStepRow>
            <AspectRatioChips className="flex-1 min-w-0 grid grid-cols-5 gap-2" chipClassName={mainRow} />
        </MobileStepRow>
    )
}
