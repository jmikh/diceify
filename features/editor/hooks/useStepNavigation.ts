import { useCallback } from 'react'
import { trackStepChange } from '../analytics'
import { canAdvance, canEnter, needsResetConfirm, nextStep, prevStep, type Step } from '../steps'
import { useDocumentStore } from '../store/useDocumentStore'
import { useEditorUiStore } from '../store/useEditorUiStore'
import { useDesignLocks } from './useDesignLocks'
import { useGate } from './useGate'

/**
 * The one way to move between steps. Entering build goes through `enterBuild()` (progress reset when the
 * params drifted) and is paywalled while the design uses settings the plan lacks (`useDesignLocks`); leaving
 * build with progress opens the reset confirmation, which completes the move.
 */
export function useStepNavigation() {
  const step = useEditorUiStore((s) => s.step)
  const hasCrop = useDocumentStore((s) => s.crop !== null)
  const { gate } = useGate()
  const buildLocked = useDesignLocks().length > 0

  const goTo = useCallback((to: Step) => {
    const ui = useEditorUiStore.getState()
    const doc = useDocumentStore.getState()
    if (to === 'build' && !gate(!buildLocked, 'build')) return
    if (needsResetConfirm(ui.step, to, doc.buildProgress)) {
      ui.openModal('resetProgress', { pendingStep: to })
      return
    }
    if (to === 'build') doc.enterBuild()
    trackStepChange(ui.step, to)
    ui.setStep(to)
  }, [gate, buildLocked])

  const next = nextStep(step)
  const prev = prevStep(step)

  return {
    step,
    canGoNext: next !== null && canAdvance(step, { hasCrop }),
    canGoBack: prev !== null,
    /** The next step is paywalled (show a lock on the button; it opens the paywall). */
    nextLocked: next === 'build' && buildLocked,
    /** Whether a step tab may be jumped to. */
    canGoTo: (to: Step) => canEnter(to, { hasCrop }),
    goNext: () => next && goTo(next),
    goBack: () => prev && goTo(prev),
    goTo,
  }
}
