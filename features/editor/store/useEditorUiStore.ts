// Transient editor UI state: the visible step and the single modal slot. Nothing here is persisted
// (the document store carries `step` into the saved document via `buildDocument`).

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Step } from '../steps'

// Modals mounted once in the editor page. Modals opened from exactly one component keep local state
// (ProgressPreviewModal, ProFeatureModal's inner sign-in) and are not listed here.
export type EditorModal = 'signIn' | 'projects' | 'limit' | 'proFeature' | 'resetProgress'

interface EditorUiState {
  step: Step
  modal: EditorModal | null
  /** Copy shown by the sign-in modal (null = its default message). */
  signInMessage: string | null
  /** Step to enter once the reset-progress confirmation is accepted. */
  pendingStep: Step | null

  setStep: (step: Step) => void
  openModal: (modal: EditorModal, options?: { message?: string; pendingStep?: Step }) => void
  closeModal: () => void
}

export const useEditorUiStore = create<EditorUiState>()(
  subscribeWithSelector((set) => ({
    step: 'upload',
    modal: null,
    signInMessage: null,
    pendingStep: null,

    setStep: (step) => set({ step }),
    openModal: (modal, options) =>
      set({ modal, signInMessage: options?.message ?? null, pendingStep: options?.pendingStep ?? null }),
    closeModal: () => set({ modal: null, signInMessage: null, pendingStep: null }),
  })),
)
