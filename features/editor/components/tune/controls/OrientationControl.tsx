'use client'

import { useDocumentStore } from '@/features/editor/store/useDocumentStore'

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
    const params = useDocumentStore(state => state.dice)
    const updateDice = useDocumentStore(state => state.updateDice)

    return (
        <div
            className="flex w-full rounded-lg overflow-hidden border"
            style={{
                backgroundColor: 'var(--glass-light)',
                borderColor: 'var(--border-glass)'
            }}
        >
            {rotatableDice.map((option, index) => (
                <button
                    key={option.dice}
                    onClick={() => updateDice({ [option.paramKey]: !params[option.paramKey] })}
                    className={`flex-1 ${large ? 'h-12' : 'h-10'} flex items-center justify-center transition-all hover:bg-white/10 relative group`}
                    style={{
                        borderRight: index < rotatableDice.length - 1 ? `1px solid var(--border-glass)` : undefined
                    }}
                >
                    {/* Orientation derived from the document so undo/redo animate the glyph too */}
                    <span
                        className="inline-block transition-transform"
                        style={{
                            transform: `rotate(${params[option.paramKey] ? 0 : 90}deg)`,
                            transformOrigin: 'center',
                            transition: 'transform 0.3s ease',
                            color: 'var(--text-secondary)',
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
                            background: `radial-gradient(circle at center, var(--pink-glow), transparent)`
                        }}
                    />
                </button>
            ))}
        </div>
    )
}
