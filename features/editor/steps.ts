// The editor's step machine: pure data + transition rules. `useStepNavigation` applies them to the stores.

import type { GridPos } from '@/core/dice'

export const STEPS = ['upload', 'crop', 'tune', 'build'] as const
export type Step = (typeof STEPS)[number]

export const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload',
  crop: 'Crop',
  tune: 'Tune',
  build: 'Build',
}

export const stepIndex = (step: Step): number => STEPS.indexOf(step)

export function nextStep(step: Step): Step | null {
  return STEPS[stepIndex(step) + 1] ?? null
}

export function prevStep(step: Step): Step | null {
  return STEPS[stepIndex(step) - 1] ?? null
}

/** May the user leave `step` forwards? (upload needs an image, crop needs a crop; tune always; build has no next.) */
export function canAdvance(step: Step, state: { hasImage: boolean; hasCrop: boolean }): boolean {
  switch (step) {
    case 'upload':
      return state.hasImage
    case 'crop':
      return state.hasCrop
    case 'tune':
      return true
    case 'build':
      return false
  }
}

/** Leaving the build step with progress needs a confirmation (the progress may be reset by a parameter change). */
export function needsResetConfirm(from: Step, to: Step, progress: GridPos): boolean {
  return from === 'build' && to !== 'build' && (progress.x !== 0 || progress.y !== 0)
}
