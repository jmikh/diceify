'use client'

import { useSession } from "next-auth/react"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export default function CheckoutSuccessHandler({ onComplete }: { onComplete: () => void }) {
    const { update } = useSession()
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

        // Force session update to fetch new data from DB
        // This updates the JWT with the new claims (isPro: true)
        update().then(() => {
            // Remove the success param AND refresh server data
            router.replace('/', { scroll: false })
            router.refresh()
            if (onCompleteRef.current) {
                onCompleteRef.current()
            }
        })
    }, [update, router])

    return null
}
