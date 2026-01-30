'use client'

import { useSession } from 'next-auth/react'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { sendGAEvent } from '@next/third-parties/google'

export default function BuilderLimitToast() {
    const { data: session } = useSession()
    const isPro = session?.user?.isPro ?? false

    // Don't show for pro users
    if (isPro) return null

    const handleUpgrade = () => {
        sendGAEvent('event', 'click_upgrade', {
            source: 'builder_limit_toast',
        })

        // Check if logged in
        if (!session?.user) {
            useEditorStore.getState().setAuthModalMessage("Sign in to upgrade your account")
            useEditorStore.getState().setShowAuthModal(true)
            return
        }

        // User is logged in but not pro - show upgrade modal
        useEditorStore.getState().setShowProFeatureModal(true)
    }

    return (
        <div
            className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-5 py-3 rounded-xl backdrop-blur-md border animate-in fade-in slide-in-from-top-2 duration-300"
            style={{
                maxWidth: 'calc(100% - 100px)',
                backgroundColor: 'rgba(15, 15, 18, 0.75)',
                borderColor: theme.colors.glass.border,
                boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 20px ${theme.colors.glow.pink}`,
            }}
        >
            {/* Message */}
            <span
                className="text-sm font-medium text-center sm:text-left whitespace-nowrap"
                style={{ color: theme.colors.text.secondary }}
            >
                Builder limited to 100 dice on Explorer plan
            </span>

            {/* Upgrade Button */}
            <button
                onClick={handleUpgrade}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                style={{
                    background: `linear-gradient(135deg, ${theme.colors.accent.pink}, ${theme.colors.accent.purple})`,
                    color: '#fff',
                    boxShadow: `0 2px 10px ${theme.colors.glow.pink}`,
                }}
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Upgrade
            </button>
        </div>
    )
}
