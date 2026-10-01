// Auth actions. State lives in features/account/useUser.tsx (ProfileProvider), which subscribes to the client's
// auth events; these are the imperative calls the UI makes.

import { getSupabase } from './client'

/**
 * Start the Google OAuth round trip; the browser leaves the page. `redirectTo` must be an absolute URL on the
 * Supabase redirect allow-list (see docs/DEPLOY.md). Throws the AuthError when the request cannot be started, so
 * the sign-in modal can show it instead of looking like a cancelled login.
 */
export async function signInWithGoogle(redirectTo: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { prompt: 'select_account' } },
  })
  if (error) throw error
}

/**
 * Sign out everywhere. auth-js only emits SIGNED_OUT when it actually removed the local session, and a sign-out
 * whose network call fails returns early without removing anything — so the local keys are wiped regardless and
 * the caller clears its own state instead of waiting for the event.
 */
export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut({ scope: 'global' })
  if (error) console.warn('[auth] signOut:', error.message)
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('sb-'))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // storage unavailable (private mode / SSR) — nothing to wipe
  }
}

/** The current user's JWT, for raw `fetch` calls that bypass supabase-js (C3's keepalive flush). */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.access_token ?? null
}

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in')
    this.name = 'NotSignedInError'
  }
}

/** The signed-in user's id for writes that name the owner (rows, storage paths); throws `NotSignedInError`. */
export async function currentUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new NotSignedInError()
  return id
}
