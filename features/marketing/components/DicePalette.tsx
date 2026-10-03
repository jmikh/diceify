import DiceScale from './DiceScale'

export default function DicePalette() {
    return (
        <section className="dice-palette glass">
            <div className="dice-palette-text">
                <h2>6 faces. </h2><h2> 2 colors.</h2><h2>12 shades.</h2>
            </div>
            <DiceScale />
        </section>
    )
}
