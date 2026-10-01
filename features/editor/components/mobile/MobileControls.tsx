'use client'

import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import MobileCropControls from './MobileCropControls'
import MobileTuneControls from './MobileTuneControls'
import MobileBuildControls from './MobileBuildControls'

/** The step-specific controls of the mobile editor, under the stage: each step renders a main row and a tool row. */
export default function MobileControls() {
    const step = useEditorUiStore(state => state.step)

    return (
        <div className="flex flex-col gap-2.5">
            {step === 'crop' && <MobileCropControls />}
            {step === 'tune' && <MobileTuneControls />}
            {step === 'build' && <MobileBuildControls />}
        </div>
    )
}
