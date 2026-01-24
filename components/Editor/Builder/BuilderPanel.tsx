'use client'

import { useRef, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import CountUp from 'react-countup'
import { theme } from '@/lib/theme'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from 'lucide-react'
import { RiProgress5Line, RiShoppingCart2Line } from 'react-icons/ri'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { useBuildNavigation } from './useBuildNavigation'
import { sendGAEvent } from '@next/third-parties/google'
import { DiceSVGRenderer } from '@/lib/dice/svg-renderer'
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
    const { data: session } = useSession()
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
    const diceStats = useEditorStore(state => state.diceStats)
    const buildProgress = useEditorStore(state => state.buildProgress)
    const { blackCount, whiteCount, totalCount } = diceStats

    // Modal state for reset progress warning
    const [showResetModal, setShowResetModal] = useState(false)
    // Modal state for progress preview
    const [showProgressModal, setShowProgressModal] = useState(false)

    // Track previous values for smooth transitions
    const prevCountRef = useRef(totalCount)
    const prevBlackRef = useRef(blackCount)
    const prevWhiteRef = useRef(whiteCount)

    useEffect(() => {
        prevCountRef.current = totalCount
        prevBlackRef.current = blackCount
        prevWhiteRef.current = whiteCount
    }, [totalCount, blackCount, whiteCount])

    // Ease-out cubic function for smooth deceleration
    const easeOutCubic = (t: number, b: number, c: number, d: number) => {
        return c * ((t = t / d - 1) * t * t + 1) + b
    }

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

    const handleDownloadSvg = () => {
        // Check if logged in
        if (!session?.user) {
            useEditorStore.getState().setAuthModalMessage("You must be logged in to download SVG.")
            useEditorStore.getState().setShowAuthModal(true)
            return
        }

        // Check for subscription
        if (!session.user.isPro) {
            useEditorStore.getState().setShowProFeatureModal(true)
            return
        }

        const grid = useEditorStore.getState().diceGrid
        if (!grid) return

        try {
            const renderer = new DiceSVGRenderer()
            const svgString = renderer.render(grid)

            const blob = new Blob([svgString], { type: 'image/svg+xml' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `dice-art-${Date.now()}.svg`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error generating SVG:', error)
        }
    }

    return (
        <>
            {/* Build Progress Controls */}
            <div>
                <div className="space-y-6">
                    {/* Stats Section */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        {/* Total dice count */}
                        <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
                                <CountUp
                                    start={prevCountRef.current}
                                    end={totalCount}
                                    duration={1.5}
                                    separator=","
                                    useEasing={true}
                                    easingFn={easeOutCubic}
                                    preserveValue={true}
                                />
                            </div>
                            <div className="text-xs" style={{ color: theme.colors.text.muted }}>total dice</div>
                        </div>

                        {/* Proportional bar */}
                        <div className="h-4 rounded-lg overflow-hidden flex border" style={{
                            backgroundColor: theme.colors.glass.light,
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        }}>
                            {totalCount > 0 && (
                                <>
                                    <div
                                        className="bg-black transition-all"
                                        style={{
                                            width: `${(blackCount / totalCount) * 100}%`
                                        }}
                                    />
                                    <div
                                        className="bg-white transition-all"
                                        style={{
                                            width: `${(whiteCount / totalCount) * 100}%`
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        <div className="flex justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: 'black', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                                <span style={{ color: theme.colors.text.secondary }}>
                                    <CountUp
                                        start={prevBlackRef.current}
                                        end={blackCount}
                                        duration={1}
                                        separator=","
                                        useEasing={true}
                                        easingFn={easeOutCubic}
                                        preserveValue={true}
                                    />
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                                <span style={{ color: theme.colors.text.secondary }}>
                                    <CountUp
                                        start={prevWhiteRef.current}
                                        end={whiteCount}
                                        duration={1}
                                        separator=","
                                        useEasing={true}
                                        easingFn={easeOutCubic}
                                        preserveValue={true}
                                    />
                                </span>
                            </div>
                        </div>
                    </div>

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
                                    X
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
                                    Y
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
                    href="https://amzn.to/4rTDYAh"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => sendGAEvent('event', 'purchase_dice_click', { label: 'amazon_affiliate' })}
                    className="w-full py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-medium transition-all flex items-center justify-center gap-2 text-sm group"
                >
                    <RiShoppingCart2Line size={16} className="group-hover:scale-110 transition-transform" />
                    <span>Purchase Dice</span>
                </a>
            </div>

            {/* Download SVG Button */}
            <div className="mt-4">
                <button
                    onClick={handleDownloadSvg}
                    className="w-full py-3 rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2 text-sm group"
                    style={{
                        backgroundColor: theme.colors.accent.pink,
                        boxShadow: `0 0 15px ${theme.colors.accent.pink}40`
                    }}
                >
                    <Download size={16} className="group-hover:scale-110 transition-transform" />
                    <span>Download SVG</span>
                </button>
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
                currentProgress={buildProgress}
            />

            {/* Progress Preview Modal */}
            <ProgressPreviewModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
            />
        </>
    )
}
