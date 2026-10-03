// Static size tables for /dice-art/size-calculator, computed from the editor's real crop ratios and row limits so
// the page can never disagree with the tool. Dice are laid edge to edge; the frame is not included.

import { ASPECT_RATIOS, DICE_PARAM_BOUNDS, computeGridSize, type AspectRatio } from '@/core/dice'

const MM_PER_INCH = 25.4
const MM_PER_FOOT = 304.8

/** Die sizes the tables show, largest first (16 mm is the standard game die). */
export const DIE_SIZES_MM = [16, 12] as const
export type DieMm = (typeof DIE_SIZES_MM)[number]

/** Row counts shown per ratio: the editor's min and max plus the common steps between. */
export const TABLE_ROWS: readonly number[] = (() => {
    const { min, max } = DICE_PARAM_BOUNDS.numRows
    const steps = [min, 30, 40, 50, 60, 70, 80, 100, max]
    return steps.filter((r, i) => r >= min && r <= max && steps.indexOf(r) === i)
})()

export const ROW_BOUNDS = DICE_PARAM_BOUNDS.numRows

/** `[width, height]` of a ratio such as '3:4'. */
const ratioParts = (aspect: AspectRatio): [number, number] => {
    const [w, h] = aspect.split(':').map(Number)
    return [w, h]
}

/** The editor's crop ratios with a plain-English name, landscape ratios after the square and portrait ones. */
export const RATIO_INFO: { aspect: AspectRatio; name: string; orientation: 'square' | 'portrait' | 'landscape' }[] =
    ASPECT_RATIOS.map(aspect => {
        const [w, h] = ratioParts(aspect)
        const orientation = w === h ? 'square' : w < h ? 'portrait' : 'landscape'
        const name = { '1:1': 'Square', '3:4': 'Portrait', '4:3': 'Landscape', '2:3': 'Tall portrait', '16:9': 'Wide' }[aspect]
        return { aspect, name, orientation }
    })

export interface SizeRow {
    rows: number
    cols: number
    dice: number
}

/** Columns the editor would produce for `rows` at `aspect` (same rounding as the generator). */
export function gridFor(aspect: AspectRatio, rows: number): SizeRow {
    const [w, h] = ratioParts(aspect)
    const { cols } = computeGridSize(w, h, rows)
    return { rows, cols, dice: cols * rows }
}

export const sizeTable = (aspect: AspectRatio): SizeRow[] => TABLE_ROWS.map(rows => gridFor(aspect, rows))

export const formatCount = (n: number) => n.toLocaleString('en-US')

const cm = (dice: number, dieMm: number) => Math.round((dice * dieMm) / 10)
const inches = (dice: number, dieMm: number) => Math.round((dice * dieMm) / MM_PER_INCH)

/** "80 × 80 cm" for a grid at a die size. */
export const sizeCm = (g: SizeRow, dieMm: number) => `${cm(g.cols, dieMm)} × ${cm(g.rows, dieMm)} cm`
/** "31 × 31 in", rounded to whole inches (dice alone, no frame). */
export const sizeIn = (g: SizeRow, dieMm: number) => `${inches(g.cols, dieMm)} × ${inches(g.rows, dieMm)} in`

/** Whole dice that fit in a square foot / square metre when laid edge to edge. */
export const dicePerSquareFoot = (dieMm: number) => Math.round((MM_PER_FOOT / dieMm) ** 2)
export const dicePerSquareMetre = (dieMm: number) => Math.round((1000 / dieMm) ** 2)
/** Dice per side of a square foot, e.g. 19.05 at 16 mm. */
export const dicePerFoot = (dieMm: number) => (MM_PER_FOOT / dieMm).toFixed(2)

export const DENSITY_SIZES_MM = [16, 12, 10] as const
