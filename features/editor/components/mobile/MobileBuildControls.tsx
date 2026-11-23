'use client'

import { useBuildNavigation } from '@/features/editor/hooks/useBuildNavigation'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import BuildNavButtons from '../build/BuildNavButtons'
import { formatBuildPercent } from '@/components/BuildProgressBar'
import { LabeledValue } from '@/components/BuildPositionDisplay'
import { ColorSwatch } from '@/components/DiceStats'
import BuildPosition from '../build/BuildPosition'
import { useBuildTools } from '../build/BuildTools'
import ProBadge from '../common/ProBadge'
import { MobileStepRow } from './MobileStepButtons'

const stat = 'flex-auto min-w-0 px-1'
const swatch = 'w-2.5 h-2.5'

/** Mobile build toolbar: step back, the percentage built and the black/white counts (styled like the row/col), progress preview and blueprint in one card; the navigation buttons around the row/col below. Purchase dice is desktop only. */
export default function MobileBuildControls() {
    const { percent } = useBuildNavigation()
    const { blackCount, whiteCount } = useDerivedStore(state => state.stats)
    const { tools, modal } = useBuildTools()

    return (
        <>
            <MobileStepRow>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex divide-x divide-white/[0.08]">
                        <LabeledValue label="Built" value={formatBuildPercent(percent)} className={stat} />
                        <LabeledValue label={<><ColorSwatch color="black" className={swatch} />Black</>} value={blackCount.toLocaleString()} className={stat} />
                        <LabeledValue label={<><ColorSwatch color="white" className={swatch} />White</>} value={whiteCount.toLocaleString()} className={stat} />
                    </div>
                    {tools.filter(tool => tool.key !== 'purchase').map(tool => {
                        const Icon = tool.icon
                        return (
                            <button
                                key={tool.key}
                                onClick={tool.onSelect}
                                aria-label={tool.label}
                                title={tool.label}
                                className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-white active:bg-white/10"
                            >
                                <Icon size={18} />
                                {tool.pro && <ProBadge className="absolute -top-2 -right-1.5" />}
                            </button>
                        )
                    })}
                </div>
            </MobileStepRow>
            <BuildNavButtons className="flex gap-2" buttonClassName="h-14 flex-1 min-w-0">
                <BuildPosition className="h-14" />
            </BuildNavButtons>
            {modal}
        </>
    )
}
