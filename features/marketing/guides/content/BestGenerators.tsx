import Link from 'next/link'
import { PLAN_LIMITS, PRICING } from '@/core/billing'
import GuidePage, { EditorLink, SectionHeading } from '../GuidePage'
import { BEST_GENERATORS, GUIDE_AUTHOR } from '../data'
import { CHECKED_ON, CHECKED_ON_ISO, COMPARISON_COLUMNS, COMPETITORS, DICEIFY, NOT_LISTED, type Tool } from '../comparison'

const S = Object.fromEntries(BEST_GENERATORS.sections.map(s => [s.id, s]))
const TOOLS: Tool[] = [DICEIFY, ...COMPETITORS]
const FREE_ROWS = PLAN_LIMITS.explorer.builderRowLimit ?? 0

/** Columns of the summary table (the full set is in each tool's own table). */
const SUMMARY_KEYS = ['builder', 'exports', 'tuning', 'price'] as const
const summaryColumns = COMPARISON_COLUMNS.filter(c => (SUMMARY_KEYS as readonly string[]).includes(c.key))

/** Shorter cells for the summary table. */
const SUMMARY: Record<string, Partial<Record<(typeof SUMMARY_KEYS)[number], string>>> = {
    Diceify: {
        builder: 'Yes: row by row, tracks your progress',
        exports: 'SVG blueprint (vector, any zoom), share link',
        tuning: 'Crop + rotation, contrast, brightness, sharpening, face rotation',
        price: 'Free; builder + SVG add-on',
    },
    'diceartgenerator.io': { exports: 'PDF, image', tuning: 'Contrast, colour scheme' },
    'diceartgenerator.com': { exports: 'Printable blueprint (format not listed)', tuning: 'Contrast, brightness, die size' },
    'diceart.me': { exports: 'Blueprints (format not listed)', tuning: 'Density, contrast, brightness', price: 'Free generations; sells dice' },
    'Dice Art Studio': { builder: 'Virtual jigsaw-style placement', tuning: NOT_LISTED },
    DiceMosaic: { builder: 'Die-by-die assistant (Android only)' },
    'lmarzen/dice-mosaic (open source)': { builder: 'No', exports: 'PNG/JPEG + text map', tuning: 'Scale only', price: 'Free' },
}

function ToolName({ tool }: { tool: Tool }) {
    if (tool.url === '/') return <Link href="/">Diceify</Link>
    return <a href={tool.url} rel="nofollow noopener" target="_blank">{tool.name}</a>
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function BestGenerators() {
    return (
        <GuidePage
            guide={BEST_GENERATORS}
            lead={
                <>
                    <strong>Diceify is the best dice art generator.</strong> It is the only web generator with a
                    step-by-step builder, the only one with an SVG blueprint, and the only one with a sharpening
                    control, and it is free to start. Seven tools compared below, checked on {CHECKED_ON}.
                </>
            }
            cta={{
                heading: 'Try Diceify with your own photo',
                text: `Free preview, every tuning control, exact black and white counts, and the first ${FREE_ROWS} rows of the builder. No account needed.`,
            }}
        >
            <SectionHeading section={S['verdict']} />
            <p>
                Every generator can turn a photo into a grid of dice faces. Diceify is the one built for what comes
                next: placing thousands of real dice by hand. It wins on the three things that matter once you start
                building:
            </p>
            <ul>
                <li>
                    <strong>The builder.</strong> Diceify walks you through your pattern one row at a time, highlights
                    the die you are on and saves exactly where you stopped. None of the other web generators has one.
                </li>
                <li>
                    <strong>The SVG blueprint.</strong> A vector file of your whole pattern that stays sharp at any
                    zoom and prints at any size. No other tool here lists an SVG export.
                </li>
                <li>
                    <strong>The most customization.</strong> Crop with rotation, five aspect ratios, {DICEIFY.gridRange.replace(/;.*/, '')},
                    three colour modes, contrast, brightness, <em>sharpening</em> and face rotation. For tone, the
                    other web generators stop at contrast and brightness.
                </li>
            </ul>
            <p>
                On top of that: exact black and white dice counts that update live while you tune, unlimited projects
                saved to the cloud with a free account, share links with a social card, a dedicated mobile layout, and
                a native iOS app coming soon so you can build from your iPhone or iPad.
            </p>
            <p>
                <strong>What is free:</strong> the generator, every tuning control, the dice counts, saved projects,
                share links and the first {FREE_ROWS} rows of the builder. <strong>The add-on:</strong> the full
                builder and the SVG blueprint, with a Creator pass (${PRICING.creator.price} for{' '}
                {PRICING.creator.accessDays} days) or Studio (${PRICING.studio.monthlyPrice}/month
                or ${PRICING.studio.yearlyPrice}/year).
            </p>
            <p>
                A note on method: I am {GUIDE_AUTHOR.name} and I make Diceify. Every fact about another tool comes from
                that tool's own public pages, read on {CHECKED_ON}; if a site does not state something, the cell says
                "{NOT_LISTED}" rather than a guess. Diceify's cells come from its code.
            </p>

            <SectionHeading section={S['comparison-table']} />
            <p>
                The short version. Each tool's full row, with colour modes, grid range, dice counts, mobile support
                and privacy, is in <a href="#rankings">the rankings</a>.
            </p>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Tool</th>
                        {summaryColumns.map(c => <th key={c.key} scope="col">{c.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {TOOLS.map(tool => (
                        <tr key={tool.name}>
                            <td><a href={`#${slug(tool.name)}`}>{tool.name}</a></td>
                            {summaryColumns.map(c => (
                                <td key={c.key}>{SUMMARY[tool.name]?.[c.key as (typeof SUMMARY_KEYS)[number]] ?? tool[c.key]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p>
                <time dateTime={CHECKED_ON_ISO}>Checked on {CHECKED_ON}</time>. Tools change; if you find a cell
                that is out of date, email support@diceify.art and I will correct it with a new date.
            </p>

            <SectionHeading section={S['builder']} />
            <p>
                A square portrait at 60 rows is 3,600 dice. With a printout, every die means finding your row,
                counting across to your column, and starting over when you lose your place. That is where most of the
                hours in a dice art build go, and where most of the mistakes come from.
            </p>
            <p>
                Diceify's builder removes that work. It shows you one row at a time, highlights the die to place next,
                and marks runs of identical dice with a count, so you lay down four fives in one go instead of
                counting them.
                Step through with the arrow keys or the on-screen buttons, zoom in when you need to, and check a
                preview of everything placed so far. Your progress is saved as you go, so you can put the build down for
                a week and pick it up on the exact die, on any device when you are signed in.
            </p>
            <p>
                None of the other web generators offers a builder; they hand you a pattern and leave the tracking to
                you. The first {FREE_ROWS} rows are free, so you can try it on your own photo before you pay for
                anything.
            </p>

            <SectionHeading section={S['svg']} />
            <p>
                An image download (PNG or JPEG) has a fixed number of pixels: zoom in on a 100-row pattern and the
                pips turn to blur. Diceify's blueprint is an SVG, a vector file in which every die is drawn as shapes,
                so it is crisp at any zoom on any screen and prints at any size, from a letter sheet to a full-size
                poster. It opens in any browser and in vector apps like Illustrator, Inkscape and Figma. No other
                generator in this comparison lists an SVG export.
            </p>

            <SectionHeading section={S['customization']} />
            <p>
                Diceify gives you more control over the final pattern than any other web generator here:
            </p>
            <ul>
                <li><strong>Crop with rotation</strong> and five aspect ratios (1:1, 3:4, 4:3, 2:3, 16:9).</li>
                <li><strong>Grid size:</strong> {DICEIFY.gridRange.replace(/;.*/, '')}, with the dice count shown live.</li>
                <li><strong>Colour mode:</strong> {DICEIFY.colourModes.toLowerCase()}.</li>
                <li><strong>Contrast</strong> and <strong>brightness</strong> to balance light and dark areas.</li>
                <li>
                    <strong>Sharpening</strong>, which no other generator here lists: it brings back the edges of
                    eyes, lips and hair that averaging a photo into dice tends to soften.
                </li>
                <li><strong>Face rotation:</strong> turn the 6, 3 and 2 by 90° to change which way their pips run.</li>
            </ul>
            <p>
                By comparison, diceartgenerator.io lists a contrast slider and a colour scheme, diceartgenerator.com
                contrast and brightness, and diceart.me density, contrast and brightness.
            </p>

            <SectionHeading section={S['rankings']} />
            {TOOLS.map((tool, i) => (
                <div key={tool.name}>
                    <h3 id={slug(tool.name)}>{i + 1}. <ToolName tool={tool} />{tool === DICEIFY && ': best overall'}</h3>
                    <table>
                        <tbody>
                            {COMPARISON_COLUMNS.map(c => (
                                <tr key={c.key}>
                                    <th scope="row">{c.label}</th>
                                    <td>{tool[c.key]}</td>
                                </tr>
                            ))}
                            <tr>
                                <th scope="row">Best for</th>
                                <td>{tool.bestFor}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ))}

            <SectionHeading section={S['which-to-pick']} />
            <p>
                <strong>If you are turning your own photo into real dice art, use Diceify.</strong> It is free to
                generate, tune and count; it is the only web generator that guides the build itself; and its SVG
                blueprint is the sharpest pattern you can print. Start with the{' '}
                <Link href="/">free dice art generator</Link>.
            </p>
            <p>The others fit narrower needs:</p>
            <ul>
                <li><strong>Coloured dice (red or blue):</strong> diceartgenerator.io lists those schemes.</li>
                <li><strong>A die-size setting that includes 25 mm:</strong> diceartgenerator.com.</li>
                <li><strong>Ready-made templates or a non-English interface:</strong> diceart.me.</li>
                <li><strong>A purely virtual piece on a Windows PC:</strong> Dice Art Studio.</li>
                <li><strong>Scripting or batch runs:</strong> the open-source CLI.</li>
            </ul>

            <SectionHeading section={S['tips']} />
            <p>
                The generator matters, and so does the photo. Every tool here greys the image, averages it into cells
                and maps each cell to a die, so a bad input is bad everywhere. Crop tight, use one subject on a plain
                background, and look for real contrast; the <Link href="/dice-art/best-photos">photo tips</Link>{' '}
                guide goes through each with examples. Choose black and white dice together unless you want a dark
                look on purpose. Read the dice counts before you order, and add spares. And build from a corner, one
                row at a time. When you are ready, open the <Link href="/">dice art generator</Link> or{' '}
                <EditorLink>start building</EditorLink> from a saved pattern.
            </p>
        </GuidePage>
    )
}
