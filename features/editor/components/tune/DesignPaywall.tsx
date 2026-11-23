'use client'

import { Lock } from 'lucide-react'
import { track } from '@/lib/analytics'
import { useDesignLocks } from '@/features/editor/hooks/useDesignLocks'
import { useGate } from '@/features/editor/hooks/useGate'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { panel } from '../common/ui'
import Watermark from '../common/Watermark'

/**
 * The design paywall over the tune preview while the design uses settings the plan lacks: a light watermark on the
 * art (it stays readable, so the user sees what they would get) and an upgrade button; the controls' PRO tags say
 * which setting caused it. The design can still be built (the build step's progress preview is watermarked too); the
 * blueprint is Pro on every design (`useBlueprintDownload`).
 */
export default function DesignPaywall() {
    const locks = useDesignLocks()
    const { gate } = useGate()
    const hasPreview = useDerivedStore(state => state.previewUrl !== null)
    const gridSize = useDerivedStore(state => state.gridSize)

    if (locks.length === 0 || !hasPreview || !gridSize) return null

    const upgrade = () => {
        track('click_upgrade', { source: 'design_paywall' })
        gate(false, 'upgrade')
    }

    return (
        <>
            <Watermark width={gridSize.width} height={gridSize.height} />
            <div className="absolute top-3 inset-x-3 z-20 flex justify-center pointer-events-none">
                <button
                    onClick={upgrade}
                    className={`${panel} pointer-events-auto inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium text-white/85 hover:text-white hover:border-white/20 transition-colors`}
                >
                    <Lock size={14} className="text-accent-pink-light" />
                    Remove watermark
                </button>
            </div>
        </>
    )
}
