'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import Link from 'next/link'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { CreatorCard, StudioCard, PlanType } from '@/components/PricingCards'
import AuthModal from '@/components/AuthModal'

export default function ProFeatureModal() {
    const showProFeatureModal = useEditorStore(state => state.showProFeatureModal)
    const setShowProFeatureModal = useEditorStore(state => state.setShowProFeatureModal)

    const [isLoading, setIsLoading] = useState<PlanType | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showAlreadyProModal, setShowAlreadyProModal] = useState(false)
    const [currentPlanType, setCurrentPlanType] = useState<string | null>(null)

    if (!showProFeatureModal) return null

    const handleAuthRequired = () => {
        setShowAuthModal(true)
    }

    const handleAlreadyPro = (planType: string) => {
        setCurrentPlanType(planType)
        setShowAlreadyProModal(true)
    }

    const getAlreadyProMessage = () => {
        switch (currentPlanType) {
            case 'lifetime':
                return "You have lifetime access with all premium features. Thank you for being an early supporter!"
            case 'studio':
                return "You already have the Studio plan with all premium features."
            case 'creator':
                return "You have an active Creator pass. Want more projects? Consider upgrading to Studio!"
            default:
                return "You have an active plan with all premium features."
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowProFeatureModal(false)}
                />

                {/* Modal */}
                <div className="glass relative w-full max-w-2xl p-6 md:p-8 flex flex-col animate-in fade-in zoom-in-95 duration-200 border-pink-500/20">
                    {/* Glow Effects */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-[var(--pink-glow)] rounded-full blur-[80px] pointer-events-none opacity-30" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none opacity-30" />

                    {/* Close button */}
                    <button
                        onClick={() => setShowProFeatureModal(false)}
                        className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 z-10"
                    >
                        <X size={20} className="text-white/60 hover:text-white transition-colors" />
                    </button>

                    {/* Header */}
                    <div className="text-center mb-6 relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h2>
                        <p className="text-[var(--text-muted)] text-sm">
                            Unlock unlimited dice, SVG blueprints, and more.
                        </p>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid md:grid-cols-2 gap-4 relative z-10">
                        <CreatorCard
                            source="pro_feature_modal"
                            onAuthRequired={handleAuthRequired}
                            onAlreadyPro={handleAlreadyPro}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                        />
                        <StudioCard
                            source="pro_feature_modal"
                            onAuthRequired={handleAuthRequired}
                            onAlreadyPro={handleAlreadyPro}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                        />
                    </div>

                    {/* Maybe later link */}
                    <button
                        onClick={() => setShowProFeatureModal(false)}
                        className="mt-4 text-sm text-gray-500 hover:text-white transition-colors text-center relative z-10"
                    >
                        Maybe later
                    </button>
                </div>
            </div>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                message="Sign in to upgrade and unlock premium features."
            />

            {/* Already Pro Modal */}
            {showAlreadyProModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f0f12] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-4">
                                <Check size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">You already have access!</h3>
                            <p className="text-gray-400 mb-6">
                                {getAlreadyProMessage()}
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => {
                                        setShowAlreadyProModal(false)
                                        setShowProFeatureModal(false)
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAlreadyProModal(false)
                                        setShowProFeatureModal(false)
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium transition-all text-center"
                                >
                                    Continue Creating
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
