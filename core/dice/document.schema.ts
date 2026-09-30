// Zod schema for the persisted ProjectDocument (validated on load and before save). zod is core's only
// external dependency.

import { z } from 'zod'

export const CURRENT_SCHEMA_VERSION = 1

export const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '2:3', '16:9'] as const
export const DOCUMENT_STEPS = ['crop', 'tune', 'build'] as const
export const COLOR_MODES = ['both', 'black', 'white'] as const

/** Slider ranges (single source for the tune controls). */
export const DICE_PARAM_BOUNDS = {
  numRows: { min: 20, max: 120 },
  contrast: { min: 0, max: 100 },
  gamma: { min: 0.5, max: 1.5 },
  edgeSharpening: { min: 0, max: 100 },
} as const

const bounded = (b: { min: number; max: number }) => z.number().min(b.min).max(b.max)

export const diceParamsSchema = z.strictObject({
  numRows: bounded(DICE_PARAM_BOUNDS.numRows).int(),
  colorMode: z.enum(COLOR_MODES),
  contrast: bounded(DICE_PARAM_BOUNDS.contrast),
  gamma: bounded(DICE_PARAM_BOUNDS.gamma),
  edgeSharpening: bounded(DICE_PARAM_BOUNDS.edgeSharpening),
  rotate6: z.boolean(),
  rotate3: z.boolean(),
  rotate2: z.boolean(),
})

export const cropParamsSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  aspectRatio: z.enum(ASPECT_RATIOS),
})

export const gridSizeSchema = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const gridPosSchema = z.strictObject({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
})

export const projectDocumentSchema = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  step: z.enum(DOCUMENT_STEPS),
  crop: cropParamsSchema.nullable(),
  dice: diceParamsSchema,
  grid: gridSizeSchema.nullable(),
  buildProgress: gridPosSchema,
})
