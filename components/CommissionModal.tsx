'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { X } from 'lucide-react'
import Image from 'next/image'
import { sendGAEvent } from '@next/third-parties/google'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { DiceSVGRenderer } from '@/lib/dice/svg-renderer'

// Constants
const PRICE_PER_DICE = 0.5
const MINIMUM_PRICE = 1500
const PREMIUM_DELIVERY_COST = 500
const DICE_SIZE_MM = 16

export default function CommissionModal() {
    const { data: session } = useSession()

    // Get state from store
    const showCommissionModal = useEditorStore(state => state.showCommissionModal)
    const setShowCommissionModal = useEditorStore(state => state.setShowCommissionModal)
    const diceStats = useEditorStore(state => state.diceStats)
    const diceGrid = useEditorStore(state => state.diceGrid)

    const [isLoading, setIsLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [selectedOption, setSelectedOption] = useState<'standard' | 'premium' | null>(null)
    const svgRendererRef = useRef<DiceSVGRenderer>()

    // Get values from store
    const diceCount = diceStats.totalCount
    const gridWidth = diceGrid?.width || 0
    const gridHeight = diceGrid?.height || 0

    // Calculate price (with minimum)
    const calculatedPrice = diceCount * PRICE_PER_DICE
    const finalPrice = Math.max(calculatedPrice, MINIMUM_PRICE)
    const premiumPrice = finalPrice + PREMIUM_DELIVERY_COST

    // Calculate art dimensions
    const widthMm = gridWidth * DICE_SIZE_MM
    const heightMm = gridHeight * DICE_SIZE_MM
    const widthInches = (widthMm / 25.4).toFixed(1)
    const heightInches = (heightMm / 25.4).toFixed(1)
    const widthCm = (widthMm / 10).toFixed(1)
    const heightCm = (heightMm / 10).toFixed(1)

    // Generate SVG content for art preview
    const artPreviewSvg = useMemo(() => {
        if (!diceGrid) return ''

        if (!svgRendererRef.current) {
            svgRendererRef.current = new DiceSVGRenderer()
        }

        const cols = diceGrid.width
        const rows = diceGrid.height
        const svgElements: string[] = []

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const dice = diceGrid.dice[x][y]
                const svgY = rows - 1 - y
                const renderer = svgRendererRef.current!
                const diceSvg = (renderer as any).getSvgDice(dice.face, dice.color, dice.rotate90 || false)
                svgElements.push(
                    `<svg x='${x}' y='${svgY}' width='1' height='1' viewBox='0 0 100 100'>${diceSvg}</svg>`
                )
            }
        }

        return svgElements.join('\n')
    }, [diceGrid])

    // Fire analytics event when modal opens
    useEffect(() => {
        if (showCommissionModal) {
            sendGAEvent('event', 'commission_modal_view', {
                dice_count: diceCount,
                calculated_price: finalPrice
            })
        }
    }, [showCommissionModal, diceCount, finalPrice])

    // Reset state when modal closes
    useEffect(() => {
        if (!showCommissionModal) {
            setShowSuccess(false)
            setSelectedOption(null)
        }
    }, [showCommissionModal])

    if (!showCommissionModal) return null

    const onClose = () => setShowCommissionModal(false)

    const handleOrder = async (isPremium: boolean) => {
        const eventName = isPremium ? 'commission_premium_click' : 'commission_buy_click'
        sendGAEvent('event', eventName, {
            dice_count: diceCount,
            price: isPremium ? premiumPrice : finalPrice,
            is_premium: isPremium
        })

        setSelectedOption(isPremium ? 'premium' : 'standard')

        // Check if logged in
        if (!session?.user) {
            useEditorStore.getState().setAuthModalMessage("Sign in to be notified when our commission service launches!")
            useEditorStore.getState().setShowAuthModal(true)
            onClose()
            return
        }

        // Save commission interest to database
        setIsLoading(true)
        try {
            const response = await fetch('/api/user/commission-interest', {
                method: 'POST',
            })

            if (response.ok) {
                sendGAEvent('event', 'commission_interest_logged', {
                    dice_count: diceCount,
                    price: isPremium ? premiumPrice : finalPrice,
                    is_premium: isPremium
                })
                setShowSuccess(true)
            }
        } catch (error) {
            console.error('Failed to save commission interest:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="glass relative w-full max-w-lg p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                {/* Glow Effects */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-[var(--pink-glow)] rounded-full blur-[80px] pointer-events-none opacity-50" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none opacity-50" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 z-10"
                >
                    <X size={20} className="text-white/60 hover:text-white transition-colors" />
                </button>

                {showSuccess ? (
                    // Success State
                    <div className="relative z-10 py-4 text-center">
                        <div className="relative w-20 h-20 mb-6 mx-auto">
                            <Image
                                src="/icon.svg"
                                alt="Diceify Icon"
                                fill
                                className="object-contain drop-shadow-[0_0_20px_rgba(236,72,153,0.6)]"
                            />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Thank You for Your Interest</h2>
                        <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto mb-6">
                            Our commission service is coming soon. We'll notify you as soon as it becomes available so you can place your order.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all"
                        >
                            Got it
                        </button>
                    </div>
                ) : (
                    // Order Form State
                    <div className="relative z-10 w-full">
                        {/* Header */}
                        <div className="mb-5 text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Commission Your Masterpiece</h2>
                            <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto">
                                Turn your design into a stunning handcrafted piece of art, professionally framed and ready to display
                            </p>
                        </div>

                        {/* Art Preview */}
                        {diceGrid && (
                            <div className="mb-5 flex justify-center">
                                <div
                                    className="overflow-visible"
                                    style={{
                                        width: 'min(200px, 100%)',
                                        aspectRatio: `${gridWidth} / ${gridHeight}`,
                                        outline: '4px solid #000',
                                        outlineOffset: '0px',
                                    }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                                        preserveAspectRatio="xMidYMid meet"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            height: '100%',
                                            imageRendering: 'crisp-edges',
                                        }}
                                    >
                                        <rect width={gridWidth} height={gridHeight} fill="#e5e5e5" />
                                        <g dangerouslySetInnerHTML={{ __html: artPreviewSvg }} />
                                    </svg>
                                </div>
                            </div>
                        )}

                        {/* Price & Details Card */}
                        <div className="mb-5 p-5 rounded-xl bg-white/5 border border-white/10">
                            {/* Price */}
                            <div className="text-4xl font-bold text-white mb-1">
                                {formatPrice(selectedOption === 'premium' ? premiumPrice : finalPrice)}
                            </div>

                            {/* Details Row */}
                            <div className="flex items-center justify-center gap-3 text-sm text-white/50 mb-4">
                                <span>{diceCount.toLocaleString()} dice</span>
                                <span>•</span>
                                <span>{widthInches}" × {heightInches}"</span>
                                <span>•</span>
                                <span>Framed</span>
                            </div>

                            {/* Delivery Toggle */}
                            <div className="flex gap-2 p-1 rounded-lg bg-white/5">
                                <button
                                    onClick={() => setSelectedOption('standard')}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${selectedOption !== 'premium'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/50 hover:text-white/70'
                                        }`}
                                >
                                    Standard (~60 days)
                                </button>
                                <button
                                    onClick={() => setSelectedOption('premium')}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${selectedOption === 'premium'
                                        ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white border border-purple-500/30'
                                        : 'text-white/50 hover:text-white/70'
                                        }`}
                                >
                                    Rush +$500 (~30 days)
                                </button>
                            </div>
                        </div>

                        {/* What's Included */}
                        <div className="mb-5 text-left text-sm text-white/60 space-y-2">
                            <div className="flex items-start gap-2">
                                <span className="text-pink-400 mt-0.5">✓</span>
                                <span>Each die hand-placed with precision by our artisans</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-pink-400 mt-0.5">✓</span>
                                <span>Premium modern frame included, ready to hang</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-pink-400 mt-0.5">✓</span>
                                <span>Worldwide shipping with tracking & insurance</span>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={() => handleOrder(selectedOption === 'premium')}
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-lg shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : 'Place Order'}
                        </button>

                        {/* Footer Note */}
                        <p className="mt-4 text-center text-xs text-white/30">
                            Handcrafted with care • Ships worldwide
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
