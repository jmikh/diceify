'use client'

import { useState, type ReactNode } from 'react'
import ColorModeControl from '@/features/editor/components/tune/controls/ColorModeControl'
import OrientationControl from '@/features/editor/components/tune/controls/OrientationControl'
import { tunerSliders, type TunerSliderConfig } from '@/features/editor/components/tune/controls/sliderConfigs'
import { TunerSlider } from '@/features/editor/components/tune/TunerPanel'
import DieIcon from '../common/DieIcon'
import { choiceOn, panel } from '../common/ui'
import { MobileStepRow } from './MobileStepButtons'
import { toolRow } from './rows'

type ToolKey = TunerSliderConfig['key'] | 'color' | 'orientation'

const tools: { key: ToolKey; label: string; icon: ReactNode }[] = [
    ...tunerSliders.map(config => {
        const Icon = config.icon
        return { key: config.key, label: config.shortLabel, icon: <Icon size={18} /> }
    }),
    {
        key: 'color',
        label: 'Color',
        icon: <span aria-hidden className="w-4 h-4 rounded-[4px] border border-white/55" style={{ background: 'linear-gradient(135deg, #fff 0 50%, #000 50% 100%)' }} />,
    },
    { key: 'orientation', label: 'Rotate', icon: <DieIcon face={6} size={20} /> },
]

/**
 * Mobile tune toolbar: one control at a time in a card (between step back/next) above a row of tool tabs, so the
 * preview keeps the screen. The active tab names the control, so the card has no heading.
 */
export default function MobileTuneControls() {
    const [active, setActive] = useState<ToolKey>('numRows')
    const slider = tunerSliders.find(s => s.key === active)

    return (
        <>
            <MobileStepRow>
                <div className={`${panel} flex-1 min-w-0 rounded-[20px] px-4 flex flex-col justify-center`}>
                    {slider && <TunerSlider config={slider} large />}
                    {active === 'color' && <ColorModeControl large />}
                    {active === 'orientation' && <OrientationControl large />}
                </div>
            </MobileStepRow>
            <div role="group" aria-label="Tune tools" className="grid grid-cols-6 gap-1">
                {tools.map(tool => {
                    const on = tool.key === active
                    return (
                        <button
                            key={tool.key}
                            onClick={() => setActive(tool.key)}
                            aria-pressed={on}
                            className={`${toolRow} flex flex-col items-center justify-center gap-1.5 rounded-[14px] text-[11px] font-medium transition-colors ${on ? choiceOn : 'border border-transparent text-white/70 active:bg-white/[0.06]'}`}
                        >
                            {tool.icon}
                            {tool.label}
                        </button>
                    )
                })}
            </div>
        </>
    )
}
