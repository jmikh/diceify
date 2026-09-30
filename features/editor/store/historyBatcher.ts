// Collapses a continuous gesture (slider drag, cropper drag) into one undo entry. Ported from recordio's
// useHistoryBatcher: a "latch" pauses zundo after the first entry a gesture records, a reference counter lets
// nested/overlapping gestures share that entry. See plans/revamp/revamp-tiered-plan.md → "Editor state".

import { useDocumentStore } from './useDocumentStore'

/** The slice of a zundo temporal store the batcher drives. */
interface TemporalApi {
  getState: () => {
    isTracking: boolean
    pastStates: unknown[]
    pause: () => void
    resume: () => void
  }
}

export interface HistoryBatcher {
  startInteraction: () => void
  endInteraction: () => void
  /** Run a store update; inside an interaction only the first update that records history keeps its entry. */
  batchAction: (action: () => void) => void
  /** Run a store update that never records history and leaves the redo stack alone (widget corrections). */
  untracked: (action: () => void) => void
}

/**
 * Builds a batcher bound to one temporal store. Its functions are stable module-level closures, so they are
 * safe in dependency arrays and callable outside React.
 */
export function createHistoryBatcher(getTemporal: () => TemporalApi): HistoryBatcher {
  let interactionCount = 0
  let hasLatched = false

  const startInteraction = () => {
    if (interactionCount === 0) {
      hasLatched = false
      const temporal = getTemporal().getState()
      if (!temporal.isTracking) temporal.resume()
    }
    interactionCount++
  }

  const endInteraction = () => {
    interactionCount--
    if (interactionCount <= 0) {
      interactionCount = 0
      hasLatched = false
      getTemporal().getState().resume()
    }
  }

  const batchAction = (action: () => void) => {
    const before = getTemporal().getState().pastStates.length
    action()
    const historyAdded = getTemporal().getState().pastStates.length > before

    // Latch only once zundo actually recorded an entry: the first update of a gesture may be a no-op
    // (clicking a slider thumb at its current value) and must not swallow the real first change.
    if (interactionCount > 0 && !hasLatched && historyAdded) {
      getTemporal().getState().pause()
      hasLatched = true
    }
  }

  const untracked = (action: () => void) => {
    const temporal = getTemporal().getState()
    const wasTracking = temporal.isTracking
    temporal.pause()
    try {
      action()
    } finally {
      if (wasTracking) getTemporal().getState().resume()
    }
  }

  return { startInteraction, endInteraction, batchAction, untracked }
}

export const documentHistoryBatcher = createHistoryBatcher(() => useDocumentStore.temporal)

/** Hook-shaped accessor for components. */
export const useDocumentHistoryBatcher = (): HistoryBatcher => documentHistoryBatcher
