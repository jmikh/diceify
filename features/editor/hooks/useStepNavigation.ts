import { useCallback } from 'react'
import { canAdvance, needsResetConfirm, nextStep, prevStep, type Step } from '../steps'
import { useDocumentStore } from '../store/useDocumentStore'
import { useEditorUiStore } from '../store/useEditorUiStore'
import { useProjectStore } from '../store/useProjectStore'

/**
 * The one way to move between steps. Entering build goes through `enterBuild()` (progress reset when the
 * params drifted); leaving build with progress opens the reset confirmation, which completes the move.
 */
export function useStepNavigation() {
  const step = useEditorUiStore((s) => s.step)
  const hasImage = useProjectStore((s) => s.imageSrc !== null)
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
    canGoNext: next !== null && canAdvance(step, { hasImage, hasCrop }),
    canGoBack: prev !== null,
    goNext: () => next && goTo(next),
    goBack: () => prev && goTo(prev),
    goTo,
  }
}
