import DiceScale from './DiceScale'

export default function DicePalette() {
    return (
        <section className="dice-palette glass">
            <div className="dice-palette-text">
                {/* One heading with meaning; the three lines keep the stacked look. */}
                <h2>
                    <span className="block text-base font-medium text-[var(--text-muted)] mb-2">How dice art works:</span>
                    <span className="block">6 faces ×</span>
                    <span className="block">2 colors =</span>
                    <span className="block">12 shades</span>
                </h2>
            </div>
            <DiceScale />
        </section>
    )
}
