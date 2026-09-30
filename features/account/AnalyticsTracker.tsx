"use client"

import { useEffect } from "react"
import { sendGAEvent } from "@next/third-parties/google"
import { useUser } from "./useUser"

/** Identifies the signed-in user in GA4. Mount inside a ProfileProvider. */
export function AnalyticsTracker() {
    const userId = useUser().user?.id

    useEffect(() => {
        if (userId) {
            // Identifying the user in GA4
            // Note: We use the 'config' command to set user_id for subsequent events
            // Since @next/third-parties doesn't expose gtag directly easily, we can use the window object or send a custom event with user params

            if (typeof window !== 'undefined' && (window as any).gtag) {
                (window as any).gtag('config', 'G-BDR76Z4JEE', {
                    user_id: userId
                })
            }

            // Also send a login event
            sendGAEvent('event', 'login', {
                method: 'google', // Assuming google for now, or could pass provider
                user_id: userId
            })
        }
    }, [userId])

    return null
}
