'use client'

import { useEditorStore } from '@/lib/store/useEditorStore'
import MobileCropControls from './MobileCropControls'
import MobileTuneControls from './MobileTuneControls'
import MobileBuildControls from './MobileBuildControls'

/**
 * Bottom control area of the mobile editor - renders the step-specific
 * toolbar. The upload step has no bottom controls (the canvas area holds
 * the upload target).
 */
export default function MobileControls() {
    const step = useEditorStore(state => state.step)

    if (step === 'upload') return null

    return (
        <div
            className="flex-shrink-0"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            {step === 'crop' && <MobileCropControls />}
            {step === 'tune' && <MobileTuneControls />}
            {step === 'build' && <MobileBuildControls />}
        </div>
    )
}
