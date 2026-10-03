import Link from 'next/link'
import GuidePage, { EditorLink, SectionHeading } from '../GuidePage'
import { BEST_GENERATORS, GUIDE_AUTHOR } from '../data'
import { CHECKED_ON, CHECKED_ON_ISO, COMPARISON_COLUMNS, COMPETITORS, COMPETITOR_REVIEW, DICEIFY, NOT_LISTED, type Tool } from '../comparison'

const S = Object.fromEntries(BEST_GENERATORS.sections.map(s => [s.id, s]))
const TOOLS: Tool[] = [DICEIFY, ...COMPETITORS]

/** Columns of the summary table (the full set is in each tool's own table). */
const SUMMARY_KEYS = ['price', 'account', 'colourModes', 'exports', 'processing'] as const
const summaryColumns = COMPARISON_COLUMNS.filter(c => (SUMMARY_KEYS as readonly string[]).includes(c.key))

/** Shorter cells for the summary table. */
const SUMMARY: Record<string, Partial<Record<(typeof SUMMARY_KEYS)[number], string>>> = {
    Diceify: { price: 'Free; paid plans for full builder and SVG', account: 'Only to save, share or pay', exports: 'Image (free), SVG (paid), no PDF', processing: 'In the browser' },
    'diceartgenerator.io': { colourModes: 'Black, White, Red, Blue schemes', exports: 'PDF, image' },
    'diceartgenerator.com': { exports: 'Printable blueprint (format not listed)' },
    'diceart.me': { price: 'Free generations; sells dice', account: 'Sign-in exists; requirement not listed', exports: 'Blueprints (format not listed)' },
    'Dice Art Studio': { account: 'itch.io purchase', colourModes: 'Custom colours and textures', processing: 'On your PC' },
    DiceMosaic: { colourModes: 'Values 0–6; colours not listed', processing: 'On the phone' },
    'lmarzen/dice-mosaic (open source)': { colourModes: 'Black, white, mixed', exports: 'PNG/JPEG + text map', processing: 'On your computer' },
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
                    Seven ways to turn a photo into a dice pattern, compared on what each one publishes about price,
                    grid range, colour modes, tuning, exports and privacy. Written by the maker of Diceify, so read the
                    disclosure first. Checked on {CHECKED_ON}.
                </>
            }
            cta={{
                heading: 'Try Diceify with your own photo',
                text: 'Free preview, exact black and white counts, and the first rows of the builder. No account needed.',
            }}
        >
            <SectionHeading section={S['disclosure']} />
            <p>
                I am {GUIDE_AUTHOR.name} and <strong>I make Diceify</strong>. I built it after a frustrating
                experience with the tools that existed at the time (<Link href="/blog/why-i-built-diceify">why we built Diceify</Link>),
                so I am not neutral. To keep this useful anyway, the rules are simple. Every fact about another tool
                comes from that tool's own public pages, read on {CHECKED_ON}. If a site does not state something,
                the cell says "{NOT_LISTED}" rather than my guess. Diceify's cells come from its code, and the section
                on where it falls short is as blunt as the rest. I have not yet run the same photo through every
                tool for this page; when I do, the output images will go here with the date.
            </p>
            <p>
                If you are new to the subject, <Link href="/dice-art">how dice art generators work</Link> explains
                what every tool on this page does under the hood: grey the photo, split it into cells, average each
                cell, pick the die face that matches.
            </p>

            <SectionHeading section={S['comparison-table']} />
            <p>
                The short version. Each tool's full row, with grid range, tuning controls, dice counts, builder and
                mobile support, is in the next section.
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

            <SectionHeading section={S['tool-by-tool']} />
            {TOOLS.map(tool => (
                <div key={tool.name}>
                    <h3 id={slug(tool.name)}><ToolName tool={tool} /></h3>
                    <table>
                        <tbody>
                            {COMPARISON_COLUMNS.map(c => (
                                <tr key={c.key}>
                                    <th scope="row">{c.label}</th>
                                    <td>{tool[c.key]}</td>
                                </tr>
                            ))}
                            <tr>
                                <th scope="row">Better fit when you want</th>
                                <td>{tool.bestFor}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ))}
            <p>
                A few notes the tables cannot hold. <strong>Diceify</strong> is built around the hand build: you pick
                the rows, the columns follow your crop, and the builder walks you through the grid one row at a time
                while tracking what you have placed. Its free tier is the whole preview and the first rows of that
                builder; paid plans unlock the rest and an SVG blueprint. The{' '}
                <Link href="/">free dice art generator</Link> is the place to start.{' '}
                <strong>diceartgenerator.io</strong> is a clean, no-account web tool whose big draw is a free PDF
                template with coordinates. <strong>diceartgenerator.com</strong> is the one with counts per face value
                and a 25 mm die-size option. <strong>diceart.me</strong> is a generator plus a shop: templates in six
                languages and matched 10 mm precision dice to go with them. <strong>Dice Art Studio</strong> is a paid
                Windows program for very large virtual pieces with custom-coloured dice. <strong>DiceMosaic</strong>{' '}
                is an Android app with a die-by-die assistant. The <strong>open-source CLI</strong> is for people who
                want to script it or read the code.
            </p>

            <SectionHeading section={S['where-diceify-falls-short']} />
            <ul>
                <li>
                    <strong>No PDF export.</strong> Diceify gives you a live preview and exact dice counts for free, a
                    shareable social card after a free sign-in, and a vector SVG blueprint on a paid plan; there is no
                    free image file download. If you want a printed, paginated pattern with coordinates to tick off at
                    the workbench, diceartgenerator.io offers that today and Diceify does not.
                </li>
                <li>
                    <strong>Black and white only.</strong> There is no coloured-dice mode. If your project uses red or
                    blue dice, diceartgenerator.io lists those schemes and Dice Art Studio lets you recolour the dice.
                </li>
                <li>
                    <strong>The full builder is paid.</strong> The first rows are free so you can test it; building a
                    whole piece with it needs a Creator pass or a Studio plan. The generator, the counts and the image
                    download stay free.
                </li>
                <li>
                    <strong>No templates.</strong> Diceify works from your photo only. diceart.me has a template
                    library if you want a ready-made famous face.
                </li>
                <li>
                    <strong>Web only.</strong> There is a mobile layout in the browser, but no offline desktop program
                    like Dice Art Studio.
                </li>
            </ul>

            <SectionHeading section={S['competitor-review']} />
            <p>
                {COMPETITOR_REVIEW.site} publishes its own comparison (dated {COMPETITOR_REVIEW.dated}, no byline),
                which gives itself 5/5 and Diceify {COMPETITOR_REVIEW.rating}, with the cons "{COMPETITOR_REVIEW.cons.join('", "')}"
                and a privacy entry of "{COMPETITOR_REVIEW.privacyClaim}". One of those is fair and two are not, so
                for the record:
            </p>
            <ul>
                <li>
                    <strong>PDF export: correct.</strong> Diceify has none. See above.
                </li>
                <li>
                    <strong>"No project information": not correct.</strong> Diceify shows the grid size, the total
                    dice, and the exact black and white counts live while you tune, and the builder shows your row,
                    position and the share of dice placed.
                </li>
                <li>
                    <strong>"Server upload": not correct.</strong> Diceify's dice pipeline runs in your browser. If you
                    never sign in, your photo and draft stay on your device. The photo is uploaded only when you sign
                    in and save a project to your account, so it can follow you to another device.
                </li>
                <li>
                    <strong>"Limited customization": a matter of taste.</strong> Diceify has crop with rotation,{' '}
                    {DICEIFY.gridRange.replace(/;.*/, '')}, three colour modes, contrast, brightness, sharpening and
                    face rotation. It does not have coloured dice or a die-size picker, which may be what the author
                    meant.
                </li>
            </ul>
            <p>
                The site is welcome to update its table; until it does, this page is the record.
            </p>

            <SectionHeading section={S['which-to-pick']} />
            <ul>
                <li><strong>You will build it by hand from your own photo:</strong> Diceify, for the live counts and the row-by-row builder.</li>
                <li><strong>You want a printed PDF pattern and nothing to sign up for:</strong> diceartgenerator.io.</li>
                <li><strong>You want a count per face value, or 25 mm dice:</strong> diceartgenerator.com.</li>
                <li><strong>You want a template or need the interface in another language, and may buy matched 10 mm dice:</strong> diceart.me.</li>
                <li><strong>You want a huge or multi-coloured piece on a Windows PC, maybe never built physically:</strong> Dice Art Studio.</li>
                <li><strong>You want to build from an Android phone:</strong> DiceMosaic; Diceify's mobile layout also works in the phone's browser.</li>
                <li><strong>You want to script it:</strong> the open-source CLI.</li>
            </ul>

            <SectionHeading section={S['tips']} />
            <p>
                The generator matters less than the photo. Every tool here greys the image, averages it into cells
                and maps each cell to a die, so a bad input is bad everywhere. Crop tight, use one subject on a plain
                background, and look for real contrast; the <Link href="/dice-art/best-photos">photo tips</Link>{' '}
                guide goes through each with examples. Choose black and white dice together unless you want a dark
                look on purpose. Read the dice counts before you order, and add spares. And whichever tool made the
                pattern, build from a corner, one row at a time. When you are ready, open the{' '}
                <Link href="/">dice art generator</Link> or <EditorLink>start building</EditorLink> from a saved pattern.
            </p>
        </GuidePage>
    )
}
