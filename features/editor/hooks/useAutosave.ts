import { useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { flushKeepalive, flushSave, scheduleSave, setAccessToken } from '@/features/editor/store/autosave'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'

/**
 * Mount once (in the editor screen). Wires the store subscriptions to the autosave engine
 * (features/editor/store/autosave.ts), keeps the access token the keepalive flush needs, and flushes when the
 * page is hidden or unloaded. Unmount flushes too (client-side navigation away from the editor).
 */
export function useAutosave() {
  useEffect(() => {
    const unsubscribers = [
      useDocumentStore.subscribe(scheduleSave),
      useEditorUiStore.subscribe((state) => state.step, scheduleSave),
      useDerivedStore.subscribe((state) => state.gridSize, scheduleSave),
    ]

    // INITIAL_SESSION fires on subscribe; SIGNED_IN / TOKEN_REFRESHED keep the token current, SIGNED_OUT clears it.
    const { data: auth } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null)
    })

    const onPageHide = () => flushKeepalive()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushKeepalive()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
      auth.subscription.unsubscribe()
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void flushSave()
    }
  }, [])
}
