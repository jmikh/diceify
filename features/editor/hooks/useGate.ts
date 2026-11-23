// Feature gating for the editor: one place decides which modal a blocked action opens.

import { useCallback } from 'react'
import type { Entitlements } from '@/core/billing'
import { track } from '@/lib/analytics'
import { useUser, type UserInfo } from '@/features/account/useUser'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'

export type GateModal = 'limit' | 'proFeature'

/** What a gate protects (the `feature` of the `paywall_shown` event). */
export type GatedFeature = 'build_limit' | 'build' | 'blueprint' | 'share' | 'upgrade'

export interface GateOptions {
  /**
   * What a blocked user lacks. A plan (default): `modal`, signed in or not — pricing comes first, and the upgrade
   * modal asks for sign-in once a price is picked. An account (share): anonymous users get the sign-in modal.
   */
  requires?: 'plan' | 'account'
  /** Account gates: copy for the sign-in modal (its default otherwise). */
  signInMessage?: string
  /** Plan gates: the modal (default: the upgrade modal). */
  modal?: GateModal
}

export type GateAction =
  | { kind: 'allow' }
  | { kind: 'signIn'; message?: string }
  | { kind: 'modal'; modal: GateModal }

/** Pure decision: allowed → proceed; an account gate while anonymous → sign in; otherwise the limit/upgrade modal. */
export function resolveGate(allowed: boolean, signedIn: boolean, options: GateOptions = {}): GateAction {
  if (allowed) return { kind: 'allow' }
  if (options.requires === 'account' && !signedIn) return { kind: 'signIn', message: options.signInMessage }
  return { kind: 'modal', modal: options.modal ?? 'proFeature' }
}

export interface Gate {
  ent: Entitlements
  user: UserInfo | null
  /** Opens the right modal (and reports `paywall_shown`) when `allowed` is false. Returns `allowed`. */
  gate: (allowed: boolean, feature: GatedFeature, options?: GateOptions) => boolean
}

export function useGate(): Gate {
  const { entitlements: ent, user } = useUser()
  const openModal = useEditorUiStore((state) => state.openModal)

  const gate = useCallback(
    (allowed: boolean, feature: GatedFeature, options?: GateOptions) => {
      const action = resolveGate(allowed, user !== null, options)
      if (action.kind === 'allow') return true
      if (action.kind === 'signIn') openModal('signIn', { message: action.message })
      else openModal(action.modal)
      track('paywall_shown', { feature, prompt: action.kind === 'signIn' ? 'sign_in' : action.modal })
      return false
    },
    [user, openModal],
  )

  return { ent, user, gate }
}
