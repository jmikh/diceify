'use client'

import { useCallback, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useBuildNavigation } from '@/features/editor/hooks/useBuildNavigation'
import { useDismiss } from '@/features/editor/hooks/useDismiss'
import BuildNavButtons from '../build/BuildNavButtons'
import { BuildProgressBar, formatBuildPercent } from '../build/BuildProgressBar'
import BuildPosition from '../build/BuildPosition'
import { useBuildTools } from '../build/BuildTools'
import { panel, popover } from '../common/ui'
import { MobileStepRow } from './MobileStepButtons'

/** Mobile build toolbar: step back, then progress and the tools behind "more" in a card; the navigation buttons around the row/col below. */
export default function MobileBuildControls() {
    const { percent } = useBuildNavigation()

    return (
        <>
            <MobileStepRow>
                <div className={`${panel} flex-1 min-w-0 rounded-[20px] px-4 flex items-center gap-3`}>
                    <div className="flex-1 min-w-0 flex items-center gap-3 text-[13px] tabular-nums">
                        <BuildProgressBar percent={percent} className="h-[5px]" />
                        <span className="text-white/75">{formatBuildPercent(percent)}</span>
                    </div>
                    <BuildMoreMenu />
                </div>
            </MobileStepRow>
            <BuildNavButtons className="flex gap-2" buttonClassName="h-14 flex-1 min-w-0">
                <BuildPosition className="h-14" />
            </BuildNavButtons>
        </>
    )
}

/** "More": progress preview, blueprint — opens upwards. */
function BuildMoreMenu() {
    const { tools, modal } = useBuildTools()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const close = useCallback(() => setOpen(false), [])
    useDismiss(ref, open, close)

    const itemClass = 'flex items-center gap-3 h-11 px-3 rounded-lg text-sm text-white/90 active:bg-white/10 text-left'

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                aria-label="More: progress, blueprint"
                aria-expanded={open}
                className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-white"
            >
                <MoreHorizontal size={18} />
            </button>
            {open && (
                <div className={`absolute bottom-full right-0 mb-2 z-50 w-60 p-1.5 rounded-xl flex flex-col ${popover}`}>
                    {tools.map(tool => {
                        const Icon = tool.icon
                        const select = () => {
                            tool.onSelect()
                            close()
                        }
                        return (
                            <button key={tool.key} onClick={select} className={itemClass}>
                                <Icon size={17} className="text-white/65" />
                                <span className="flex-1">{tool.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}
            {modal}
        </div>
    )
}
