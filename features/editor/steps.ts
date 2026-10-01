// The editor's step machine: pure data + transition rules. `useStepNavigation` applies them to the stores.
// Uploading is not a step: a photo starts a project (Start screen), which then goes crop → tune → build.

import type { DocumentStep, GridPos } from '@/core/dice'

export const STEPS = ['crop', 'tune', 'build'] as const satisfies readonly DocumentStep[]
export type Step = DocumentStep

export const STEP_LABELS: Record<Step, string> = {
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

/** May the user leave `step` forwards? (crop needs a crop; tune always; build has no next.) */
export function canAdvance(step: Step, state: { hasCrop: boolean }): boolean {
  switch (step) {
    case 'crop':
      return state.hasCrop
    case 'tune':
      return true
    case 'build':
      return false
  }
}

/** May the user jump straight to `step` (step tabs)? Crop always; tune and build once a crop exists. */
export function canEnter(step: Step, state: { hasCrop: boolean }): boolean {
  return step === 'crop' || state.hasCrop
}

/** Leaving the build step with progress needs a confirmation (the progress may be reset by a parameter change). */
export function needsResetConfirm(from: Step, to: Step, progress: GridPos): boolean {
  return from === 'build' && to !== 'build' && (progress.x !== 0 || progress.y !== 0)
}
