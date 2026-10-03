// Content of the /dice-art guide: every number the page quotes, the answers it shows (and reuses in its FAQPage
// structured data), the section anchors other pages link to, and the embedded build video. The page itself is
// JSX only; keep facts here so they can't drift between the copy and the schema.

import { PLAN_LIMITS, PRICING } from '@/core/billing'
import { THRESHOLDS } from '@/core/dice'
import { BUILD_VIDEO_ID, BUILD_VIDEO_URL, FOUNDER_NAME } from '@/lib/schema'

// --- Physical size: dice laid edge to edge, frame not included -------------------------------------------------

const MM_PER_INCH = 25.4
const MM_PER_FOOT = 304.8
export const GRID_SIDES = [20, 30, 40, 50, 70, 100]
export const EXAMPLE_SIDE = 50

export const formatCount = (n: number) => n.toLocaleString('en-US')
export const gridLabel = (side: number) => `${side}×${side}`
/** Length of `dice` dice of `dieMm` in a row, e.g. "80 cm (31.5 in)". */
export const rowLength = (dice: number, dieMm: number) =>
    `${Math.round((dice * dieMm) / 10)} cm (${((dice * dieMm) / MM_PER_INCH).toFixed(1)} in)`
export const dicePerSquareFoot = (dieMm: number) => Math.round((MM_PER_FOOT / dieMm) ** 2)

const exampleGrid = gridLabel(EXAMPLE_SIDE)
const exampleDice = formatCount(EXAMPLE_SIDE ** 2)

// --- The 12-shade scale, darkest first (THRESHOLDS lists the brightest step first) ------------------------------

const SHADES_DARK_TO_LIGHT = [...THRESHOLDS.both].reverse()
/** "black 1, black 2, … white 2, white 1": the text equivalent of the SVG scale. */
export const SHADE_ORDER = SHADES_DARK_TO_LIGHT.map(({ color, face }) => `${color} ${face}`).join(', ')

// --- Plans, as the guide describes them --------------------------------------------------------------------------

export const FREE_BUILDER_ROWS = PLAN_LIMITS.explorer.builderRowLimit ?? 0
export const CREATOR_PRICE = PRICING.creator.price
export const CREATOR_DAYS = PRICING.creator.accessDays
export const STUDIO_MONTHLY = PRICING.studio.monthlyPrice
export const STUDIO_YEARLY = PRICING.studio.yearlyPrice

// --- Answers: each is shown on the page verbatim and reused by the FAQ structured data -----------------------

export const ANSWERS = {
    whatIs: 'Dice art is a mosaic made from ordinary six-sided dice. Each die is one pixel of the picture, and the face turned up sets its shade. Using black and white dice together gives 12 shades, enough to make a face recognizable.',
    howItWorks: 'A dice art generator turns the photo to grayscale, splits it into a grid with one cell per die, averages each cell into a single brightness value, and picks the die color and face that best match it. Because every cell is averaged, even a low-resolution photo works.',
    whyBoth: 'Even a black die showing 6 is still mostly black, and a white die showing 6 is still mostly white. So black dice alone can\'t make light tones, and white dice alone can\'t make dark ones. Together they cover the full range in 12 shades, which is what makes a portrait read clearly.',
    howMany: `Multiply the grid's columns by its rows: a ${exampleGrid} portrait uses ${exampleDice} dice. Small portraits use about 400–900 dice (20×20 to 30×30), medium ones 1,600–2,500 (40×40 to 50×50), and large pieces 5,000 or more.`,
    howBig: `Multiply the dice per side by the die size: a ${exampleGrid} portrait is ${rowLength(EXAMPLE_SIDE, 16)} on each side with standard 16 mm dice, or ${rowLength(EXAMPLE_SIDE, 12)} with 12 mm dice. One square foot holds about ${dicePerSquareFoot(16)} dice at 16 mm (${dicePerSquareFoot(12)} at 12 mm).`,
    whatSize: 'Use 16 mm six-sided dice with pips (dots): it is the standard die size and the easiest to find in bulk. 12 mm dice fit the same grid into a piece three-quarters the width. Buy all the dice from one batch so they match in size and pip style.',
    glue: 'Either spread glue on the base and press each die in (slower, more control), or lay every die out dry and coat the top with resin or glue (faster, but bubbles or a cloudy coat can ruin the piece). Use a rigid base such as plywood or MDF, and test your adhesive on a small patch first.',
    whatToBuy: 'You need black and white 16 mm dice with pips (the generator tells you how many of each), a rigid board such as plywood or MDF cut to the finished size, glue, a straight edge, and a frame or hanging hardware that suits the weight.',
    howLong: 'A small 20×20 portrait (400 dice) takes 2–4 hours. A 40×40 piece (1,600 dice) takes roughly a full day of placing with the builder. The whole project can take far longer once you count testing photos, building a frame and gluing: Jeremy\'s two 1,645-dice portraits took 100+ hours each.',
    framing: 'Mount the dice on a rigid board, not on canvas or foam. If you want a frame, use a shadow box or a wooden edge at least as deep as the die plus the board. Hang from the board with a French cleat or D-rings rated for at least twice the piece\'s weight. Sealing is optional. Dust with a soft brush.',
    whatYouGet: `Free: a full live preview, the exact black and white dice counts, a shareable link with a social card (after a free sign-in), and the first ${FREE_BUILDER_ROWS} rows of the step-by-step builder. Paid plans unlock unlimited builder rows and a full-resolution SVG blueprint: the Creator pass ($${CREATOR_PRICE} for ${CREATOR_DAYS} days) or Studio ($${STUDIO_MONTHLY}/month or $${STUDIO_YEARLY}/year). There is no PDF export today.`,
    buyBulk: 'Amazon, gaming supply stores, and educational supply stores all sell packs of 100–1,000. Get uniform 16 mm dice: they give the cleanest grid.',
    pixelArt: 'Both are grid-based. Pixel art uses colored squares (unlimited colors). Dice art uses six-sided dice (up to 12 shades) and has a physical, three-dimensional quality you can\'t get with flat media.',
    resolution: 'No. The generator averages a block of pixels into each die, so a low-resolution or slightly blurry photo works fine. What matters is the crop: one face filling the frame, with clear contrast between the subject and the background.',
}

export type AnswerKey = keyof typeof ANSWERS

// --- Sections: the H2s (phrased as questions where it fits) and their anchor ids ---------------------------------

export interface Section {
    id: string
    heading: string
    /** The answer the section opens with (also a Question in the FAQPage schema). */
    answer?: AnswerKey
}

export const SECTIONS = {
    whatIs: { id: 'what-is-dice-art', heading: 'What is dice art?', answer: 'whatIs' },
    howItWorks: { id: 'how-it-works', heading: 'How does a dice art generator work?', answer: 'howItWorks' },
    whyBoth: { id: 'black-and-white-dice', heading: 'Why use both black and white dice?', answer: 'whyBoth' },
    howMany: { id: 'how-many-dice', heading: 'How many dice do you need, and how big will it be?', answer: 'howMany' },
    diceSize: { id: 'dice-size', heading: 'What size dice should you use?', answer: 'whatSize' },
    howTo: { id: 'how-to-make-dice-art', heading: 'How to make dice art (4 steps)' },
    whatToBuy: { id: 'what-to-buy', heading: 'What do you need to buy?', answer: 'whatToBuy' },
    howLong: { id: 'how-long', heading: 'How long does dice art take to build?', answer: 'howLong' },
    framing: { id: 'frame-seal-hang', heading: 'How do you frame, seal and hang dice art?', answer: 'framing' },
    whatYouGet: { id: 'what-you-get', heading: 'What you get from Diceify', answer: 'whatYouGet' },
    examples: { id: 'examples', heading: 'Dice art examples' },
    faq: { id: 'faq', heading: 'FAQ' },
    goDeeper: { id: 'go-deeper', heading: 'Go deeper' },
} satisfies Record<string, Section>

/** The H2s in page order, for the table of contents. */
export const SECTION_LIST: Section[] = Object.values(SECTIONS)

/** Questions in the FAQ block at the end. */
export const FAQ_QUESTIONS: { question: string; answer: AnswerKey }[] = [
    { question: 'Where can I buy dice in bulk?', answer: 'buyBulk' },
    { question: 'Do I need a high-resolution photo?', answer: 'resolution' },
    { question: 'How do you glue dice art?', answer: 'glue' },
    { question: "What's the difference between dice art and pixel art?", answer: 'pixelArt' },
]

/** Every question the page answers, for the FAQPage schema: the section openers, then the FAQ block. */
export const ALL_QUESTIONS: { question: string; answer: AnswerKey }[] = [
    ...SECTION_LIST.flatMap(s => (s.answer ? [{ question: s.heading, answer: s.answer }] : [])),
    ...FAQ_QUESTIONS,
]

export const STEPS = [
    { id: 'pick-your-image', name: 'Pick your image' },
    { id: 'generate-the-pattern', name: 'Generate the pattern' },
    { id: 'gather-materials', name: 'Gather materials' },
    { id: 'glue-and-build', name: 'Glue and build' },
]

// --- The founder's build video -----------------------------------------------------------------------------------

export const BUILD_VIDEO = {
    name: 'Umm Kulthum in dice',
    description: `${FOUNDER_NAME} builds a dice portrait of the singer Umm Kulthum from black and white dice, the project that led him to make Diceify.`,
    embedUrl: `https://www.youtube.com/embed/${BUILD_VIDEO_ID}`,
    contentUrl: BUILD_VIDEO_URL,
    thumbnailUrl: `https://i.ytimg.com/vi/${BUILD_VIDEO_ID}/hqdefault.jpg`,
    /** The founder's blog post date; the YouTube upload date could not be verified. */
    uploadDate: '2024-01-24',
}

// --- Related pages (the "Go deeper" list and its ItemList schema) ---------------------------------------------

export const GUIDES: { href: string; title: string; blurb: string }[] = [
    { href: '/dice-art/size-calculator', title: 'Dice art size calculator', blurb: 'dice count and finished size for any grid and die size.' },
    { href: '/dice-art/buying-dice', title: 'Buying dice for dice art', blurb: 'what to look for, how many spares, where to buy.' },
    { href: '/dice-art/how-to-glue-dice-art', title: 'How to glue dice art', blurb: 'adhesives, both methods, and the mistakes to avoid.' },
    { href: '/dice-art/best-photos', title: 'Best photos for dice art', blurb: 'crop, contrast and lighting that survive the grid.' },
    { href: '/gallery', title: 'Dice art gallery', blurb: 'portraits and mosaics generated with Diceify.' },
    { href: '/blog/why-i-built-diceify', title: 'Why I built Diceify', blurb: 'the Umm Kulthum build, the resin mistake, and the tool that came out of it.' },
    { href: '/blog/jeremy-dice-portraits-nieces', title: 'How Jeremy made dice portraits for his nieces', blurb: 'two 1,645-dice builds, 100+ hours each.' },
    { href: '/best-dice-art-generators', title: 'Best dice art generators compared', blurb: 'seven tools compared feature by feature, and why Diceify comes out on top.' },
    { href: '/about', title: 'About Diceify', blurb: 'who makes it and how the algorithm works.' },
]
