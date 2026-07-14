'use client'

import { ColorMode } from '@/lib/types'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'

const options: { mode: ColorMode; tooltip: string; swatch: JSX.Element }[] = [
    {
        mode: 'both',
        tooltip: 'Mixed',
        swatch: (
            // Diagonally split square
            <svg width="18" height="18" viewBox="0 0 18 18" className="relative z-10">
                <path d="M1 1 L17 17 L17 1 Z" fill="white" />
                <path d="M1 1 L1 17 L17 17 Z" fill="black" />
                <rect x="0.5" y="0.5" width="17" height="17" fill="none" stroke="white" strokeWidth="1" />
            </svg>
        )
    },
    {
        mode: 'black',
        tooltip: 'Black',
        swatch: <div className="w-4 h-4 rounded-sm border relative z-10" style={{ backgroundColor: 'black', borderColor: 'white' }} />
    },
    {
        mode: 'white',
        tooltip: 'White',
        swatch: <div className="w-4 h-4 rounded-sm border relative z-10" style={{ backgroundColor: 'white', borderColor: 'white' }} />
    }
]

interface ColorModeControlProps {
    /** Touch-friendly variant with taller buttons */
    large?: boolean
}

export default function ColorModeControl({ large = false }: ColorModeControlProps) {
    const colorMode = useEditorStore(state => state.diceParams.colorMode)
    const setDiceParams = useEditorStore(state => state.setDiceParams)

    return (
        <div
            className="flex w-full rounded-lg overflow-hidden border"
            style={{
                backgroundColor: theme.colors.glass.light,
                borderColor: theme.colors.glass.border
            }}
        >
            {options.map((option, index) => (
                <button
                    key={option.mode}
                    onClick={() => setDiceParams({ colorMode: option.mode })}
                    // Round the outer corners of the edge buttons so the inset
                    // selection ring follows the container's rounded corners
                    className={`flex-1 ${large ? 'h-12' : 'h-10'} flex items-center justify-center transition-all relative group ${index === 0 ? 'rounded-l-lg' : ''} ${index === options.length - 1 ? 'rounded-r-lg' : ''}`}
                    style={{
                        boxShadow: colorMode === option.mode ? `inset 0 0 0 2px ${theme.colors.accent.pink}` : 'none',
                        backgroundColor: 'transparent',
                        borderRight: index < options.length - 1 ? `1px solid ${theme.colors.glass.border}` : undefined
                    }}
                >
                    {option.swatch}
                    {/* Hover indicator */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, ${theme.colors.glow.pink}, transparent)`
                        }}
                    />
                    {/* Tooltip */}
                    <div
                        className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                        style={{ backgroundColor: 'rgba(10, 0, 20, 0.95)', color: 'white' }}
                    >
                        {option.tooltip}
                    </div>
                </button>
            ))}
        </div>
    )
}
