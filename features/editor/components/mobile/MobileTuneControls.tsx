'use client'

import { useState } from 'react'
import { BarChart3, Palette, RotateCw, LucideIcon } from 'lucide-react'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import DiceStatsCard from '@/features/editor/components/tune/DiceStatsCard'
import ColorModeControl from '@/features/editor/components/tune/controls/ColorModeControl'
import OrientationControl from '@/features/editor/components/tune/controls/OrientationControl'
import ParamSlider from '@/features/editor/components/tune/controls/ParamSlider'
import { tunerSliders } from '@/features/editor/components/tune/controls/sliderConfigs'

type ToolKey = 'stats' | 'color' | 'orientation' | 'numRows' | 'contrast' | 'gamma' | 'edgeSharpening'

const tools: { key: ToolKey; icon: LucideIcon; label: string }[] = [
    { key: 'stats', icon: BarChart3, label: 'Stats' },
    { key: 'color', icon: Palette, label: 'Color' },
    { key: 'orientation', icon: RotateCw, label: 'Dice' },
    { key: 'numRows', icon: tunerSliders[0].icon, label: 'Rows' },
    { key: 'contrast', icon: tunerSliders[1].icon, label: 'Contrast' },
    { key: 'gamma', icon: tunerSliders[2].icon, label: 'Bright' },
    { key: 'edgeSharpening', icon: tunerSliders[3].icon, label: 'Sharpen' },
]

/**
 * Mobile tune toolbar: a horizontal icon strip in the thumb zone; tapping
 * a tool shows just that control above the strip so the dice preview stays
 * visible while adjusting.
 */
export default function MobileTuneControls() {
    const params = useDocumentStore(state => state.dice)
    const updateDice = useDocumentStore(state => state.updateDice)

    const [activeTool, setActiveTool] = useState<ToolKey | null>('numRows')

    const activeSlider = tunerSliders.find(s => s.key === activeTool)

    return (
        <div className="bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-3 pt-3 pb-1.5">
            {/* Active control - fixed height so the toolbar doesn't jump between tools */}
            {activeTool && (
                <div className="h-16 mb-2 px-1 flex flex-col justify-center">
                    {activeTool === 'stats' && <DiceStatsCard compact />}
                    {activeTool === 'color' && <ColorModeControl large />}
                    {activeTool === 'orientation' && <OrientationControl large />}
                    {activeSlider && (
                        <ParamSlider
                            large
                            icon={activeSlider.icon}
                            label={activeSlider.label}
                            min={activeSlider.min}
                            max={activeSlider.max}
                            step={activeSlider.step}
                            value={params[activeSlider.key]}
                            onChange={(value) => updateDice({ [activeSlider.key]: value })}
                            formatValue={activeSlider.formatValue}
                        />
                    )}
                </div>
            )}

            {/* Tool strip */}
            <div
                className="flex items-stretch gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }}
            >
                {tools.map(tool => {
                    const isActive = activeTool === tool.key
                    const Icon = tool.icon
                    return (
                        <button
                            key={tool.key}
                            onClick={() => setActiveTool(isActive ? null : tool.key)}
                            className={`flex flex-col items-center justify-center gap-1 min-w-[3.25rem] flex-1 py-2 rounded-xl transition-colors ${isActive
                                ? 'bg-accent-pink/15 text-accent-pink-light'
                                : 'text-white/50 active:bg-white/10'
                                }`}
                        >
                            <Icon size={18} />
                            <span className="text-[9px] font-medium uppercase tracking-wide">{tool.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
