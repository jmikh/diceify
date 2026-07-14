'use client'

import { useState } from 'react'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'

const rotatableDice = [
    { dice: 2 as const, glyph: '⚁', paramKey: 'rotate2' as const },
    { dice: 3 as const, glyph: '⚂', paramKey: 'rotate3' as const },
    { dice: 6 as const, glyph: '⚅', paramKey: 'rotate6' as const }
]

interface OrientationControlProps {
    /** Touch-friendly variant with taller buttons */
    large?: boolean
}

export default function OrientationControl({ large = false }: OrientationControlProps) {
    const params = useEditorStore(state => state.diceParams)
    const setDiceParams = useEditorStore(state => state.setDiceParams)

    // Cumulative rotation angles so every tap animates another 90°
    const getInitialRotation = (isRotated: boolean) => isRotated ? 0 : 90
    const [rotations, setRotations] = useState({
        dice2: getInitialRotation(params.rotate2),
        dice3: getInitialRotation(params.rotate3),
        dice6: getInitialRotation(params.rotate6)
    })

    const handleDiceRotation = (dice: 2 | 3 | 6, paramKey: 'rotate2' | 'rotate3' | 'rotate6') => {
        setRotations(prev => ({
            ...prev,
            [`dice${dice}`]: prev[`dice${dice}`] + 90
        }))
        setDiceParams({ [paramKey]: !params[paramKey] })
    }

    return (
        <div
            className="flex w-full rounded-lg overflow-hidden border"
            style={{
                backgroundColor: theme.colors.glass.light,
                borderColor: theme.colors.glass.border
            }}
        >
            {rotatableDice.map((option, index) => (
                <button
                    key={option.dice}
                    onClick={() => handleDiceRotation(option.dice, option.paramKey)}
                    className={`flex-1 ${large ? 'h-12' : 'h-10'} flex items-center justify-center transition-all hover:bg-white/10 relative group`}
                    style={{
                        borderRight: index < rotatableDice.length - 1 ? `1px solid ${theme.colors.glass.border}` : undefined
                    }}
                >
                    <span
                        className="inline-block transition-transform"
                        style={{
                            transform: `rotate(${rotations[`dice${option.dice}`]}deg)`,
                            transformOrigin: 'center',
                            transition: 'transform 0.3s ease',
                            color: theme.colors.text.secondary,
                            fontSize: '28px',
                            lineHeight: 1
                        }}
                    >
                        {option.glyph}
                    </span>
                    {/* Hover indicator */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, ${theme.colors.glow.pink}, transparent)`
                        }}
                    />
                </button>
            ))}
        </div>
    )
}
