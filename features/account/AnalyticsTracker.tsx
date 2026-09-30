"use client"

import { useEffect } from "react"
import type { User } from "next-auth"
import { sendGAEvent } from "@next/third-parties/google"

interface AnalyticsTrackerProps {
    user?: User
}

export function AnalyticsTracker({ user }: AnalyticsTrackerProps) {
    useEffect(() => {
        if (user?.id) {
            // Identifying the user in GA4
            // Note: We use the 'config' command to set user_id for subsequent events
            // Since @next/third-parties doesn't expose gtag directly easily, we can use the window object or send a custom event with user params

            if (typeof window !== 'undefined' && (window as any).gtag) {
                (window as any).gtag('config', 'G-BDR76Z4JEE', {
                    user_id: user.id
                })
            }

            // Also send a login event
            sendGAEvent('event', 'login', {
                method: 'google', // Assuming google for now, or could pass provider
                user_id: user.id
            })
        }
    }, [user?.id])

    return null
}
