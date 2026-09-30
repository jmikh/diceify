// Brightness → die mapping. Formulas and tables are documented in core/README.md.

import type { ColorMode, DiceColor, DiceFace, DiceParams, Die } from './types'

export function toGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

export function applyGamma(gray: number, gamma: number): number {
  return gamma === 1 ? gray : 255 * Math.pow(gray / 255, 1 / gamma)
}

export function applyContrast(gray: number, contrast: number): number {
  if (contrast <= 0) return gray
  const adjusted = 128 + (gray - 128) * (1 + contrast / 100)
  return Math.max(0, Math.min(255, adjusted))
}

export interface ThresholdStep {
  /** Inclusive lower bound of the brightness range that maps to this die. */
  min: number
  face: DiceFace
  color: DiceColor
}

/**
 * Per mode, steps in descending `min` order; the last step is the catch-all (min 0).
 * Values are the ones the app has always shipped — change only together with the fixtures.
 */
export const THRESHOLDS: Record<ColorMode, readonly ThresholdStep[]> = {
  both: [
    { min: 217, face: 1, color: 'white' },
    { min: 192, face: 2, color: 'white' },
    { min: 166, face: 3, color: 'white' },
    { min: 141, face: 4, color: 'white' },
    { min: 115, face: 5, color: 'white' },
    { min: 90, face: 6, color: 'white' },
    { min: 64, face: 6, color: 'black' },
    { min: 51, face: 5, color: 'black' },
    { min: 39, face: 4, color: 'black' },
    { min: 26, face: 3, color: 'black' },
    { min: 13, face: 2, color: 'black' },
    { min: 0, face: 1, color: 'black' },
  ],
  black: [
    { min: 141, face: 6, color: 'black' },
    { min: 115, face: 5, color: 'black' },
    { min: 90, face: 4, color: 'black' },
    { min: 64, face: 3, color: 'black' },
    { min: 39, face: 2, color: 'black' },
    { min: 0, face: 1, color: 'black' },
  ],
  white: [
    { min: (255 * 5) / 6, face: 1, color: 'white' }, // 212.5
    { min: (255 * 4) / 6, face: 2, color: 'white' }, // 170
    { min: (255 * 3) / 6, face: 3, color: 'white' }, // 127.5
    { min: (255 * 2) / 6, face: 4, color: 'white' }, // 85
    { min: (255 * 1) / 6, face: 5, color: 'white' }, // 42.5
    { min: 0, face: 6, color: 'white' },
  ],
}

export function mapBrightnessToDie(brightness: number, mode: ColorMode): { face: DiceFace; color: DiceColor } {
  const steps = THRESHOLDS[mode]
  const last = steps.length - 1
  for (let i = 0; i < last; i++) {
    const step = steps[i]
    if (brightness >= step.min) return { face: step.face, color: step.color }
  }
  return { face: steps[last].face, color: steps[last].color }
}

export type RotationParams = Pick<DiceParams, 'rotate6' | 'rotate3' | 'rotate2'>

export function shouldRotate(face: DiceFace, params: RotationParams): boolean {
  return (params.rotate6 && face === 6) || (params.rotate3 && face === 3) || (params.rotate2 && face === 2)
}

/** The per-cell pipeline: gamma → contrast → threshold → rotation flag. */
export function mapGrayToDie(gray: number, params: DiceParams): Die {
  const brightness = applyContrast(applyGamma(gray, params.gamma), params.contrast)
  const { face, color } = mapBrightnessToDie(brightness, params.colorMode)
  return shouldRotate(face, params) ? { face, color, rotate90: true } : { face, color }
}
