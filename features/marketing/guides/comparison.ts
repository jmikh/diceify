// Facts for /best-dice-art-generators. Every competitor cell was read on that tool's own public page on CHECKED_ON;
// anything a page did not state is NOT_LISTED, never a guess. Diceify's cells come from the code (core/dice,
// core/billing, features/editor). Re-check the sources before changing CHECKED_ON.

import { DICE_PARAM_BOUNDS } from '@/core/dice'
import { PLAN_LIMITS, PRICING } from '@/core/billing'

export const CHECKED_ON = 'October 3, 2026'
export const CHECKED_ON_ISO = '2026-10-03'
export const NOT_LISTED = 'Not listed'

const FREE_ROWS = PLAN_LIMITS.explorer.builderRowLimit ?? 0
const { min: MIN_ROWS, max: MAX_ROWS } = DICE_PARAM_BOUNDS.numRows

export interface Tool {
    name: string
    /** Public URL (external for competitors, '/' for Diceify). */
    url: string
    platform: string
    price: string
    account: string
    gridRange: string
    colourModes: string
    tuning: string
    diceCounts: string
    builder: string
    exports: string
    processing: string
    mobile: string
    /** Where this tool is the better fit. */
    bestFor: string
}

/** Rows of the feature table, in the order the page shows them (Diceify first, then web tools, then apps/CLI). */
export const COMPARISON_COLUMNS: { key: keyof Omit<Tool, 'name' | 'url' | 'bestFor'>; label: string }[] = [
    { key: 'platform', label: 'Runs on' },
    { key: 'price', label: 'Price' },
    { key: 'account', label: 'Account needed' },
    { key: 'gridRange', label: 'Grid range' },
    { key: 'colourModes', label: 'Colour modes' },
    { key: 'tuning', label: 'Tuning controls' },
    { key: 'diceCounts', label: 'Exact dice counts' },
    { key: 'builder', label: 'Step-by-step builder' },
    { key: 'exports', label: 'Export formats' },
    { key: 'processing', label: 'Where the photo is processed' },
    { key: 'mobile', label: 'Mobile' },
]

export const DICEIFY: Tool = {
    name: 'Diceify',
    url: '/',
    platform: 'Web (any modern browser)',
    price: `Free: preview, exact counts, image download, first ${FREE_ROWS} builder rows. Paid: Creator $${PRICING.creator.price} for ${PRICING.creator.accessDays} days, or Studio $${PRICING.studio.monthlyPrice}/month or $${PRICING.studio.yearlyPrice}/year`,
    account: 'No, to generate and tune. Yes, to save to the cloud, share a link or buy a plan',
    gridRange: `${MIN_ROWS}–${MAX_ROWS} rows; columns follow the crop (1:1, 3:4, 4:3, 2:3 or 16:9)`,
    colourModes: 'Black, white, or both (12 shades)',
    tuning: 'Crop with rotation, contrast, brightness (gamma), sharpening, rotate the 6, 3 and 2 faces 90°',
    diceCounts: 'Yes: total, black and white, live while you tune',
    builder: 'Yes: row by row, highlights the current die, counts runs of identical dice, tracks progress',
    exports: 'Image download (free), SVG blueprint (paid). No PDF',
    processing: 'In the browser. Anonymous drafts stay on the device; the photo is uploaded only when you sign in and save a project',
    mobile: 'Yes, a separate mobile layout in the browser',
    bestFor: 'Black-and-white portraits you plan to build by hand, with a builder that tracks where you are',
}

export const COMPETITORS: Tool[] = [
    {
        name: 'diceartgenerator.io',
        url: 'https://diceartgenerator.io/',
        platform: 'Web',
        price: 'Free ("100% Free")',
        account: 'No ("No Sign-up")',
        gridRange: `${NOT_LISTED} (examples use 50×50)`,
        colourModes: 'Colour schemes listed as Black, White, Red and Blue',
        tuning: 'Contrast slider, colour scheme',
        diceCounts: 'Yes ("Dice Count 2,500")',
        builder: NOT_LISTED,
        exports: 'PDF template, image download',
        processing: 'In the browser ("never uploaded")',
        mobile: 'Yes ("Works on any device")',
        bestFor: 'A free printable PDF template with coordinates, and no account at all',
    },
    {
        name: 'diceartgenerator.com',
        url: 'https://diceartgenerator.com/',
        platform: 'Web',
        price: 'Free ("completely free")',
        account: NOT_LISTED,
        gridRange: `Columns setting with an Auto option; maximum ${NOT_LISTED.toLowerCase()}`,
        colourModes: NOT_LISTED,
        tuning: 'Contrast, brightness, orientation, "zero dot" toggle, die size 12 / 16 / 25 mm',
        diceCounts: 'Yes, per face value',
        builder: NOT_LISTED,
        exports: 'Printable blueprint; file format not listed',
        processing: 'In the browser ("never leave your device")',
        mobile: NOT_LISTED,
        bestFor: 'Counts per face value and a die-size setting that includes 25 mm',
    },
    {
        name: 'diceart.me',
        url: 'https://diceart.me/',
        platform: 'Web, in six languages',
        price: 'Free generations ("3000+ Free Generations"); also sells 10 mm precision dice and templates',
        account: 'A sign-in exists; whether it is required is not listed',
        gridRange: `${NOT_LISTED} (templates list up to 19,200 dice)`,
        colourModes: NOT_LISTED,
        tuning: '"Dice density, contrast, and more"; brightness and contrast appear in template links',
        diceCounts: 'Yes, with an estimated assembly time',
        builder: NOT_LISTED,
        exports: 'Blueprints; file format not listed',
        processing: NOT_LISTED,
        mobile: NOT_LISTED,
        bestFor: 'Ready-made templates, a non-English interface, or buying matched 10 mm dice from the same site',
    },
    {
        name: 'Dice Art Studio',
        url: 'https://myojostudio.itch.io/dice-art-studio',
        platform: 'Windows 10+ download (itch.io)',
        price: '$5.99 or more',
        account: 'An itch.io purchase',
        gridRange: 'Up to 512×512',
        colourModes: 'Custom colours and textures for the die surface and pips',
        tuning: 'Image conversion to a placement guide; controls not listed',
        diceCounts: NOT_LISTED,
        builder: 'Placement "as if you were filling in a jigsaw puzzle"',
        exports: NOT_LISTED,
        processing: 'On your PC',
        mobile: 'No (Windows only)',
        bestFor: 'Very large or coloured virtual dice art on a Windows PC, with a controller',
    },
    {
        name: 'DiceMosaic',
        url: 'https://play.google.com/store/apps/details?id=com.edalba.dicemosaic',
        platform: 'Android app',
        price: 'Free, contains ads',
        account: NOT_LISTED,
        gridRange: 'You set the rows; columns follow the image. Limits not listed',
        colourModes: 'Dice values 0–6 or a custom set; colours not listed',
        tuning: NOT_LISTED,
        diceCounts: NOT_LISTED,
        builder: 'Yes: an assistant that names each die, and a browse mode die by die',
        exports: NOT_LISTED,
        processing: 'On the phone (Play listing: "No data collected")',
        mobile: 'Android only',
        bestFor: 'Building from an Android phone with a die-by-die assistant and several saved projects',
    },
    {
        name: 'lmarzen/dice-mosaic (open source)',
        url: 'https://github.com/lmarzen/dice-mosaic',
        platform: 'Command line (C, GPL-3.0)',
        price: 'Free, open source',
        account: 'No',
        gridRange: 'Scale factor, width, height or a maximum die count',
        colourModes: 'All black, all white, or mixed',
        tuning: 'Scale options; no tone sliders listed',
        diceCounts: NOT_LISTED,
        builder: 'No; writes a text file that maps die values',
        exports: 'PNG or JPEG, plus a text map',
        processing: 'On your computer',
        mobile: 'No',
        bestFor: 'Scripting, batch runs, or reading how the mapping works in code',
    },
]

/** What the competitor's review page said about Diceify on CHECKED_ON. */
export const COMPETITOR_REVIEW = {
    url: 'https://diceartgenerator.io/blog/best-dice-art-generators/',
    site: 'diceartgenerator.io',
    dated: 'January 15, 2026',
    rating: '3/5',
    cons: ['No PDF export', 'Limited customization options', 'No project information'],
    privacyClaim: 'Server upload',
}
