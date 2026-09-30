'use client'

// Who is signed in and what they are entitled to. THE client source for both: components read
// `useUser()` / `useEntitlements()`, never the Supabase session directly.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { deriveEntitlements, EXPLORER_ENTITLEMENTS, type Entitlements } from '@/core/billing'
import { getSupabase } from '@/lib/supabase/client'
import { signOut as supabaseSignOut } from '@/lib/supabase/auth'
import { fetchProfile, toBillingState, type ProfileRow } from '@/lib/supabase/profile'

export type UserStatus = 'loading' | 'anon' | 'authed'

export interface UserInfo {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
}

export interface UserContextValue {
  status: UserStatus
  user: UserInfo | null
  profile: ProfileRow | null
  entitlements: Entitlements
  /** Refetch the profile (after a checkout, or when the plan may have changed). */
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

interface AuthState {
  status: UserStatus
  session: Session | null
  profile: ProfileRow | null
}

const SIGNED_OUT: AuthState = { status: 'anon', session: null, profile: null }

function userFromSession(session: Session, profile: ProfileRow | null): UserInfo {
  const meta = session.user.user_metadata ?? {}
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return {
    id: session.user.id,
    email: session.user.email ?? profile?.email ?? null,
    name: str(meta.full_name) ?? str(meta.name) ?? profile?.name ?? null,
    avatarUrl: str(meta.avatar_url) ?? str(meta.picture) ?? profile?.avatar_url ?? null,
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null, profile: null })
  // Token of the session whose profile is loaded (or loading): the same token means nothing changed.
  const loadedTokenRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async (session: Session | null) => {
    if (!session) {
      loadedTokenRef.current = null
      if (mountedRef.current) setState(SIGNED_OUT)
      return
    }
    loadedTokenRef.current = session.access_token
    let profile: ProfileRow | null = null
    try {
      profile = await fetchProfile()
    } catch (error) {
      console.warn('[auth] profile fetch failed, using explorer entitlements:', error)
    }
    // A sign-out (or a newer session) raced this fetch: its result is stale.
    if (!mountedRef.current || loadedTokenRef.current !== session.access_token) return
    setState({ status: 'authed', session, profile })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const supabase = getSupabase()

    // After the OAuth redirect this also exchanges the PKCE code in the URL for a session.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('[auth] getSession:', error.message)
      load(data.session)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        load(null)
        return
      }
      if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED' && event !== 'USER_UPDATED') return
      if (!session || session.access_token === loadedTokenRef.current) return
      // auth-js holds its lock while notifying; a PostgREST call in here would wait on that lock forever.
      setTimeout(() => load(session), 0)
    })

    return () => {
      mountedRef.current = false
      subscription.subscription.unsubscribe()
    }
  }, [load])

  const refresh = useCallback(async () => {
    const { data } = await getSupabase().auth.getSession()
    loadedTokenRef.current = null
    await load(data.session)
  }, [load])

  const signOut = useCallback(async () => {
    loadedTokenRef.current = null
    setState(SIGNED_OUT)
    await supabaseSignOut()
  }, [])

  const value = useMemo<UserContextValue>(() => {
    const { status, session, profile } = state
    return {
      status,
      user: session ? userFromSession(session, profile) : null,
      profile,
      entitlements: profile ? deriveEntitlements(toBillingState(profile), new Date()) : EXPLORER_ENTITLEMENTS,
      refresh,
      signOut,
    }
  }, [state, refresh, signOut])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser(): UserContextValue {
  const value = useContext(UserContext)
  if (!value) throw new Error('useUser() requires a <ProfileProvider> above it')
  return value
}

/** The gating source: the signed-in user's entitlements, explorer defaults while loading or anonymous. */
export function useEntitlements(): Entitlements {
  return useUser().entitlements
}
