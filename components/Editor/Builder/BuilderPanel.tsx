'use client'

import { useState } from 'react'
import { theme } from '@/lib/theme'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from 'lucide-react'
import { RiProgress5Line } from 'react-icons/ri'
import { FaAmazon } from 'react-icons/fa'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { useBuildNavigation } from './useBuildNavigation'
import { useBlueprintDownload } from './useBlueprintDownload'
import { DICE_PURCHASE_URL } from './constants'
import { sendGAEvent } from '@next/third-parties/google'
import DiceStatsCard from '../DiceStatsCard'
import ResetProgressModal from '@/components/ResetProgressModal'
import ProgressPreviewModal from '@/components/ProgressPreviewModal'

// --- ProgressBar Component (Exported for reuse) ---

interface ProgressBarProps {
    percentage: number
    showComplete?: boolean
    className?: string
}

export function ProgressBar({ percentage, showComplete = true, className = '' }: ProgressBarProps) {
    return (
        <div className={className}>
            <div className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: theme.colors.glass.border }}>
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: theme.colors.accent.pink
                    }}
                />
            </div>
            <div className="text-center mt-1">
                <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    {percentage === 100 && showComplete ? 'Complete' : `${percentage.toFixed(1)}%`}
                </span>
            </div>
        </div>
    )
}

// --- BuilderPanel Component ---

export default function BuilderPanel() {
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

    const setStep = useEditorStore(state => state.setStep)
    const buildProgress = useEditorStore(state => state.buildProgress)

    // Modal state for reset progress warning
    const [showResetModal, setShowResetModal] = useState(false)
    // Modal state for progress preview
    const [showProgressModal, setShowProgressModal] = useState(false)

    const handleDownloadSvg = useBlueprintDownload()

    const handleBack = () => {
        // Check if user has made progress
        if (buildProgress.x !== 0 || buildProgress.y !== 0) {
            setShowResetModal(true)
            return
        }
        setStep('tune')
    }

    const handleConfirmReset = () => {
        setShowResetModal(false)
        setStep('tune')
    }

    return (
        <>
            {/* Build Progress Controls */}
            <div>
                <div className="space-y-6">
                    {/* Stats Section */}
                    <DiceStatsCard />

                    {/* Coordinates & Controls Section */}
                    <div className="flex flex-col gap-4">

                        {/* Row 1: Coordinates (Bigger) */}
                        <div className="flex justify-center gap-4">
                            {/* X Square */}
                            <fieldset className="relative"
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    backgroundColor: theme.colors.glass.medium,
                                    border: `2px solid ${theme.colors.glass.border}`,
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: 0,
                                    padding: 0
                                }}
                            >
                                <legend style={{
                                    padding: '0 6px',
                                    marginLeft: 'auto',
                                    marginRight: 'auto',
                                    color: theme.colors.text.muted,
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    lineHeight: '1',
                                    transform: 'translateY(-2px)'
                                }}>
                                    Col
                                </legend>
                                <span className="text-white text-2xl font-bold" data-testid="build-pos-x">
                                    {currentX + 1}
                                </span>
                            </fieldset>

                            {/* Y Square */}
                            <fieldset className="relative"
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    backgroundColor: theme.colors.glass.medium,
                                    border: `2px solid ${theme.colors.glass.border}`,
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: 0,
                                    padding: 0
                                }}
                            >
                                <legend style={{
                                    padding: '0 6px',
                                    marginLeft: 'auto',
                                    marginRight: 'auto',
                                    color: theme.colors.text.muted,
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    lineHeight: '1',
                                    transform: 'translateY(-2px)'
                                }}>
                                    Row
                                </legend>
                                <span className="text-white text-2xl font-bold" data-testid="build-pos-y">
                                    {currentY + 1}
                                </span>
                            </fieldset>
                        </div>

                        {/* Row 2: Navigation Controls */}
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={navigatePrevDiff}
                                disabled={!canNavigate.prevDiff}
                                className={`p-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-white/5 hover:bg-white/20 ${canNavigate.prevDiff ? 'text-white/90' : 'text-white/50'}`}
                                title="Previous different dice"
                            >
                                <ChevronsLeft size={24} />
                            </button>

                            <button
                                onClick={navigatePrev}
                                disabled={!canNavigate.prev}
                                className={`p-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-white/5 hover:bg-white/20 ${canNavigate.prev ? 'text-white/90' : 'text-white/50'}`}
                                title="Previous dice"
                            >
                                <ChevronLeft size={24} />
                            </button>

                            <button
                                onClick={navigateNext}
                                disabled={!canNavigate.next}
                                className={`p-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-white/5 hover:bg-white/20 ${canNavigate.next ? 'text-white/90' : 'text-white/50'}`}
                                title="Next dice"
                            >
                                <ChevronRight size={24} />
                            </button>

                            <button
                                onClick={navigateNextDiff}
                                disabled={!canNavigate.nextDiff}
                                className={`p-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-white/5 hover:bg-white/20 ${canNavigate.nextDiff ? 'text-white/90' : 'text-white/50'}`}
                                title="Next different dice"
                            >
                                <ChevronsRight size={24} />
                            </button>
                        </div>
                        {/* Progress Bar */}
                        <div className="pt-2">
                            <ProgressBar percentage={totalDice > 0 ? (currentIndex / totalDice) * 100 : 0} />
                        </div>

                        {/* View Progress Button */}
                        <div className="pt-4">
                            <button
                                onClick={() => setShowProgressModal(true)}
                                className="w-full py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-medium transition-all flex items-center justify-center gap-2 text-sm group"
                            >
                                <RiProgress5Line size={16} className="group-hover:scale-110 transition-transform" />
                                <span>View Progress</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Purchase Dice Button */}
            <div className="mt-4">
                <a
                    href={DICE_PURCHASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => sendGAEvent('event', 'purchase_dice_click', { label: 'amazon_affiliate' })}
                    className="w-full py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-medium transition-all flex items-center justify-center gap-2 text-sm group"
                >
                    <FaAmazon size={16} className="group-hover:scale-110 transition-transform" />
                    <span>Purchase Dice</span>
                </a>
            </div>

            {/* Download Blueprint Button */}
            <div className="mt-4 relative">
                <button
                    onClick={handleDownloadSvg}
                    className="w-full py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-medium transition-all flex items-center justify-center gap-2 text-sm group"
                >
                    <Download size={16} className="group-hover:scale-110 transition-transform" />
                    <span>Download Blueprint</span>
                </button>
                {/* PRO Badge */}
                <div
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide"
                    style={{
                        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                        color: '#1a1a2e',
                        boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4)'
                    }}
                >
                    PRO
                </div>
            </div>

            <div className="flex-grow" />

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-white/10 flex-shrink-0">
                <button
                    onClick={handleBack}
                    className="w-full py-3.5 rounded-full border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                >
                    ← Back
                </button>
            </div>

            {/* Reset Progress Modal */}
            <ResetProgressModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={handleConfirmReset}
            />

            {/* Progress Preview Modal */}
            <ProgressPreviewModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
            />
        </>
    )
}
