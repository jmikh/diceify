import Link from 'next/link'
import GuidePage, { EditorLink, SectionHeading } from '../GuidePage'
import { HOW_TO_GLUE } from '../data'

const S = Object.fromEntries(HOW_TO_GLUE.sections.map(s => [s.id, s]))

const ADHESIVES = [
    { name: 'PVA / wood glue', open: 'Minutes', cure: 'Overnight', clear: 'Yes, from white', cleanup: 'Water while wet', risk: 'Low. Weak on glossy plastic; dice can pop off if knocked' },
    { name: 'E6000-type (industrial craft glue)', open: 'A few minutes', cure: 'A day or more', clear: 'Yes', cleanup: 'Solvent; strong fumes, ventilate', risk: 'Low–medium. Strings and smears if over-applied' },
    { name: 'Two-part epoxy', open: '5–30 min by type', cure: 'Hours to a day', clear: 'Mostly; some yellow over time', cleanup: 'Solvent before cure, none after', risk: 'Medium. Mix small batches or it sets in the cup' },
    { name: 'Construction adhesive (Liquid Nails type)', open: '10–20 min', cure: 'A day', clear: 'No, but hidden under the dice', cleanup: 'Wipe before cure', risk: 'Low. Thick, so a bead can push dice up out of line' },
    { name: 'Resin flood coat over dry dice', open: 'Long', cure: 'A day or more', clear: 'Only if it stays bubble-free', cleanup: 'Hard; it goes everywhere', risk: 'High. Clouding or bubbles ruin the whole piece at once' },
]

export default function HowToGlue() {
    return (
        <GuidePage
            guide={HOW_TO_GLUE}
            lead={
                <>
                    Glue each die to a rigid board with an adhesive that grabs fast and dries clear, or lay the whole
                    piece out dry and pour a coat over it. We have done both. The pour is the one that went wrong.
                </>
            }
            cta={{
                heading: 'Build it row by row',
                text: 'The builder shows which die goes where, counts runs of identical dice, and remembers where you stopped.',
            }}
        >
            <SectionHeading section={S['short-version']} />
            <p>
                Use a stiff board (plywood or MDF) cut to the finished size. Pick one adhesive and test it on a
                scrap first. Build from one corner, one row at a time, following the pattern. Let each row set before
                the next. That is the whole method; the rest of this page is the detail behind each choice. If you
                are still choosing a photo or a grid, the <Link href="/dice-art">step-by-step dice art guide</Link>{' '}
                covers the steps before this one.
            </p>

            <SectionHeading section={S['adhesives']} />
            <p>
                All of these hold a plastic die to a wooden board. They differ in how long you have to adjust a die
                (open time), how long before the piece can be moved (cure), whether squeeze-out shows, and what
                happens when something goes wrong. The table is qualitative: read the label on the tube you buy.
            </p>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Adhesive</th>
                        <th scope="col">Open time</th>
                        <th scope="col">Cure</th>
                        <th scope="col">Dries clear</th>
                        <th scope="col">Cleanup</th>
                        <th scope="col">Risk</th>
                    </tr>
                </thead>
                <tbody>
                    {ADHESIVES.map(a => (
                        <tr key={a.name}>
                            <td>{a.name}</td>
                            <td>{a.open}</td>
                            <td>{a.cure}</td>
                            <td>{a.clear}</td>
                            <td>{a.cleanup}</td>
                            <td>{a.risk}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p>
                <strong>Wood glue</strong> is the easy start: cheap, no fumes, water cleanup, dries clear. Its weak
                point is the glossy plastic face of a die, so roughen the board, use enough glue, and do not plan to
                carry the finished piece down three flights of stairs face down.
            </p>
            <p>
                <strong>E6000-type glue</strong> and <strong>epoxy</strong> grip plastic properly and dry clear.
                Both need ventilation. Epoxy has a working-time clock from the moment you mix it, so mix a little at a
                time and keep going.
            </p>
            <p>
                <strong>Construction adhesive</strong> is what Jeremy used for his nieces' portraits. It is strong,
                forgiving and cheap per tube, and because it sits under the die, "dries beige" does not matter. Lay a
                thin bead, not a fat one, or the dice ride up on it and the row goes wavy.
            </p>

            <SectionHeading section={S['board']} />
            <p>
                The board has one job: stay flat under a few thousand dice for years. Plywood and MDF both do it.
                Canvas, foam board and cardboard do not; they bow, and a bowed board cracks glue lines along the
                bend.
            </p>
            <ul>
                <li>
                    <strong>Size:</strong> cut it to the finished grid size from the{' '}
                    <Link href="/dice-art/size-calculator">size calculator</Link>, or a little larger if you want a
                    border inside the frame. Measure a real row of your dice before cutting; batches differ.
                </li>
                <li>
                    <strong>Thickness:</strong> the bigger the piece, the stiffer the board must be. Small pieces are
                    fine on thin board. Large ones want thicker plywood, or thinner board with bracing behind it (see
                    below).
                </li>
                <li>
                    <strong>Surface:</strong> sand off any gloss so glue can bite. Consider painting the board the
                    colour of the dice that dominate the piece, so a hairline gap reads as shadow rather than bare wood.
                </li>
            </ul>

            <SectionHeading section={S['two-methods']} />
            <p>
                <strong>Glue as you go.</strong> Spread adhesive on a strip of the board, place a row of dice from
                the pattern, square them against a straight edge, move to the next row. Slower, but each row is
                checked and locked before the next, and a mistake costs one die, not a hundred. This is the method
                for a first build.
            </p>
            <p>
                <strong>Dry-lay first.</strong> Lay the whole picture out loose on a table, step back, fix what looks
                wrong, then fix the dice to the board. Jeremy did this: he laid every die out dry, then{' '}
                <Link href="/blog/jeremy-dice-portraits-nieces">transferred them row by row</Link> to his plywood with
                construction adhesive. You get to judge the whole image before it is permanent. The cost is handling
                every die twice, and a bumped table can undo an evening.
            </p>
            <p>
                A third way, lay dry and then pour a clear coat over the top, is faster still. It is also the one
                we would not repeat, for the reason below.
            </p>

            <SectionHeading section={S['resin']} />
            <p>
                The idea is tempting. Arrange all the dice on the board, then flood the surface with clear resin or
                glue so everything locks at once. No bead per die, no waiting per row.
            </p>
            <p>
                It went wrong on one of <Link href="/blog/why-i-built-diceify">our own builds</Link>. If the top layer
                is not transparent enough, or if it forms bubbles, it damages the whole piece at once rather than one
                die. There is no undo: the coat is on every die. If you still want a top coat, test it on a spare
                board of dice first and give it the full cure time before judging. Better yet, glue the dice down and
                leave the surface bare; the texture of real dice is most of the charm.
            </p>

            <SectionHeading section={S['bracing']} />
            <p>
                A sheet of plywood wide enough for a portrait will warp on its own over a season, and glue lines do
                not like that. Jeremy backed his plywood base with 2×4s to prevent warping before he glued a single
                die. A frame of battens around the back edge, or two across the middle, does the job; it also gives you
                something solid to screw hanging hardware into. Add the bracing before you glue a single die, while
                the board is still light enough to flip.
            </p>

            <SectionHeading section={S['materials']} />
            <ul>
                <li>
                    Black and white dice with pips, one batch per colour, counts from the generator plus spares.
                    See <Link href="/dice-art/buying-dice">which dice to buy</Link>.
                </li>
                <li>A plywood or MDF board cut to size, sanded, braced if large.</li>
                <li>One adhesive from the table, plus a scrap board to test it.</li>
                <li>A straight edge or a strip of wood screwed along one edge of the board as a fence.</li>
                <li>A damp cloth or the right solvent for the adhesive, before it sets.</li>
                <li>The pattern on a screen beside you: the <EditorLink>builder</EditorLink> tracks your position.</li>
            </ul>

            <SectionHeading section={S['row-by-row']} />
            <p>
                Start in a corner. The pattern's row 1 is the bottom row, so most people build from the bottom up
                and from one side, so every new die has two neighbours to sit against. Lay adhesive for one row.
                Place the dice in order, face up, with the pips rotated the way the pattern shows. Push the row
                against the fence with the straight edge. Wipe any squeeze-out. Then let it grab for a minute before
                you start the next row, or the whole line creeps.
            </p>
            <p>
                Keep a rhythm: the builder in Diceify highlights the die you are on and tells you how many identical
                dice come next, so you can place a run of six "black 6" dice without looking back at the screen for
                each one. Put the dice for the current row in a tray sorted by colour. Stop when you lose focus,
                not when the row ends; progress is saved where you left it. When you are ready,{' '}
                <EditorLink>start building</EditorLink> from row 1.
            </p>
            <div className="blog-note">
                <strong>Tip:</strong> Check the row count against the pattern every ten rows. A single missed die
                shifts everything after it one column over, and you want to find that at row 11, not row 48.
            </div>
        </GuidePage>
    )
}
