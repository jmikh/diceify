// The guide spokes under /dice-art (plus the generator comparison): titles, descriptions, dates, images and the
// section anchors each page's table of contents and headings share. Routes read this; the copy lives in content/.

export const GUIDE_AUTHOR = { name: 'John Mikhail', path: '/about' }
export const PILLAR_PATH = '/dice-art'

export interface GuideSection {
    id: string
    heading: string
}

export interface Guide {
    /** URL path, e.g. '/dice-art/size-calculator'. */
    path: string
    /** <title> without the site suffix. */
    title: string
    /** The H1 (may differ from the title). */
    h1: string
    description: string
    /** The pill above the H1. */
    label: string
    /** Existing image under public/, used by the Article schema. */
    image: string
    datePublished: string
    dateModified: string
    sections: GuideSection[]
}

const DATE = '2026-10-03'

const guide = (g: Omit<Guide, 'datePublished' | 'dateModified'>): Guide => ({ ...g, datePublished: DATE, dateModified: DATE })

export const SIZE_CALCULATOR = guide({
    path: '/dice-art/size-calculator',
    title: 'Dice Art Size Calculator: How Many Dice, How Big',
    h1: 'Dice Art Size Calculator: How Many Dice, How Big',
    description: 'Dice count and finished size for every grid the Diceify editor makes: 5 aspect ratios, 20 to 120 rows, 16 mm and 12 mm dice, in cm and inches. Plus dice per square foot.',
    label: 'Planning guide',
    image: '/images/kobe-71x71.webp',
    sections: [
        { id: 'quick-answer', heading: 'The quick answer' },
        { id: 'how-the-math-works', heading: 'How the math works' },
        { id: 'size-tables', heading: 'Size tables by aspect ratio' },
        { id: 'dice-per-square-foot', heading: 'Dice per square foot' },
        { id: 'black-vs-white-counts', heading: 'Black vs white counts' },
        { id: 'pick-the-grid', heading: 'Pick the grid for the photo and the wall' },
        { id: 'weight-and-cost', heading: 'Weight and cost' },
    ],
})

export const BUYING_DICE = guide({
    path: '/dice-art/buying-dice',
    title: 'Buying Dice for Dice Art: Size, Pips, Bulk Sources',
    h1: 'Buying Dice for Dice Art: Size, Pips, Bulk Sources',
    description: '16 vs 12 vs 10 mm dice, why pips beat numerals, why one batch per colour matters, game vs precision tolerance, where to buy in bulk, how many spares, and whether a kit is worth it.',
    label: 'Buying guide',
    image: '/images/dice-art/kids-50x50-both.webp',
    sections: [
        { id: 'what-to-buy', heading: 'What to buy, in one paragraph' },
        { id: 'die-size', heading: '16 mm, 12 mm or 10 mm?' },
        { id: 'pips-not-numerals', heading: 'Pips, not numerals' },
        { id: 'one-batch-per-colour', heading: 'One batch per colour' },
        { id: 'tolerance', heading: 'Game dice vs precision dice' },
        { id: 'how-many-to-order', heading: 'How many to order' },
        { id: 'where-to-buy', heading: 'Where to buy dice in bulk' },
        { id: 'prices', heading: 'What dice cost' },
        { id: 'kit-worth-it', heading: 'Is a dice art kit worth it?' },
        { id: 'what-else-you-need', heading: 'What else you need' },
    ],
})

export const HOW_TO_GLUE = guide({
    path: '/dice-art/how-to-glue-dice-art',
    title: 'How to Glue Dice Art: Adhesives, Boards, Two Methods',
    h1: 'How to Glue Dice Art: Adhesives, Boards and Two Build Methods',
    description: 'Which glue holds dice to a board (PVA, E6000-type, epoxy, construction adhesive, resin), which board to use, and whether to dry-lay first or glue as you go. With the mistakes we made.',
    label: 'Build guide',
    image: '/images/blog/jeremy-dice-portrait.webp',
    sections: [
        { id: 'short-version', heading: 'The short version' },
        { id: 'adhesives', heading: 'Adhesives compared' },
        { id: 'board', heading: 'Choosing the board' },
        { id: 'two-methods', heading: 'Dry-lay vs glue-as-you-go' },
        { id: 'resin', heading: 'The resin flood coat, and how it went wrong for us' },
        { id: 'bracing', heading: 'Keep the board flat: bracing' },
        { id: 'materials', heading: 'Materials list' },
        { id: 'row-by-row', heading: 'Gluing row by row' },
    ],
})

export const BEST_PHOTOS = guide({
    path: '/dice-art/best-photos',
    title: 'Best Photos for Dice Art: Pick, Crop and Tune',
    h1: 'Best Photos for Dice Art: Pick, Crop and Tune',
    description: 'What makes a photo work in black and white dice: a tight crop, one subject, a plain background and real contrast. Why resolution barely matters, and how grid size and colour mode change the result.',
    label: 'Photo guide',
    image: '/images/dice-art/kids-50x50-both.webp',
    sections: [
        { id: 'what-works', heading: 'What works, in short' },
        { id: 'crop-tight', heading: 'Crop tighter than you think' },
        { id: 'one-subject', heading: 'One subject, plain background' },
        { id: 'contrast', heading: 'Contrast is the whole game' },
        { id: 'resolution', heading: 'Why low resolution is fine' },
        { id: 'grid-size', heading: 'How grid size changes the result' },
        { id: 'colour-mode', heading: 'Black, white or both' },
        { id: 'tune', heading: 'Tune before you commit' },
    ],
})

export const BEST_GENERATORS = guide({
    path: '/best-dice-art-generators',
    title: 'Best Dice Art Generators Compared (October 2026)',
    h1: 'Best Dice Art Generators Compared',
    description: 'Diceify ranks #1 of 7 dice art generators: the only web tool with a row-by-row builder, an SVG blueprint and sharpening. Compared on features, exports and price.',
    label: 'Comparison',
    image: '/images/dice-art/kids-50x50-both.webp',
    sections: [
        { id: 'verdict', heading: 'The verdict: Diceify is the best dice art generator' },
        { id: 'comparison-table', heading: 'Feature table' },
        { id: 'builder', heading: 'The builder: why it changes how you build' },
        { id: 'svg', heading: 'SVG: the sharpest pattern at any zoom' },
        { id: 'customization', heading: 'The most control over your pattern' },
        { id: 'rankings', heading: 'The rankings, tool by tool' },
        { id: 'which-to-pick', heading: 'Which one should you use?' },
        { id: 'tips', heading: 'Tips whichever tool you use' },
    ],
})

/** Guides served by the /dice-art/[slug] route, keyed by slug. */
export const DICE_ART_GUIDES: Record<string, Guide> = Object.fromEntries(
    [SIZE_CALCULATOR, BUYING_DICE, HOW_TO_GLUE, BEST_PHOTOS].map(g => [g.path.replace(`${PILLAR_PATH}/`, ''), g]),
)

export const getDiceArtGuideSlugs = (): string[] => Object.keys(DICE_ART_GUIDES)
