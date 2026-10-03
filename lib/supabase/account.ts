// The `account` edge function (supabase/functions/account): delete the signed-in user's account.

import { invokeFunction } from './functions'

export interface DeleteAccountResult {
  deleted: true
  /** What went with the account, for the log. */
  projects: number
  shares: number
  /** The Stripe subscription that was cancelled, if any. */
  cancelledSubscription: string | null
}

/**
 * Delete the account: cancels an active Stripe subscription, removes the user's images and share cards, then the
 * auth user (profile, projects and share rows cascade). The caller signs out locally afterwards.
 */
export function deleteAccount(): Promise<DeleteAccountResult> {
  return invokeFunction('account', 'delete', { method: 'POST' })
}
