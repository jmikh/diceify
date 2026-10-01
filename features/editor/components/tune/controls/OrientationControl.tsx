'use client'

import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import DieIcon from '../../common/DieIcon'

const rotatableDice = [
    { face: 2 as const, paramKey: 'rotate2' as const },
    { face: 3 as const, paramKey: 'rotate3' as const },
    { face: 6 as const, paramKey: 'rotate6' as const },
]

interface OrientationControlProps {
    /** Touch-friendly variant with taller buttons */
    large?: boolean
}

/** Toggles that turn the pips of the 2, 3 and 6 faces by 90°; each icon shows the face as it will be drawn. */
export default function OrientationControl({ large = false }: OrientationControlProps) {
    const params = useDocumentStore(state => state.dice)
    const updateDice = useDocumentStore(state => state.updateDice)

    return (
        <div role="group" aria-label="Dice orientation" className="grid grid-cols-3 gap-1.5">
            {rotatableDice.map(option => {
                const rotated = params[option.paramKey]
                return (
                    <button
                        key={option.face}
                        onClick={() => updateDice({ [option.paramKey]: !rotated })}
                        aria-pressed={rotated}
                        aria-label={`Rotate the ${option.face} faces 90°`}
                        className={`${large ? 'h-14' : 'h-12'} flex items-center justify-center rounded-xl border transition-colors ${rotated
                            ? 'border-accent-pink/60 bg-accent-pink/[0.14] text-white'
                            : 'border-white/[0.08] bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white'
                            }`}
                    >
                        <DieIcon face={option.face} rotated={rotated} size={large ? 30 : 26} />
                    </button>
                )
            })}
        </div>
    )
}
