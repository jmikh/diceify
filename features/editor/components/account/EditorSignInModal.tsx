'use client'

import SignInModal from '@/features/account/SignInModal'
import { flushSave } from '@/features/editor/store/autosave'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'

const DEFAULT_MESSAGE = 'To continue using the builder you must be signed in'

/** The store-driven sign-in modal (`modal === 'signIn'`); flushes the anonymous draft before the OAuth redirect. */
export default function EditorSignInModal() {
  const open = useEditorUiStore(state => state.modal === 'signIn')
  const message = useEditorUiStore(state => state.signInMessage)
  const closeModal = useEditorUiStore(state => state.closeModal)

  return (
    <SignInModal
      open={open}
      onClose={closeModal}
      message={message || DEFAULT_MESSAGE}
      onBeforeSignIn={flushSave}
    />
  )
}
