import { THRESHOLDS } from '@/core/dice'
import DieFace from './DieFace'

// The twelve shades of black + white mode, dark → light (THRESHOLDS lists them brightest first).
const SHADES = [...THRESHOLDS.both].reverse()

export default function DicePalette() {
    return (
        <section className="dice-palette glass">
            <div className="dice-palette-text">
                <h2>6 faces. </h2><h2> 2 colors.</h2><h2>12 shades.</h2>
            </div>
            <div className="dice-palette-scale">
                <span className="dice-palette-label dice-palette-label--dark">Dark</span>
                <div className="dice-palette-dice">
                    {SHADES.map(({ face, color }) => (
                        <DieFace key={`${color}-${face}`} face={face} color={color} className="dice-palette-die" />
                    ))}
                </div>
                <span className="dice-palette-label dice-palette-label--light">Light</span>
                <p className="dice-palette-caption">Every photo is remapped onto the only palette a die has.</p>
            </div>
        </section>
    )
}
