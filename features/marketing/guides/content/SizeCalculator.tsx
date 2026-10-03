import Link from 'next/link'
import GuidePage, { EditorLink, SectionHeading } from '../GuidePage'
import { SIZE_CALCULATOR } from '../data'
import {
    DENSITY_SIZES_MM, DIE_SIZES_MM, RATIO_INFO, ROW_BOUNDS, dicePerFoot, dicePerSquareFoot, dicePerSquareMetre,
    formatCount, gridFor, sizeCm, sizeIn, sizeTable,
} from '../size'

const S = Object.fromEntries(SIZE_CALCULATOR.sections.map(s => [s.id, s]))

const example = gridFor('1:1', 50)
const tall = gridFor('3:4', 60)
const wide = gridFor('16:9', 40)

export default function SizeCalculator() {
    return (
        <GuidePage
            guide={SIZE_CALCULATOR}
            lead={
                <>
                    A dice portrait is columns × rows dice, and each die adds its own width to the piece. A{' '}
                    {example.cols}×{example.rows} grid is {formatCount(example.dice)} dice and {sizeCm(example, 16)}{' '}
                    ({sizeIn(example, 16)}) with 16 mm dice. The tables below cover every grid the Diceify editor can make.
                </>
            }
        >
            <SectionHeading section={S['quick-answer']} />
            <p>
                Two multiplications answer both questions. <strong>Dice</strong> = columns × rows.{' '}
                <strong>Size</strong> = dice per side × die size. So a {example.cols}×{example.rows} square is{' '}
                {formatCount(example.dice)} dice, and at 16 mm per die it is {sizeCm(example, 16)} before the frame.
                Swap in 12 mm dice and the same pattern shrinks to {sizeCm(example, 12)}.
            </p>
            <p>
                If you are new to all this, start with the{' '}
                <Link href="/dice-art">complete dice art guide</Link>. It explains why a portrait needs both black
                and white dice and how the pattern gets made. This page is only about numbers.
            </p>

            <SectionHeading section={S['how-the-math-works']} />
            <p>
                In the Diceify editor you choose the number of <strong>rows</strong>, from {ROW_BOUNDS.min} to{' '}
                {ROW_BOUNDS.max}. The columns follow the shape of your crop: columns = rows × (width ÷ height),
                rounded to the nearest whole die. A square crop gives as many columns as rows. A 3:4 portrait crop at{' '}
                {tall.rows} rows gives {tall.cols} columns, so {formatCount(tall.dice)} dice. A 16:9 crop at {wide.rows}{' '}
                rows gives {wide.cols} columns, so {formatCount(wide.dice)} dice.
            </p>
            <p>
                The sizes assume dice laid edge to edge with no gaps. Real dice have slightly rounded corners, so a
                tight build comes out a hair under the table. Add your frame or board edge on top. All sizes are
                rounded to whole centimetres and inches.
            </p>
            <p>
                Why rows and not columns? Because the height of a face is what you look at. Pick the rows that give
                a face enough detail, and the width takes care of itself. The editor prints the grid as columns ×
                rows under the preview (for example 45×60), with the dice count beside it, so you never have to do
                this sum by hand. The tables are here for planning before you upload, and for checking a board or a
                frame against a grid you already have.
            </p>
            <p>
                Die size is the other half. Sixteen millimetres is the standard game die and the one most bulk bags
                contain. Twelve millimetres gives the same pattern at three-quarters of the width, and 10 mm at
                five-eighths. Nothing else changes: the dice count, the pattern and the build time are the same for
                any die size. Only the finished size and the weight move.
            </p>

            <SectionHeading section={S['size-tables']} />
            <p>
                One table per crop ratio, in the ratios the editor offers. Columns are what the editor will produce
                for that row count. Sizes are width × height of the dice alone.
            </p>
            {RATIO_INFO.map(({ aspect, name, orientation }) => (
                <div key={aspect}>
                    <h3 id={`ratio-${aspect.replace(':', '-')}`}>{name} ({aspect}{orientation === 'square' ? '' : `, ${orientation}`})</h3>
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Rows</th>
                                <th scope="col">Columns</th>
                                <th scope="col">Dice</th>
                                {DIE_SIZES_MM.map(mm => <th key={mm} scope="col">{mm} mm dice</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {sizeTable(aspect).map(g => (
                                <tr key={g.rows}>
                                    <td>{g.rows}</td>
                                    <td>{g.cols}</td>
                                    <td>{formatCount(g.dice)}</td>
                                    {DIE_SIZES_MM.map(mm => (
                                        <td key={mm}>{sizeCm(g, mm)}<br />{sizeIn(g, mm)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
            <p>
                Need a row count that is not in the table? Multiply yourself: columns × die size for the width, rows
                × die size for the height, both in millimetres. Or set the rows in the{' '}
                <EditorLink>editor</EditorLink> and read the grid size and dice count off the screen.
            </p>

            <SectionHeading section={S['dice-per-square-foot']} />
            <p>
                This is the number to use when you start from the wall, not the photo. A foot is 304.8 mm, so a
                16 mm die goes {dicePerFoot(16)} times along a foot, and a square foot holds{' '}
                {dicePerSquareFoot(16) }
                {' '}dice. Smaller dice pack in fast: the count grows with the square of the size change.
            </p>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Die size</th>
                        <th scope="col">Dice per foot</th>
                        <th scope="col">Dice per square foot</th>
                        <th scope="col">Dice per square metre</th>
                    </tr>
                </thead>
                <tbody>
                    {DENSITY_SIZES_MM.map(mm => (
                        <tr key={mm}>
                            <td>{mm} mm</td>
                            <td>{dicePerFoot(mm)}</td>
                            <td>{formatCount(dicePerSquareFoot(mm))}</td>
                            <td>{formatCount(dicePerSquareMetre(mm))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p>
                Example: you have a 2 × 3 ft space. With 16 mm dice that is about {formatCount(dicePerSquareFoot(16) * 6)}{' '}
                dice; with 12 mm dice about {formatCount(dicePerSquareFoot(12) * 6)}. Then pick the row count whose
                total in the table above lands near that, and let the generator work out the exact grid.
            </p>

            <SectionHeading section={S['black-vs-white-counts']} />
            <p>
                The total tells you the size. The <strong>split</strong> tells you what to buy. A portrait made with
                both colours is rarely half and half: a dark photo with a dark background might be two-thirds black
                dice, a bright one the reverse. The split also moves when you change the contrast or brightness
                slider, because dice flip from one colour to the other as cells cross the middle of the scale.
            </p>
            <p>
                Under the preview, Diceify shows three numbers: the total, the black count and the white count, with
                a bar between them. They update live while you tune. When the picture looks right, write the two
                counts down. They are your shopping list, and <Link href="/dice-art/buying-dice">how many dice to buy</Link>{' '}
                explains the spares to add on top.
            </p>
            <div className="blog-note">
                <strong>Tip:</strong> Finish tuning before you order. Nudging the contrast after the dice arrive can
                move a few hundred dice from one colour to the other on a 60×60 grid.
            </div>

            <SectionHeading section={S['pick-the-grid']} />
            <p>
                There is no single right size. Two things decide it: how much detail the photo needs, and how much
                wall you have.
            </p>
            <ul>
                <li>
                    <strong>20–30 rows</strong> (400–900 dice): a bold shape, a logo, or a face cropped very tight.
                    Fast to build and cheap to try.
                </li>
                <li>
                    <strong>40–60 rows</strong> (1,600–3,600 dice): the sweet spot for a single face. Eyes, nose
                    and mouth read clearly from across a room.
                </li>
                <li>
                    <strong>70–120 rows</strong> (4,900 dice and up): two people, a pet with fine fur, or a photo
                    you want to read up close. Big and heavy, so plan the board first.
                </li>
            </ul>
            <p>
                The photo matters as much as the count. A clean crop with strong contrast reads at 30 rows; a busy
                group shot struggles at 100. See <Link href="/dice-art/best-photos">photos that read well in dice</Link>{' '}
                before you settle on a grid, and browse the <Link href="/gallery">gallery</Link> for finished pieces
                with their grid sizes.
            </p>
            <p>
                Then pick the die size for the wall. If 50 rows is right for the photo but 80 cm is too wide for the
                space, 12 mm dice give you the same pattern at 60 cm. Read the exact numbers for your grid in the{' '}
                <EditorLink>editor</EditorLink> and <EditorLink>start building</EditorLink> when the counts match
                what you have.
            </p>

            <SectionHeading section={S['weight-and-cost']} />
            <p>
                Weight and cost figures are coming once we have measured them on a real order and a real build; we
                would rather publish nothing than a guess.
            </p>
        </GuidePage>
    )
}
