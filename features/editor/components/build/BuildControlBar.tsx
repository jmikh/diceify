'use client'

import { iconButton } from '../common/ui'
import BuildNavButtons from './BuildNavButtons'
import BuildPosition from './BuildPosition'
import BuildZoomButtons from './BuildZoomButtons'

/** Under the build canvas: die navigation with the current row/col in the middle, zoom on the right. */
export default function BuildControlBar() {
    return (
        <div className="h-20 flex-shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-5 px-6 border-t border-white/[0.06]">
            <BuildNavButtons className="col-start-2 flex items-center gap-2" buttonClassName="h-12 w-16">
                <BuildPosition className="h-12 mx-1" />
            </BuildNavButtons>
            <BuildZoomButtons className="justify-self-end flex items-center gap-1.5" buttonClassName={`${iconButton} w-10 h-10`} />
        </div>
    )
}
