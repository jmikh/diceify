import { useDocumentHistory, useDocumentStore } from '../store/useDocumentStore'

const undo = () => useDocumentStore.temporal.getState().undo()
const redo = () => useDocumentStore.temporal.getState().redo()

/** Undo/redo availability + actions for the header buttons and the mobile menu. */
export function useUndoRedo() {
  const canUndo = useDocumentHistory((s) => s.pastStates.length > 0)
  const canRedo = useDocumentHistory((s) => s.futureStates.length > 0)
  return { canUndo, canRedo, undo, redo }
}
