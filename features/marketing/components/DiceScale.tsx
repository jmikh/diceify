import { THRESHOLDS } from '@/core/dice'
import DieFace from './DieFace'

// The twelve shades of black + white mode, dark → light (THRESHOLDS lists them brightest first).
const SHADES = [...THRESHOLDS.both].reverse()
const BLACK_SHADES = SHADES.filter(s => s.color === 'black').length

interface DiceScaleProps {
    /** Bracket the black-dice and white-dice halves under the dice. */
    showColorGroups?: boolean
}

/** The twelve dice of black + white mode, darkest to lightest, between Dark/Light labels. */
export default function DiceScale({ showColorGroups = false }: DiceScaleProps) {
    return (
        <div
            className="dice-palette-scale"
            role="img"
            aria-label="Twelve dice from darkest to lightest: black dice showing 1 to 6, then white dice showing 6 to 1"
        >
            <span className="dice-palette-label dice-palette-label--dark">Dark</span>
            <div className="dice-palette-dice">
                {SHADES.map(({ face, color }) => (
                    <DieFace key={`${color}-${face}`} face={face} color={color} className="dice-palette-die" />
                ))}
                {showColorGroups && (
                    <>
                        <span className="dice-palette-group" style={{ gridColumn: `1 / ${BLACK_SHADES + 1}` }}>
                            Black dice, 1 → 6
                        </span>
                        <span className="dice-palette-group" style={{ gridColumn: `${BLACK_SHADES + 1} / -1` }}>
                            White dice, 6 → 1
                        </span>
                    </>
                )}
            </div>
            <span className="dice-palette-label dice-palette-label--light">Light</span>
        </div>
    )
}
