'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, MoreHorizontal } from 'lucide-react'
import { RiProgress5Line } from 'react-icons/ri'
import { FaAmazon } from 'react-icons/fa'
import { sendGAEvent } from '@next/third-parties/google'
import { useBuildNavigation } from '@/components/Editor/Builder/useBuildNavigation'
import { useBlueprintDownload } from '@/components/Editor/Builder/useBlueprintDownload'
import { DICE_PURCHASE_URL } from '@/components/Editor/Builder/constants'
import ProgressPreviewModal from '@/components/ProgressPreviewModal'

/**
 * Mobile build toolbar: position + progress readout and large navigation
 * targets in the thumb zone. Secondary actions (view progress, buy dice,
 * download blueprint) live behind the "more" toggle.
 */
export default function MobileBuildControls() {
    const {
        currentX,
        currentY,
        totalDice,
        currentIndex,
        navigatePrev,
        navigateNext,
        navigatePrevDiff,
        navigateNextDiff,
        canNavigate
    } = useBuildNavigation()

    const [showProgressModal, setShowProgressModal] = useState(false)
    const [showMore, setShowMore] = useState(false)
    const handleDownloadSvg = useBlueprintDownload()

    const percentage = totalDice > 0 ? (currentIndex / totalDice) * 100 : 0

    const secondaryButtonClass = 'flex-1 h-11 rounded-xl border border-white/10 active:bg-white/10 text-white/70 font-medium transition-all flex items-center justify-center gap-1.5 text-xs'

    return (
        <div className="bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-3">
            {/* Secondary actions */}
            {showMore && (
                <div className="flex gap-2">
                    <button onClick={() => setShowProgressModal(true)} className={secondaryButtonClass}>
                        <RiProgress5Line size={15} />
                        <span>Progress</span>
                    </button>
                    <a
                        href={DICE_PURCHASE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => sendGAEvent('event', 'purchase_dice_click', { label: 'amazon_affiliate' })}
                        className={secondaryButtonClass}
                    >
                        <FaAmazon size={15} />
                        <span>Buy Dice</span>
                    </a>
                    <button onClick={handleDownloadSvg} className={`${secondaryButtonClass} relative`}>
                        <Download size={15} />
                        <span>Blueprint</span>
                        {/* PRO Badge */}
                        <span
                            className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide"
                            style={{
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                color: '#1a1a2e',
                                boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4)'
                            }}
                        >
                            PRO
                        </span>
                    </button>
                </div>
            )}

            {/* Position + progress readout */}
            <div className="flex items-center gap-3 px-1">
                <span className="text-xs text-white/60 whitespace-nowrap tabular-nums">
                    Col <span className="text-white font-semibold" data-testid="build-pos-x">{currentX + 1}</span>
                    {' · '}
                    Row <span className="text-white font-semibold" data-testid="build-pos-y">{currentY + 1}</span>
                </span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
                    <div
                        className="h-full bg-pink-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="text-xs text-white/60 whitespace-nowrap tabular-nums">
                    {percentage === 100 ? 'Done' : `${percentage.toFixed(1)}%`}
                </span>
            </div>

            {/* Navigation row - next is the primary action */}
            <div className="flex items-center gap-2">
                <button
                    onClick={navigatePrevDiff}
                    disabled={!canNavigate.prevDiff}
                    className="w-12 min-h-[3.25rem] flex items-center justify-center rounded-xl bg-white/5 active:bg-white/15 text-white/80 transition-all disabled:opacity-30"
                    aria-label="Previous different dice"
                >
                    <ChevronsLeft size={22} />
                </button>

                <button
                    onClick={navigatePrev}
                    disabled={!canNavigate.prev}
                    className="flex-1 min-h-[3.25rem] flex items-center justify-center rounded-xl bg-white/5 active:bg-white/15 text-white/80 transition-all disabled:opacity-30"
                    aria-label="Previous dice"
                >
                    <ChevronLeft size={26} />
                </button>

                <button
                    onClick={navigateNext}
                    disabled={!canNavigate.next}
                    className="flex-[2] min-h-[3.25rem] flex items-center justify-center rounded-xl bg-pink-500 active:bg-pink-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all disabled:opacity-30 disabled:shadow-none"
                    aria-label="Next dice"
                >
                    <ChevronRight size={28} />
                </button>

                <button
                    onClick={navigateNextDiff}
                    disabled={!canNavigate.nextDiff}
                    className="w-12 min-h-[3.25rem] flex items-center justify-center rounded-xl bg-white/5 active:bg-white/15 text-white/80 transition-all disabled:opacity-30"
                    aria-label="Next different dice"
                >
                    <ChevronsRight size={22} />
                </button>

                <button
                    onClick={() => setShowMore(prev => !prev)}
                    className={`w-10 min-h-[3.25rem] flex items-center justify-center rounded-xl transition-colors ${showMore ? 'bg-white/15 text-white' : 'text-white/50 active:bg-white/10'}`}
                    aria-label="More actions"
                >
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Progress Preview Modal */}
            <ProgressPreviewModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
            />
        </div>
    )
}
