import Link from 'next/link'
import GuidePage, { EditorLink, SectionHeading } from '../GuidePage'
import { BUYING_DICE } from '../data'
import { DENSITY_SIZES_MM, dicePerSquareFoot, formatCount, gridFor, sizeCm, sizeIn } from '../size'
import { CHECKED_ON } from '../comparison'

const S = Object.fromEntries(BUYING_DICE.sections.map(s => [s.id, s]))
const example = gridFor('1:1', 50)

const SIZE_NOTES: Record<number, string> = {
    16: 'The standard game die. Easiest to find in bulk, easiest to handle, pips read from across the room.',
    12: 'Same pattern in three-quarters of the width. Fiddlier to place; more dice per square foot.',
    10: 'Sold as "precision" or "art" dice by specialist shops. Smallest piece per grid, most dice per area.',
}

export default function BuyingDice() {
    return (
        <GuidePage
            guide={BUYING_DICE}
            lead={
                <>
                    Buy black and white six-sided dice with pips, 16 mm unless you have a reason to go smaller, every
                    die of one colour from one batch, plus spares. Diceify tells you how many of each colour before
                    you order.
                </>
            }
        >
            <SectionHeading section={S['what-to-buy']} />
            <p>
                Dice art works because a die with more pips is a slightly different shade from a die with fewer. A
                black die shows white pips, a white die shows black ones, and together they give twelve steps from
                dark to light. That is why you need both colours; the guide on{' '}
                <Link href="/dice-art">how dice art works</Link> shows the full scale. Everything on this page follows
                from it: the dice have to be the same size, the same colour, with pips you can see, and you need the
                exact counts of each.
            </p>

            <SectionHeading section={S['die-size']} />
            <p>
                The grid decides the pattern; the die size decides how big the piece is. Here is the same{' '}
                {example.cols}×{example.rows} portrait ({formatCount(example.dice)} dice) at each common size.
            </p>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Die size</th>
                        <th scope="col">{example.cols}×{example.rows} piece</th>
                        <th scope="col">Dice per sq ft</th>
                        <th scope="col">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {DENSITY_SIZES_MM.map(mm => (
                        <tr key={mm}>
                            <td>{mm} mm</td>
                            <td>{sizeCm(example, mm)}<br />{sizeIn(example, mm)}</td>
                            <td>{formatCount(dicePerSquareFoot(mm))}</td>
                            <td>{SIZE_NOTES[mm]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p>
                <strong>16 mm</strong> is the default for a reason. Bulk bags are everywhere, the pips are large enough
                to read from a few metres, and each die is big enough to pick up and place without tweezers. The
                piece comes out large, which is usually the point.
            </p>
            <p>
                <strong>12 mm</strong> suits a small wall or a gift that has to fit in a shadow box. You place the same
                number of dice for a smaller result, so the work per square foot goes up, not down. Pips are still
                clear at arm's length.
            </p>
            <p>
                <strong>10 mm</strong> is what specialist dice-art shops sell. The piece is compact and the grid looks
                finer, but placing thousands of 10 mm cubes by hand is slow, and cheap 10 mm game dice vary in size
                more than you would like. If you go this small, buy dice made for the job.
            </p>

            <SectionHeading section={S['pips-not-numerals']} />
            <p>
                Buy dice with dots. The dots are the shades: one pip is almost all background colour, six pips are
                mostly dot colour. Dice printed with numerals break this. A "6" and a "1" cover about the same area
                of the face, so the brightness steps collapse and the portrait turns to mush. The same goes for
                novelty faces, logos on the 1, and dice with coloured pips: the generator assumes white pips on black
                and black pips on white.
            </p>

            <SectionHeading section={S['one-batch-per-colour']} />
            <p>
                Dice from different makers are not the same. Some 16 mm dice are 15.5 mm, some 16.5. Pips differ in
                diameter and depth. Whites range from chalk to cream. Across one row that is a wobble; across 2,500
                dice it is a visible seam where one bag ended and the next began.
            </p>
            <p>
                So buy each colour in one order from one listing, in one go, with spares included. If you later run
                short, buy the same listing again and spread the new dice through areas that are already mixed,
                not in one block. Keep a sealed handful back for repairs.
            </p>

            <SectionHeading section={S['tolerance']} />
            <p>
                Game dice are made to be rolled, not stacked. The corners are rounded, the size drifts a little from
                die to die, and nobody at the factory cared whether two dice sit flush side by side. For dice art
                that is mostly fine: a tight row absorbs small differences, and rounded corners give the surface a
                pleasant texture.
            </p>
            <p>
                Precision dice (casino dice, and the "art dice" some shops sell) are machined to a much tighter
                tolerance with sharp edges. Rows line up like tiles and the finished face is flatter. The trade-off
                is price and availability, and the sharp edges make the surface harsher to touch. For a first piece,
                a single good batch of game dice is enough. Go precision when the grid is large and the piece will be
                viewed up close.
            </p>

            <SectionHeading section={S['how-many-to-order']} />
            <p>
                Do not estimate the split. Tune the photo first, then read the black count and the white count under
                the preview in the <EditorLink>editor</EditorLink>. The{' '}
                <Link href="/dice-art/size-calculator">dice count and size calculator</Link> gives the totals for
                every grid, but only the generator knows how your photo divides them.
            </p>
            <p>
                Then add spares, per colour: around <strong>5–10 percent</strong>. Bulk bags include chipped,
                misprinted and off-colour dice, and you will drop a few. Round each colour up to the pack size you
                are buying. If the counts say 1,640 black and 860 white, order 1,800 black and 1,000 white and you
                will not be waiting on a second parcel with the glue open.
            </p>
            <div className="blog-note">
                <strong>Tip:</strong> Finish tuning before you order. A small contrast change can move a few hundred
                dice from one colour to the other on a 60×60 grid.
            </div>

            <SectionHeading section={S['where-to-buy']} />
            <p>
                Dice are a commodity, so you have choices. What matters is buying one colour from one source in a
                quantity that covers the count plus spares.
            </p>
            <ul>
                <li>
                    <strong>Game-supply wholesalers.</strong> The companies that supply board game publishers and
                    hobby shops sell 16 mm dice by the hundred or thousand in a single colour. Consistent, boring,
                    exactly what you want.
                </li>
                <li>
                    <strong>Educational suppliers.</strong> Classroom maths suppliers sell tubs of plain dot dice for
                    counting games, often in bulk and often cheaper per die than hobby shops. Check that the pips
                    are a single colour.
                </li>
                <li>
                    <strong>Marketplaces.</strong> Amazon, eBay and AliExpress-style sites list bags of 100 to 1,000.
                    Prices are good; consistency is the risk. Read reviews for "different sizes" or "mixed shades",
                    and buy the full quantity in one order from one seller.
                </li>
                <li>
                    <strong>Specialist dice-art shops.</strong> A few sites sell 10 mm precision dice matched for
                    mosaics, in black and white, sometimes alongside their own generator. Dearer per die, but the
                    batch problem is solved for you.
                </li>
            </ul>
            <p>
                Whatever the source, check the listing for four things: size in millimetres, "pips" or "dots" (not
                numbers), a single colour per bag, and a quantity that covers your count with spares.
            </p>

            <SectionHeading section={S['prices']} />
            <p>
                Prices move with the seller, the quantity and the shipping, so we do not print a per-die price here.
                Compare listings by the price per 1,000 including delivery, and check the per-colour count, not just
                the total. One dated data point: on {CHECKED_ON}, diceart.me listed its 10 mm precision dice at $250
                per 5,000 with a 5,000 minimum and free US shipping. Standard 16 mm game dice from wholesalers and
                marketplaces generally cost much less per die; check current listings.
            </p>

            <SectionHeading section={S['kit-worth-it']} />
            <p>
                A boxed dice art kit bundles dice, a board and a printed pattern for a fixed image or a photo you
                send in. Doing it yourself means a bulk bag of dice, a board from the hardware store, glue, and a
                pattern from a <Link href="/">dice art generator</Link>.
            </p>
            <p>
                <strong>A kit is worth it</strong> if you want zero decisions: the dice match, the board is cut, the
                pattern is printed, and a gift arrives in one box. It is also the better choice for a child's first
                project, where a sealed bag of exactly enough dice beats three mismatched orders.
            </p>
            <p>
                <strong>DIY is worth it</strong> if you want your own photo at your own size, or more than one piece.
                You choose the grid, so a 30-row test and a 70-row showpiece come from the same bag. You pick the
                die size and the board. And the leftovers go into the next portrait. If you can see yourself building
                a second piece, start this way. The{' '}
                <Link href="/blog/jeremy-dice-portraits-nieces">portraits Jeremy made for his nieces</Link> were two
                1,645-dice DIY builds from one pattern tool and a plywood base.
            </p>

            <SectionHeading section={S['what-else-you-need']} />
            <p>
                Besides the dice: a rigid board cut to the finished size, an adhesive that grips fast and dries
                clear, a straight edge to keep rows tight, and somewhere flat to work for a few evenings. The{' '}
                <Link href="/dice-art/how-to-glue-dice-art">glue and board</Link> guide compares the adhesives and
                the two ways to build. When the dice arrive, open the pattern and{' '}
                <EditorLink>start building</EditorLink> from the bottom row.
            </p>
        </GuidePage>
    )
}
