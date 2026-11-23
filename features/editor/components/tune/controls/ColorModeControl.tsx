'use client'

import type { ColorMode } from '@/core/dice'
import { useEntitlements } from '@/features/account/useUser'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import ProBadge from '../../common/ProBadge'
import { choiceOff, choiceOn } from '../../common/ui'

const options: { mode: ColorMode; label: string; swatch: string }[] = [
    { mode: 'both', label: 'Mixed', swatch: 'linear-gradient(135deg, #fff 0 50%, #000 50% 100%)' },
    { mode: 'black', label: 'Black', swatch: '#000' },
    { mode: 'white', label: 'White', swatch: '#fff' },
]

interface ColorModeControlProps {
    /** Touch-friendly variant with taller buttons */
    large?: boolean
}

/** Which dice colours the art uses: a three-way segmented control; Mixed carries a PRO tag when the plan lacks it. */
export default function ColorModeControl({ large = false }: ColorModeControlProps) {
    const colorMode = useDocumentStore(state => state.dice.colorMode)
    const updateDice = useDocumentStore(state => state.updateDice)
    const { hasMixedDice } = useEntitlements()

    return (
        <div role="group" aria-label="Dice colour" className="grid grid-cols-3 gap-1.5">
            {options.map(option => {
                const on = colorMode === option.mode
                return (
                    <button
                        key={option.mode}
                        onClick={() => updateDice({ colorMode: option.mode })}
                        aria-pressed={on}
                        className={`${large ? 'h-12' : 'h-10'} relative flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors ${on ? choiceOn : choiceOff}`}
                    >
                        <span aria-hidden className="w-3.5 h-3.5 rounded-[4px] border border-white/55 flex-shrink-0" style={{ background: option.swatch }} />
                        {option.label}
                        {option.mode === 'both' && !hasMixedDice && <ProBadge className="absolute -top-2 -right-1" />}
                    </button>
                )
            })}
        </div>
    )
}
