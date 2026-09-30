// Feature gating for the editor: one place decides which modal a blocked action opens.

import { useCallback } from 'react'
import type { Entitlements } from '@/core/billing'
import { useUser, type UserInfo } from '@/features/account/useUser'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'

export type GateModal = 'limit' | 'proFeature'

export interface GateOptions {
  /** Copy for the sign-in modal shown to anonymous users (its default otherwise). */
  signInMessage?: string
  /** Modal for signed-in users without the entitlement (default: the upgrade modal). */
  modal?: GateModal
}

export type GateAction =
  | { kind: 'allow' }
  | { kind: 'signIn'; message?: string }
  | { kind: 'modal'; modal: GateModal }

/** Pure decision: allowed → proceed; anonymous → sign in; signed in → the limit/upgrade modal. */
export function resolveGate(allowed: boolean, signedIn: boolean, options: GateOptions = {}): GateAction {
  if (allowed) return { kind: 'allow' }
  if (!signedIn) return { kind: 'signIn', message: options.signInMessage }
  return { kind: 'modal', modal: options.modal ?? 'proFeature' }
}

export interface Gate {
  ent: Entitlements
  user: UserInfo | null
  /** Opens the right modal when `allowed` is false. Returns `allowed`. */
  gate: (allowed: boolean, options?: GateOptions) => boolean
}

export function useGate(): Gate {
  const { entitlements: ent, user } = useUser()
  const openModal = useEditorUiStore((state) => state.openModal)

  const gate = useCallback(
    (allowed: boolean, options?: GateOptions) => {
      const action = resolveGate(allowed, user !== null, options)
      if (action.kind === 'signIn') openModal('signIn', { message: action.message })
      else if (action.kind === 'modal') openModal(action.modal)
      return action.kind === 'allow'
    },
    [user, openModal],
  )

  return { ent, user, gate }
}
