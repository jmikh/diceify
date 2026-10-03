import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import JsonLd from '@/components/JsonLd'
import { pageMetadata, SITE_URL } from '@/lib/seo'
import { DICE_PARAM_BOUNDS, THRESHOLDS, type ColorMode } from '@/core/dice'
import DiceScale from '@/features/marketing/components/DiceScale'

const TITLE = 'Dice Art — The Complete Guide to Dice Portraits & Mosaics'
const DESCRIPTION = 'What dice art is, how it works, how many dice you need and how big the piece gets, which dice and glue to use, and how to build your own from any photo.'
const PAGE_URL = `${SITE_URL}/dice-art`
const DATE_PUBLISHED = '2026-02-05'
const DATE_MODIFIED = '2026-10-03'

export const metadata: Metadata = pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: '/dice-art',
    article: { publishedTime: DATE_PUBLISHED },
})

// --- Physical size: dice laid edge to edge, frame not included -------------------------------------------------

const MM_PER_INCH = 25.4
const MM_PER_FOOT = 304.8
const GRID_SIDES = [20, 30, 40, 50, 70, 100]
const EXAMPLE_SIDE = 50

const formatCount = (n: number) => n.toLocaleString('en-US')
const gridLabel = (side: number) => `${side}×${side}`
/** Length of `dice` dice of `dieMm` in a row, e.g. "80 cm (31.5 in)". */
const rowLength = (dice: number, dieMm: number) =>
    `${Math.round((dice * dieMm) / 10)} cm (${((dice * dieMm) / MM_PER_INCH).toFixed(1)} in)`
const dicePerSquareFoot = (dieMm: number) => Math.round((MM_PER_FOOT / dieMm) ** 2)

// --- Answers: each is shown on the page verbatim and reused by the FAQ structured data -----------------------

const ANSWERS = {
    whatIs: 'Dice art is a mosaic made from ordinary six-sided dice. Each die is one pixel of the picture, and the face turned up sets its shade. Using black and white dice together gives 12 shades, enough to make a face recognizable.',
    howItWorks: 'A dice art generator turns the photo to grayscale, splits it into a grid with one cell per die, averages each cell into a single brightness value, and picks the die color and face that best match it. Because every cell is averaged, even a low-resolution photo works.',
    whyBoth: 'Even a black die showing 6 is still mostly black, and a white die showing 6 is still mostly white. So black dice alone can\'t make light tones, and white dice alone can\'t make dark ones. Together they cover the full range in 12 shades, which is what makes a portrait read clearly.',
    howMany: `Multiply the grid's columns by its rows: a ${gridLabel(EXAMPLE_SIDE)} portrait uses ${formatCount(EXAMPLE_SIDE ** 2)} dice. Small portraits use about 400–900 dice (20×20 to 30×30), medium ones 1,600–2,500 (40×40 to 50×50), and large pieces 5,000 or more.`,
    howBig: `Multiply the dice per side by the die size: a ${gridLabel(EXAMPLE_SIDE)} portrait is ${rowLength(EXAMPLE_SIDE, 16)} on each side with standard 16 mm dice, or ${rowLength(EXAMPLE_SIDE, 12)} with 12 mm dice. One square foot holds about ${dicePerSquareFoot(16)} dice at 16 mm (${dicePerSquareFoot(12)} at 12 mm).`,
    whatSize: 'Use 16 mm six-sided dice with pips (dots): it is the standard die size and the easiest to find in bulk. 12 mm dice fit the same grid into a piece three-quarters the width. Buy all the dice from one batch so they match in size and pip style.',
    glue: 'Either spread glue on the base and press each die in (slower, more control), or lay every die out dry and coat the top with resin or glue (faster, but bubbles or a cloudy coat can ruin the piece). Use a rigid base such as plywood or MDF, and test your adhesive on a small patch first.',
    howLong: 'A small 20×20 portrait (400 dice) takes 2–4 hours. A 40×40 piece (1,600 dice) is a full day. Bigger than that and you\'re looking at multiple sessions over a few days.',
    buyBulk: 'Amazon, gaming supply stores, and educational supply stores all sell packs of 100–1,000. Get uniform 16 mm dice: they give the cleanest grid.',
    pixelArt: 'Both are grid-based. Pixel art uses colored squares (unlimited colors). Dice art uses six-sided dice (up to 12 shades) and has a physical, three-dimensional quality you can\'t get with flat media.',
}

type AnswerKey = keyof typeof ANSWERS

/** Questions answered by the page's sections (the section opens with the answer). */
const SECTION_QUESTIONS: { question: string; answer: AnswerKey }[] = [
    { question: 'What is dice art?', answer: 'whatIs' },
    { question: 'How does a dice art generator work?', answer: 'howItWorks' },
    { question: 'Should I use black dice, white dice, or both?', answer: 'whyBoth' },
    { question: 'How many dice do I need for dice art?', answer: 'howMany' },
    { question: 'How big is a dice portrait?', answer: 'howBig' },
    { question: 'What size dice should I use for dice art?', answer: 'whatSize' },
    { question: 'How do you glue dice art?', answer: 'glue' },
]

/** Questions in the FAQ block at the end. */
const FAQ_QUESTIONS: { question: string; answer: AnswerKey }[] = [
    { question: 'How long does it take to build?', answer: 'howLong' },
    { question: 'Where can I buy dice in bulk?', answer: 'buyBulk' },
    { question: "What's the difference between dice art and pixel art?", answer: 'pixelArt' },
]

const STEPS = [
    { id: 'pick-your-image', name: 'Pick your image', text: 'Choose a photo with one subject cropped close and clear contrast between the subject and the background. Resolution barely matters.' },
    { id: 'generate-the-pattern', name: 'Generate the pattern', text: 'Upload the photo to a dice art generator such as Diceify, choose the grid size, and tune the contrast until the face reads clearly. Note the black and white dice counts.' },
    { id: 'gather-materials', name: 'Gather materials', text: 'Get black and white dice from one batch plus spares, a rigid base such as plywood or MDF, glue, and a straight edge.' },
    { id: 'glue-and-build', name: 'Glue and build', text: 'Place the dice row by row from one corner, following the pattern, and let the glue set as you go.' },
]

// The same photo in each color mode, rendered by scripts/gen-color-mode-examples.ts.
const COLOR_MODE_EXAMPLES: { mode: ColorMode; label: string; alt: string }[] = [
    { mode: 'black', label: 'Black dice only', alt: 'A boy\'s portrait as dice art made with black dice only: dark and murky' },
    { mode: 'white', label: 'White dice only', alt: 'The same portrait made with white dice only: pale and washed out' },
    { mode: 'both', label: 'Black + white dice', alt: 'The same portrait made with black and white dice: clear and high-contrast' },
]
const colorModeImage = (mode: ColorMode) => `/images/dice-art/kids-50x50-${mode}.webp`

// --- Structured data ------------------------------------------------------------------------------------------

const organization = { "@type": "Organization", "name": "Diceify", "url": SITE_URL }

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": TITLE,
    "description": DESCRIPTION,
    "url": PAGE_URL,
    "image": `${SITE_URL}${colorModeImage('both')}`,
    "datePublished": DATE_PUBLISHED,
    "dateModified": DATE_MODIFIED,
    "author": organization,
    "publisher": {
        ...organization,
        "logo": {
            "@type": "ImageObject",
            "url": `${SITE_URL}/favicon-192x192.png`,
            "creator": organization,
            "copyrightNotice": "© 2024 Diceify. All rights reserved.",
            "creditText": "Created with Diceify (diceify.art)",
            "license": `${SITE_URL}/terms`,
            "acquireLicensePage": `${SITE_URL}/terms`
        }
    },
    "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": PAGE_URL
    },
    "keywords": "dice art, dice portrait, dice mosaic, dice art generator, how to make dice art, dice art gift, personalized gift ideas, diy gift ideas",
    "inLanguage": "en-US"
}

const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [...SECTION_QUESTIONS, ...FAQ_QUESTIONS].map(({ question, answer }) => ({
        "@type": "Question",
        "name": question,
        "acceptedAnswer": { "@type": "Answer", "text": ANSWERS[answer] }
    }))
}

const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to make dice art from a photo",
    "description": ANSWERS.whatIs,
    "image": `${SITE_URL}${colorModeImage('both')}`,
    "supply": [
        "Black and white six-sided dice with pips (16 mm or 12 mm)",
        "A rigid base such as plywood or MDF",
        "Wood glue, epoxy or construction adhesive",
    ].map(name => ({ "@type": "HowToSupply", "name": name })),
    "tool": [
        "A dice art generator such as Diceify",
        "A straight edge",
    ].map(name => ({ "@type": "HowToTool", "name": name })),
    "step": STEPS.map(({ id, name, text }) => ({
        "@type": "HowToStep",
        "name": name,
        "text": text,
        "url": `${PAGE_URL}#${id}`
    }))
}

const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
        { "@type": "ListItem", "position": 2, "name": "Dice Art", "item": PAGE_URL }
    ]
}

// --- Page -----------------------------------------------------------------------------------------------------

function StepHeading({ index }: { index: number }) {
    const { id, name } = STEPS[index]
    return <h3 id={id}>{index + 1}. {name}</h3>
}

const lastUpdated = new Date(DATE_MODIFIED).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
const linkClass = 'text-[var(--pink)] hover:underline'

export default function DiceArtPage() {
    return (
        <>
            <JsonLd data={jsonLd} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={howToJsonLd} />
            <JsonLd data={breadcrumbJsonLd} />

            {/* Content */}
            <div className="relative z-[2] max-w-[800px] mx-auto w-full px-6 py-12">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--pink)] transition-colors mb-8"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Home
                </Link>

                <article className="blog-article">
                    <header className="mb-8">
                        <span className="section-label">
                            <span className="w-2 h-2 bg-[var(--pink)] rounded-full"></span>
                            Complete Guide
                        </span>
                        <h1 className="font-syne text-3xl md:text-5xl font-bold text-[var(--text-primary)] mt-4 leading-tight">
                            Dice Art: Everything You Need to Know
                        </h1>
                        <p className="text-[var(--text-muted)] mt-4 text-lg leading-relaxed">
                            Discover how simple six-sided dice become stunning works of art, and why using both black and white dice makes all the difference.
                        </p>
                        <p className="text-sm text-[var(--text-dim)] mt-3">
                            Last updated: {lastUpdated}
                        </p>
                    </header>

                    <div className="blog-content frosted-glass rounded-2xl p-8 md:p-12">

                        <h2>What is dice art?</h2>
                        <p>{ANSWERS.whatIs}</p>

                        <h2>How it works: brightness mapping</h2>
                        <p>{ANSWERS.howItWorks}</p>
                        <p>
                            Every die face covers a different amount of its surface with pips. On a black die, more
                            (white) pips read lighter; on a white die, more (black) pips read darker. Lined up by
                            brightness, the two colors give one scale of 12 shades:
                        </p>
                        <DiceScale showColorGroups />
                        <p>
                            A{' '}
                            <Link href="/editor" className={linkClass}>dice art generator</Link>{' '}
                            does the matching automatically: upload a photo and it outputs the full grid pattern.
                        </p>

                        <h2>Why use both black and white dice?</h2>
                        <p>{ANSWERS.whyBoth}</p>
                        <figure className="my-8">
                            <div className="grid grid-cols-3 gap-3">
                                {COLOR_MODE_EXAMPLES.map(({ mode, label, alt }) => (
                                    <figure key={mode}>
                                        <div className="relative aspect-square rounded-lg overflow-hidden">
                                            <Image
                                                src={colorModeImage(mode)}
                                                alt={alt}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 30vw, 230px"
                                            />
                                        </div>
                                        <figcaption>
                                            <strong className="text-[var(--text-primary)]">{label}</strong>
                                            <br />
                                            {THRESHOLDS[mode].length} shades
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                            <figcaption>
                                {`One photo as a ${gridLabel(EXAMPLE_SIDE)} grid (${formatCount(EXAMPLE_SIDE ** 2)} dice), same settings; only the dice colors change.`}
                            </figcaption>
                        </figure>
                        <p>
                            Black-only pieces still work, and some people like their moody look. White-only pieces
                            come out pale and washed out.
                        </p>

                        <h2>How many dice do you need, and how big will it be?</h2>
                        <p>{ANSWERS.howMany}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Grid</th>
                                    <th scope="col">Dice</th>
                                    <th scope="col">Each side, 16 mm dice</th>
                                    <th scope="col">Each side, 12 mm dice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {GRID_SIDES.map(side => (
                                    <tr key={side}>
                                        <td>{gridLabel(side)}</td>
                                        <td>{formatCount(side ** 2)}</td>
                                        <td>{rowLength(side, 16)}</td>
                                        <td>{rowLength(side, 12)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p>{ANSWERS.howBig}</p>
                        <p>
                            The sizes are for the dice alone; add the frame on top. For a photo that isn't square,
                            multiply columns by rows.{' '}
                            <Link href="/editor" className={linkClass}>Diceify</Link> grids run from{' '}
                            {DICE_PARAM_BOUNDS.numRows.min} to {DICE_PARAM_BOUNDS.numRows.max} rows, and the editor
                            shows the exact number of black and white dice as you tune, so you know what to buy.
                        </p>

                        <h2>What size dice should you use?</h2>
                        <p>{ANSWERS.whatSize}</p>
                        <ul>
                            <li>
                                <strong>16 mm</strong> is the standard die. A {gridLabel(EXAMPLE_SIDE)} portrait
                                comes out at {rowLength(EXAMPLE_SIDE, 16)} on each side.
                            </li>
                            <li>
                                <strong>12 mm</strong> packs more detail into the same wall space: the
                                same portrait shrinks to {rowLength(EXAMPLE_SIDE, 12)}.
                            </li>
                            <li>
                                <strong>Pips, not numerals.</strong> The dots are what make the shades; dice printed
                                with numerals don't give a clean scale.
                            </li>
                            <li>
                                <strong>Buy spares.</strong> Bulk packs can include chipped or misprinted dice.
                            </li>
                        </ul>

                        <h2>How to make your own</h2>

                        <StepHeading index={0} />
                        <p>
                            Zoom in tight. The more the subject fills the frame, the more detail you'll get. You don't
                            need a high-res photo; the generator averages pixels anyway.
                        </p>
                        <ul>
                            <li>
                                <strong>Faces work best</strong> when cropped close, one person per portrait.
                            </li>
                            <li>
                                <strong>Contrast matters.</strong> Dark hair on a light background (or vice versa)
                                gives clean edges.
                            </li>
                            <li>
                                <strong>Dramatic lighting helps.</strong> Strong shadows make faces pop in dice.
                            </li>
                        </ul>

                        <StepHeading index={1} />
                        <p>
                            <Link href="/editor" className={linkClass}>Diceify</Link>{' '}
                            converts your photo into a dice grid and shows you a live preview. Pick the grid size,
                            then tweak contrast and brightness before committing: small adjustments make a big
                            difference in how readable the final piece is.
                        </p>

                        <StepHeading index={2} />
                        <ul>
                            <li>
                                <strong>Dice:</strong> black and white six-sided dice with pips, all from one batch,
                                plus some spares.
                            </li>
                            <li>
                                <strong>A base:</strong> a rigid board such as plywood or MDF. Big pieces get heavy;{' '}
                                <Link href="/blog/jeremy-dice-portraits-nieces" className={linkClass}>Jeremy</Link>{' '}
                                backed his plywood with 2×4s so it wouldn't warp.
                            </li>
                            <li>
                                <strong>Glue:</strong> wood glue, epoxy, or a construction adhesive such as Liquid
                                Nails, which Jeremy used.
                            </li>
                            <li>
                                <strong>A straight edge</strong> to keep the rows tight.
                            </li>
                        </ul>

                        <StepHeading index={3} />
                        <p>{ANSWERS.glue}</p>
                        <p>
                            That happened on one of{' '}
                            <Link href="/blog/why-i-built-diceify" className={linkClass}>our own builds</Link>, so test
                            first. Jeremy laid all his dice out dry, then moved them to the board row by row.
                        </p>
                        <p>
                            Follow the pattern row by row. Diceify's{' '}
                            <Link href="/editor" className={linkClass}>step-by-step builder</Link>{' '}
                            highlights your current position and tells you exactly which die to place next.
                        </p>

                        <div className="blog-note">
                            <strong>Tip:</strong> Start from a corner, work in one direction. If gluing, let each
                            row set for a minute before starting the next; it keeps things from shifting.
                        </div>

                        <h2>Dice art examples</h2>
                        <p>
                            Here are some dice portraits and mosaics created with Diceify, each one built by hand from a
                            generated pattern:
                        </p>

                        <div className="grid grid-cols-2 gap-3 my-8 rounded-xl overflow-hidden">
                            {[
                                { src: '/images/salah-61x61.webp', alt: 'Mo Salah football player dice art portrait' },
                                { src: '/images/kobe-71x71.webp', alt: 'Kobe Bryant tribute in dice art' },
                                { src: '/images/sharbatgula-52x52.webp', alt: 'Afghan Girl famous dice portrait' },
                                { src: '/images/ummkulthum58x58.webp', alt: 'Umm Kulthum singer dice mosaic art' },
                            ].map((img, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                                    <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="350px" />
                                </div>
                            ))}
                        </div>

                        <h2>FAQ</h2>
                        {FAQ_QUESTIONS.map(({ question, answer }) => (
                            <div key={answer}>
                                <h3>{question}</h3>
                                <p>{ANSWERS[answer]}</p>
                            </div>
                        ))}

                        {/* CTA */}
                        <div className="blog-cta">
                            <h3>Ready to create your own dice art?</h3>
                            <p>
                                Upload a photo and see it transformed into a buildable dice pattern. Free, no account required.
                            </p>
                            <Link href="/editor" className="btn-primary">
                                Start creating
                            </Link>
                        </div>

                        {/* Related Reading */}
                        <h2>Further reading</h2>
                        <ul>
                            <li>
                                <Link href="/gallery" className={linkClass}>
                                    Dice Art Gallery
                                </Link>{' '}
                                — browse portraits and abstract mosaics created with Diceify.
                            </li>
                            <li>
                                <Link href="/blog/why-i-built-diceify" className={linkClass}>
                                    Why I Built Diceify
                                </Link>{' '}
                                — the story behind Diceify and a video of building a dice portrait from scratch.
                            </li>
                            <li>
                                <Link href="/blog/jeremy-dice-portraits-nieces" className={linkClass}>
                                    How Jeremy Made Dice Portraits for His Nieces
                                </Link>{' '}
                                — a community story about making personalized dice art gifts.
                            </li>
                        </ul>
                    </div>
                </article>

                <div className="mt-12 text-center">
                    <Link href="/" className="btn-secondary">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </>
    )
}
