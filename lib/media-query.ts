import { useCallback, useSyncExternalStore } from 'react'

/**
 * `window.matchMedia(query).matches`, kept in sync with the viewport. Renders `false` on the server and during
 * hydration (the desktop layout), then re-renders with the real value — no layout effect, no resize listener.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}
