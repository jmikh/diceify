"use client"

import { sendGAEvent } from '@next/third-parties/google'
import { useEditorStore } from '@/lib/store/useEditorStore'

interface UpgradeButtonProps {
    className?: string
    source?: string
}

export const UpgradeButton = ({ className, source }: UpgradeButtonProps) => {
    const setShowProFeatureModal = useEditorStore(state => state.setShowProFeatureModal)

    const onUpgrade = () => {
        // Track the click event
        sendGAEvent('event', 'click_upgrade', {
            source: source || 'unknown',
        })

        // Open the upgrade modal
        setShowProFeatureModal(true)
    }

    return (
        <button
            onClick={onUpgrade}
            className={`inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-95 ${className}`}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Upgrade
        </button>
    )
}
