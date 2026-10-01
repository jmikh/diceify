import { useCallback } from 'react'
import { canAdvance, canEnter, needsResetConfirm, nextStep, prevStep, type Step } from '../steps'
import { useDocumentStore } from '../store/useDocumentStore'
import { useEditorUiStore } from '../store/useEditorUiStore'

/**
 * The one way to move between steps. Entering build goes through `enterBuild()` (progress reset when the
 * params drifted); leaving build with progress opens the reset confirmation, which completes the move.
 */
export function useStepNavigation() {
  const step = useEditorUiStore((s) => s.step)
  const hasCrop = useDocumentStore((s) => s.crop !== null)

  const goTo = useCallback((to: Step) => {
    const ui = useEditorUiStore.getState()
    const doc = useDocumentStore.getState()
    if (needsResetConfirm(ui.step, to, doc.buildProgress)) {
      ui.openModal('resetProgress', { pendingStep: to })
      return
    }
    if (to === 'build') doc.enterBuild()
    ui.setStep(to)
  }, [])

  const next = nextStep(step)
  const prev = prevStep(step)

  return {
    step,
    canGoNext: next !== null && canAdvance(step, { hasCrop }),
    canGoBack: prev !== null,
    /** Whether a step tab may be jumped to. */
    canGoTo: (to: Step) => canEnter(to, { hasCrop }),
    goNext: () => next && goTo(next),
    goBack: () => prev && goTo(prev),
    goTo,
  }
}
