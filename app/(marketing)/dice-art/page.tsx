import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import JsonLd from '@/components/JsonLd'
import { pageMetadata, SITE_URL } from '@/lib/seo'
import { ABOUT_URL, FOUNDER_NAME, FOUNDER_REF, ORGANIZATION_REF } from '@/lib/schema'
import { DICE_PARAM_BOUNDS, THRESHOLDS, type ColorMode } from '@/core/dice'
import DiceScale from '@/features/marketing/components/DiceScale'
import {
    ALL_QUESTIONS, ANSWERS, BUILD_VIDEO, CREATOR_DAYS, CREATOR_PRICE, EXAMPLE_SIDE, FAQ_QUESTIONS, FREE_BUILDER_ROWS,
    GRID_SIDES, GUIDES, SECTION_LIST, SECTIONS, SHADE_ORDER, STEPS, STUDIO_MONTHLY, STUDIO_YEARLY, dicePerSquareFoot,
    formatCount, gridLabel, rowLength, type Section,
} from '@/features/marketing/content/dice-art'

const TITLE = 'Dice Art: How to Make It, Dice Count & Size Chart'
const DESCRIPTION = `A ${gridLabel(EXAMPLE_SIDE)} dice portrait uses ${formatCount(EXAMPLE_SIDE ** 2)} dice and is ${rowLength(EXAMPLE_SIDE, 16)} wide with 16 mm dice. Size chart, which dice and glue to buy, and 4 build steps.`
const PAGE_URL = `${SITE_URL}/dice-art`
const DATE_PUBLISHED = '2026-02-05'
const DATE_MODIFIED = '2026-10-03'
const AUTHOR = { name: FOUNDER_NAME, path: ABOUT_URL.slice(SITE_URL.length) }

export const metadata: Metadata = pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: '/dice-art',
    article: { publishedTime: DATE_PUBLISHED, authors: [ABOUT_URL] },
})

// The same photo in each color mode, rendered by scripts/gen-color-mode-examples.ts.
const COLOR_MODE_EXAMPLES: { mode: ColorMode; label: string; alt: string }[] = [
    { mode: 'black', label: 'Black dice only', alt: 'A boy\'s portrait as dice art made with black dice only: dark and murky' },
    { mode: 'white', label: 'White dice only', alt: 'The same portrait made with white dice only: pale and washed out' },
    { mode: 'both', label: 'Black + white dice', alt: 'The same portrait made with black and white dice: clear and high-contrast' },
]
const colorModeImage = (mode: ColorMode) => `/images/dice-art/kids-50x50-${mode}.webp`

const EXAMPLE_IMAGES = [
    { src: '/images/salah-61x61.webp', alt: 'Mo Salah football player dice art portrait, 61×61 grid' },
    { src: '/images/kobe-71x71.webp', alt: 'Kobe Bryant tribute in dice art, 71×71 grid' },
    { src: '/images/sharbatgula-52x52.webp', alt: 'Afghan Girl famous dice portrait, 52×52 grid' },
    { src: '/images/ummkulthum58x58.webp', alt: 'Umm Kulthum singer dice mosaic art, 58×58 grid' },
]

// --- Structured data ------------------------------------------------------------------------------------------

// The Organization and the founder are declared once in the root layout's graph (lib/schema.ts); reference them.
const videoJsonLd = {
    "@type": "VideoObject",
    "name": BUILD_VIDEO.name,
    "description": BUILD_VIDEO.description,
    "thumbnailUrl": BUILD_VIDEO.thumbnailUrl,
    "embedUrl": BUILD_VIDEO.embedUrl,
    "contentUrl": BUILD_VIDEO.contentUrl,
    "uploadDate": BUILD_VIDEO.uploadDate,
    "author": FOUNDER_REF,
}

const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": TITLE,
    "description": DESCRIPTION,
    "url": PAGE_URL,
    "image": `${SITE_URL}${colorModeImage('both')}`,
    "datePublished": DATE_PUBLISHED,
    "dateModified": DATE_MODIFIED,
    "author": FOUNDER_REF,
    "publisher": ORGANIZATION_REF,
    "mainEntityOfPage": { "@type": "WebPage", "@id": PAGE_URL },
    "video": videoJsonLd,
    "keywords": "dice art, dice portrait, dice mosaic, dice art generator, how to make dice art, dice art gift, personalized gift ideas, diy gift ideas",
    "inLanguage": "en-US"
}

const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": ALL_QUESTIONS.map(({ question, answer }) => ({
        "@type": "Question",
        "name": question,
        "acceptedAnswer": { "@type": "Answer", "text": ANSWERS[answer] }
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

const furtherReadingJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Go deeper into dice art",
    "itemListElement": GUIDES.map(({ href, title }, i) => ({
        "@type": "ListItem", "position": i + 1, "name": title, "url": `${SITE_URL}${href}`
    }))
}

// --- Page -----------------------------------------------------------------------------------------------------

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

function SectionHeading({ section }: { section: Section }) {
    return <h2 id={section.id}>{section.heading}</h2>
}

function StepHeading({ index }: { index: number }) {
    const { id, name } = STEPS[index]
    return <h3 id={id}>{index + 1}. {name}</h3>
}

/** A link into the editor: never the "dice art generator" anchor (that goes to `/`), never prefetched. */
function EditorLink({ children, className }: { children: React.ReactNode; className?: string }) {
    return <Link href="/editor" prefetch={false} className={className}>{children}</Link>
}

const exampleGrid = gridLabel(EXAMPLE_SIDE)
const exampleDice = formatCount(EXAMPLE_SIDE ** 2)

export default function DiceArtPage() {
    return (
        <>
            <JsonLd data={articleJsonLd} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={breadcrumbJsonLd} />
            <JsonLd data={furtherReadingJsonLd} />

            <div className="marketing-page max-w-[800px]">
                <article className="blog-article">
                    <header className="mb-8">
                        <span className="section-label">
                            <span className="w-2 h-2 bg-[var(--pink)] rounded-full"></span>
                            Complete Guide
                        </span>
                        <h1 className="font-syne text-3xl md:text-5xl font-bold text-[var(--text-primary)] mt-4 leading-tight">
                            Dice Art: How to Make It, Dice Count &amp; Size Chart
                        </h1>
                        <p className="text-[var(--text-primary)] mt-4 text-lg leading-relaxed">
                            Dice art is a mosaic made from ordinary six-sided dice: each die is one pixel, and the
                            face turned up sets its shade. A {exampleGrid} dice portrait uses {exampleDice} dice and
                            is about {rowLength(EXAMPLE_SIDE, 16)} wide with 16 mm dice.
                        </p>
                        <p className="guide-byline">
                            By <Link href={AUTHOR.path}>{AUTHOR.name}</Link> · Updated {formatDate(DATE_MODIFIED)}
                        </p>
                        <div className="mt-6">
                            <EditorLink className="btn-primary">Make your own dice art (free)</EditorLink>
                        </div>
                        <nav className="guide-toc" aria-labelledby="toc-heading">
                            <p id="toc-heading" className="guide-toc-heading">On this page</p>
                            <ol>
                                {SECTION_LIST.map(({ id, heading }) => (
                                    <li key={id}><a href={`#${id}`}>{heading}</a></li>
                                ))}
                            </ol>
                        </nav>
                    </header>

                    <div className="blog-content frosted-glass rounded-2xl p-8 md:p-12">

                        <SectionHeading section={SECTIONS.whatIs} />
                        <p>{ANSWERS.whatIs}</p>
                        <p>
                            Most dice art is portraiture, because a face still reads at 40 to 60 dice across. Pets,
                            logos and landmarks work the same way. People build them as birthday gifts, like{' '}
                            <Link href="/blog/jeremy-dice-portraits-nieces">Jeremy did for his nieces</Link>, or as
                            tributes, like the{' '}
                            <Link href="/blog/why-i-built-diceify">Umm Kulthum portrait</Link> that started Diceify.
                            The <Link href="/gallery">gallery</Link> shows the range, from a 51×51 Dalí (2,601 dice)
                            to a 71×71 Kobe Bryant (5,041 dice).
                        </p>

                        <SectionHeading section={SECTIONS.howItWorks} />
                        <p>{ANSWERS.howItWorks}</p>
                        <p>
                            Every die face covers a different amount of its surface with pips. On a black die, more
                            (white) pips read lighter; on a white die, more (black) pips read darker. Lined up by
                            brightness, the two colors give one scale of 12 shades:
                        </p>
                        <DiceScale showColorGroups />
                        <p className="guide-scale-text">Darkest to lightest: {SHADE_ORDER}.</p>
                        <p>
                            A <Link href="/">dice art generator</Link> does the matching automatically: upload a
                            photo and it outputs the full grid pattern. Diceify adds three controls. Contrast and
                            brightness move each cell up or down the scale before it is matched to a die. Edge
                            sharpening boosts the difference between neighbouring cells, so outlines survive the
                            downsampling.
                        </p>

                        <SectionHeading section={SECTIONS.whyBoth} />
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
                                {`One photo as a ${exampleGrid} grid (${exampleDice} dice), same settings; only the dice colors change.`}
                            </figcaption>
                        </figure>
                        <p>
                            Black-only pieces still work, and some people like their moody look. White-only pieces
                            come out pale and washed out.
                        </p>

                        <SectionHeading section={SECTIONS.howMany} />
                        <p>{ANSWERS.howMany}</p>
                        <table>
                            <caption>Dice count and finished size by grid. Dice laid edge to edge; frame not included.</caption>
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
                            For a photo that isn't square, multiply columns by rows, or use the{' '}
                            <Link href="/dice-art/size-calculator">size calculator</Link> for any grid and die size.
                            Diceify grids run from {DICE_PARAM_BOUNDS.numRows.min} to {DICE_PARAM_BOUNDS.numRows.max}{' '}
                            rows, and the editor shows the exact number of black and white dice as you tune, so you
                            know what to buy.
                        </p>
                        <p className="guide-pending">
                            Weight and dice-cost columns will follow once we have weighed our own dice and recorded
                            dated bulk prices. We would rather publish a measurement than an estimate.
                        </p>

                        <SectionHeading section={SECTIONS.diceSize} />
                        <p>{ANSWERS.whatSize}</p>
                        <ul>
                            <li>
                                <strong>16 mm</strong> is the standard die. A {exampleGrid} portrait comes out
                                at {rowLength(EXAMPLE_SIDE, 16)} on each side.
                            </li>
                            <li>
                                <strong>12 mm</strong> packs more detail into the same wall space: the same portrait
                                shrinks to {rowLength(EXAMPLE_SIDE, 12)}.
                            </li>
                            <li>
                                <strong>Pips, not numerals.</strong> The dots are what make the shades; dice printed
                                with numerals don't give a clean scale.
                            </li>
                            <li>
                                <strong>Buy spares.</strong> Bulk packs can include chipped or misprinted dice. The{' '}
                                <Link href="/dice-art/buying-dice">buying guide</Link> covers what to check.
                            </li>
                        </ul>

                        <SectionHeading section={SECTIONS.howTo} />
                        <p>
                            Four steps: pick a photo, generate the pattern, gather the materials, then glue and
                            build. Here is the founder's own build, the piece that led to Diceify:
                        </p>
                        <figure className="my-6">
                            <div className="blog-video">
                                <iframe
                                    src={BUILD_VIDEO.embedUrl}
                                    title={BUILD_VIDEO.name}
                                    loading="lazy"
                                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                            <figcaption>
                                {BUILD_VIDEO.name}: a dice portrait built before Diceify existed.{' '}
                                <Link href="/blog/why-i-built-diceify">The story behind it.</Link>
                            </figcaption>
                        </figure>

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
                                More in <Link href="/dice-art/best-photos">best photos for dice art</Link>.
                            </li>
                        </ul>

                        <StepHeading index={1} />
                        <p>
                            <EditorLink>Open the editor</EditorLink> and upload the photo. Diceify converts it into
                            a dice grid with a live preview. Pick the grid size, then tweak contrast and brightness
                            before committing: small adjustments make a big difference in how readable the final
                            piece is. Note the black and white dice counts it shows.
                        </p>

                        <StepHeading index={2} />
                        <ul>
                            <li>
                                <strong>Dice:</strong> black and white six-sided dice with pips, all from one batch,
                                plus some spares.
                            </li>
                            <li>
                                <strong>A base:</strong> a rigid board such as plywood or MDF. Big pieces get heavy;{' '}
                                <Link href="/blog/jeremy-dice-portraits-nieces">Jeremy</Link> backed his plywood
                                with 2×4s so it wouldn't warp.
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
                            <Link href="/blog/why-i-built-diceify">our own builds</Link>, so test first. Jeremy
                            laid all his dice out dry, then moved them to the board row by row. The{' '}
                            <Link href="/dice-art/how-to-glue-dice-art">glue guide</Link> goes through both methods
                            in detail.
                        </p>
                        <p>
                            Follow the pattern row by row. Diceify's step-by-step builder highlights your current
                            position and tells you exactly which die to place next, so you can{' '}
                            <EditorLink>start building</EditorLink> without printing anything.
                        </p>

                        <div className="blog-note">
                            <strong>Tip:</strong> Start from a corner, work in one direction. If gluing, let each
                            row set for a minute before starting the next; it keeps things from shifting.
                        </div>

                        <SectionHeading section={SECTIONS.whatToBuy} />
                        <p>{ANSWERS.whatToBuy}</p>
                        <ul>
                            <li>
                                <strong>Dice, by count.</strong> Columns × rows, split into black and white. The
                                editor shows both numbers for your exact photo and settings, so{' '}
                                <EditorLink>open the editor</EditorLink> before you order. Add a handful of spares.
                            </li>
                            <li>
                                <strong>16 mm, pips not numerals, one batch per colour.</strong> Mixed batches differ
                                in size and pip style and the grid shows it. See{' '}
                                <Link href="/dice-art/buying-dice">buying dice for dice art</Link>.
                            </li>
                            <li>
                                <strong>A board.</strong> Plywood or MDF cut to the finished size from the table
                                above, plus any frame lip.
                            </li>
                            <li>
                                <strong>Glue.</strong> Wood glue, epoxy or construction adhesive; see{' '}
                                <a href={`#${STEPS[3].id}`}>glue and build</a> above and the{' '}
                                <Link href="/dice-art/how-to-glue-dice-art">glue guide</Link>.
                            </li>
                            <li>
                                <strong>A straight edge and a pencil</strong> to grid the board and keep rows tight.
                            </li>
                            <li>
                                <strong>Frame and hanging hardware</strong> that suit the finished weight; see{' '}
                                <a href={`#${SECTIONS.framing.id}`}>framing and hanging</a> below.
                            </li>
                        </ul>

                        <SectionHeading section={SECTIONS.howLong} />
                        <p>{ANSWERS.howLong}</p>
                        <p>
                            The placing itself goes faster with a guide that tracks your position. Diceify's builder
                            zooms in on the current row, tells you how many dice of the same face to place in a run,
                            and remembers where you stopped between sessions. Set aside more time for the parts no
                            tool speeds up: choosing and testing photos, cutting the board, and letting glue cure.
                        </p>

                        <SectionHeading section={SECTIONS.framing} />
                        <p>{ANSWERS.framing}</p>
                        <ul>
                            <li>
                                <strong>Board.</strong> Pick one that doesn't flex when you hold it by one edge. The
                                larger the piece, the thicker the board, and for big pieces brace the back with
                                battens the way Jeremy did with 2×4s. Canvas, foam board and hardboard sag under
                                the weight.
                            </li>
                            <li>
                                <strong>Frame.</strong> Dice stand proud of the board, so a normal picture frame is
                                too shallow. Use a shadow box or a simple wooden edge whose depth is the die height
                                plus the board thickness plus a little clearance. Glass is optional; dice are easy
                                to dust.
                            </li>
                            <li>
                                <strong>Hanging.</strong> Hang from the board, not from the frame. Use a French cleat
                                or two D-rings and wire, each rated for at least twice the finished weight. Fix them
                                into a stud or a masonry anchor, not plain drywall. Weight grows with the dice
                                count, so a 100×100 piece needs hardware in a different class from a 30×30.
                            </li>
                            <li>
                                <strong>Sealing.</strong> Dice don't need sealing. A clear coat adds shine but can
                                cloud or trap bubbles, which is what went wrong on{' '}
                                <Link href="/blog/why-i-built-diceify">our own build</Link>. If you want a coat,
                                test it on spare dice first.
                            </li>
                            <li>
                                <strong>Dusting.</strong> Pips trap dust. A soft brush or a dry microfibre cloth
                                every few weeks is enough; avoid wet cleaning near the glue line.
                            </li>
                        </ul>

                        <SectionHeading section={SECTIONS.whatYouGet} />
                        <p>{ANSWERS.whatYouGet}</p>
                        <ul>
                            <li>
                                <strong>Free (Explorer):</strong> upload any photo, tune the grid with a full live
                                preview, read off the exact black and white dice counts, share a link with a social card once signed in,
                                and use the builder for the first {FREE_BUILDER_ROWS} rows. Sign in (free) to save
                                projects to your account and open them on another device. No account is needed to
                                try it.
                            </li>
                            <li>
                                <strong>Creator pass (${CREATOR_PRICE}, {CREATOR_DAYS} days)</strong> and{' '}
                                <strong>Studio (${STUDIO_MONTHLY}/month or ${STUDIO_YEARLY}/year):</strong> unlimited
                                builder rows and a full-resolution SVG blueprint of the whole grid. The SVG opens in
                                any browser or vector app and prints at any size.
                            </li>
                            <li>
                                <strong>Not yet:</strong> there is no PDF export today. If you need paper, print the
                                SVG. See how this compares with other tools in{' '}
                                <Link href="/best-dice-art-generators">best dice art generators</Link>.
                            </li>
                        </ul>

                        <SectionHeading section={SECTIONS.examples} />
                        <p>
                            Here are some dice portrait patterns generated with Diceify. Each shows the grid size in
                            its name; the dice count is the grid's columns times rows:
                        </p>

                        <div className="grid grid-cols-2 gap-3 my-8 rounded-xl overflow-hidden">
                            {EXAMPLE_IMAGES.map(img => (
                                <div key={img.src} className="relative aspect-square rounded-lg overflow-hidden">
                                    <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="(max-width: 768px) 45vw, 350px" />
                                </div>
                            ))}
                        </div>
                        <p>
                            More patterns, with their grids and dice counts, in the{' '}
                            <Link href="/gallery">dice art gallery</Link>. For photos of real builds, see the{' '}
                            <Link href="/blog/why-i-built-diceify">founder's story</Link> and{' '}
                            <Link href="/blog/jeremy-dice-portraits-nieces">Jeremy's portraits</Link>.
                        </p>

                        <SectionHeading section={SECTIONS.faq} />
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
                            <EditorLink className="btn-primary">Start creating</EditorLink>
                        </div>

                        <SectionHeading section={SECTIONS.goDeeper} />
                        <ul>
                            {GUIDES.map(({ href, title, blurb }) => (
                                <li key={href}>
                                    <Link href={href}>{title}</Link> — {blurb}
                                </li>
                            ))}
                        </ul>
                        <p>
                            Written by <Link href={AUTHOR.path}>{AUTHOR.name}</Link>, who built the Umm Kulthum
                            portrait above and then built Diceify. Size figures use {dicePerSquareFoot(16)} dice per
                            square foot at 16 mm and {dicePerSquareFoot(12)} at 12 mm.
                        </p>
                    </div>
                </article>
            </div>
        </>
    )
}
