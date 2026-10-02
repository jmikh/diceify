"use client"

import { useEffect, useRef } from "react"
import { identifyUser, resetUser, setUserProperties } from "@/lib/analytics"
import { useUser } from "./useUser"

/** Ties analytics to the signed-in user and their plan. Mount inside a ProfileProvider. */
export function AnalyticsTracker() {
    const { user, profile, entitlements } = useUser()
    const userId = user?.id ?? null
    // Explorer defaults stand in while the profile loads: wait for the real plan
    const plan = profile ? entitlements.plan : null
    const previousUserId = useRef<string | null>(null)

    useEffect(() => {
        if (userId) identifyUser(userId)
        // Only a sign-out resets: a signed-out arrival would otherwise start a new anonymous visitor on every load
        else if (previousUserId.current) resetUser()
        previousUserId.current = userId
    }, [userId])

    useEffect(() => {
        if (userId && plan) setUserProperties({ plan })
    }, [userId, plan])

    return null
}
