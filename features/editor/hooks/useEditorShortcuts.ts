// The editor's one global keydown listener: cmd/ctrl-z (shift = redo) everywhere, arrow keys on the build step.
// Ignored while typing in a field. Mounted once in app/editor/page.tsx.

import { useEffect } from 'react'
import { useBuildGate } from '@/components/Editor/Builder/useBuildNavigation'
import { currentTargets, moveTo } from '../store/buildNavigation'
import { useDocumentStore } from '../store/useDocumentStore'
import { useEditorUiStore } from '../store/useEditorUiStore'

function isTypingTarget(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

export function useEditorShortcuts(): void {
  const gate = useBuildGate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget()) return
      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        const history = useDocumentStore.temporal.getState()
        if (e.shiftKey) history.redo()
        else history.undo()
        return
      }
      if (meta || e.altKey) return

      const ui = useEditorUiStore.getState()
      if (ui.step !== 'build' || ui.modal) return

      // Shift jumps to the next different die, falling back to a plain step when the row has none
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const targets = currentTargets()
        const target =
          e.key === 'ArrowLeft'
            ? (e.shiftKey && targets.prevDiff) || targets.prev
            : (e.shiftKey && targets.nextDiff) || targets.next
        moveTo(target, gate)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [gate])
}
