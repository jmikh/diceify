'use client'

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/features/account/useUser"
import { syncBilling } from "@/lib/supabase/billing"

// TODO(D2): checkout returns to /account?checkout=success, which polls the billing sync until isPro flips;
// this handler (mounted by the landing Pricing section on ?success=) goes away with it.
export default function CheckoutSuccessHandler({ onComplete }: { onComplete: () => void }) {
    const { refresh } = useUser()
    const router = useRouter()

    const hasUpdated = useRef(false)
    const onCompleteRef = useRef(onComplete)

    // Update ref when prop changes to keep it fresh without triggering effect
    useEffect(() => {
        onCompleteRef.current = onComplete
    }, [onComplete])

    useEffect(() => {
        if (hasUpdated.current) return
        hasUpdated.current = true

        // Pull the snapshot from Stripe (the webhook may not have landed yet), refetch the profile so the new
        // plan is reflected, then drop the success param. D2 adds polling until isPro flips.
        syncBilling()
            .catch((error) => console.warn('[billing] sync after checkout failed:', error))
            .then(() => refresh())
            .then(() => {
                router.replace('/', { scroll: false })
                onCompleteRef.current()
            })
    }, [refresh, router])

    return null
}
