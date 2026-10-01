'use client'

import type { ColorMode } from '@/core/dice'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'

const options: { mode: ColorMode; label: string; swatch: string }[] = [
    { mode: 'both', label: 'Mixed', swatch: 'linear-gradient(135deg, #fff 0 50%, #000 50% 100%)' },
    { mode: 'black', label: 'Black', swatch: '#000' },
    { mode: 'white', label: 'White', swatch: '#fff' },
]

interface ColorModeControlProps {
    /** Touch-friendly variant with taller buttons */
    large?: boolean
}

/** Which dice colours the art uses: a three-way segmented control. */
export default function ColorModeControl({ large = false }: ColorModeControlProps) {
    const colorMode = useDocumentStore(state => state.dice.colorMode)
    const updateDice = useDocumentStore(state => state.updateDice)

    return (
        <div role="group" aria-label="Dice colour" className="grid grid-cols-3 gap-1 p-1 rounded-[13px] bg-white/[0.04] border border-white/[0.08]">
            {options.map(option => {
                const on = colorMode === option.mode
                return (
                    <button
                        key={option.mode}
                        onClick={() => updateDice({ colorMode: option.mode })}
                        aria-pressed={on}
                        className={`${large ? 'h-12' : 'h-10'} flex items-center justify-center gap-2 rounded-[9px] text-[13px] font-medium transition-colors border ${on
                            ? 'border-accent-pink/60 bg-accent-pink/[0.14] text-white'
                            : 'border-transparent text-white/75 hover:text-white hover:bg-white/[0.05]'
                            }`}
                    >
                        <span aria-hidden className="w-3.5 h-3.5 rounded-[4px] border border-white/55 flex-shrink-0" style={{ background: option.swatch }} />
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
