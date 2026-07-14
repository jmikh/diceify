import { useEffect } from 'react'

/**
 * Keep the screen awake while `active` is true - used during the build
 * step so the display doesn't sleep while placing physical dice.
 * No-ops on browsers without the Wake Lock API.
 */
export function useWakeLock(active: boolean = true) {
    useEffect(() => {
        if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

        let sentinel: WakeLockSentinel | null = null
        let cancelled = false

        const request = async () => {
            try {
                sentinel = await navigator.wakeLock.request('screen')
            } catch {
                // Denied (e.g. battery saver) - not critical
            }
        }

        // The lock auto-releases when the tab is hidden; re-acquire on return
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && !cancelled) request()
        }

        request()
        document.addEventListener('visibilitychange', handleVisibility)

        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', handleVisibility)
            sentinel?.release().catch(() => { })
        }
    }, [active])
}
