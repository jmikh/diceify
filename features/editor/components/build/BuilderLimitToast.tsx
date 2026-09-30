'use client'

import { useSession } from 'next-auth/react'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
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
            useEditorUiStore.getState().openModal('signIn', { message: "Sign in to upgrade your account" })
            return
        }

        // User is logged in but not pro - show upgrade modal
        useEditorUiStore.getState().openModal('proFeature')
    }

    return (
        <div
            className="absolute top-6 left-1/2 -translate-x-1/2 z-20 hidden sm:flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-5 py-3 rounded-xl backdrop-blur-md border animate-in fade-in slide-in-from-top-2 duration-300"
            style={{
                // Leave 80px on each side to avoid zoom buttons (right-6 + w-10 + buffer)
                maxWidth: 'calc(100% - 250px)',
                backgroundColor: 'rgba(15, 15, 18, 0.75)',
                borderColor: 'var(--border-glass)',
                boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 20px var(--pink-glow)`,
            }}
        >
            {/* Message */}
            <span
                className="text-sm font-medium text-center sm:text-left"
                style={{ color: 'var(--text-secondary)' }}
            >
                Explorer builder limited to first 5 rows
            </span>

            {/* Upgrade Button */}
            <button
                onClick={handleUpgrade}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                style={{
                    background: `linear-gradient(135deg, var(--pink), var(--accent-purple))`,
                    color: '#fff',
                    boxShadow: `0 2px 10px var(--pink-glow)`,
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
