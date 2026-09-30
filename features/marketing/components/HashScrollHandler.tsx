"use client"

import { useEffect } from 'react'

/**
 * Handles hash-based scrolling after page hydration.
 * This is needed because Suspense boundaries can delay rendering,
 * causing the browser's native hash scroll to fail.
 */
export function HashScrollHandler() {
    useEffect(() => {
        const hash = window.location.hash
        if (hash) {
            // Small delay to ensure Suspense boundaries have resolved
            const timeoutId = setTimeout(() => {
                const element = document.querySelector(hash)
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                }
            }, 100)

            return () => clearTimeout(timeoutId)
        }
    }, [])

    return null
}
