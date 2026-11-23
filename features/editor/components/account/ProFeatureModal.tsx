'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { CheckoutPlan, Plan } from '@/core/billing'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { EDITOR_CANCEL_PATH, signInThenCheckoutPath } from '@/features/billing/checkout'
import { StudioCard } from '@/features/billing/PricingCards'
import SignInModal from '@/features/account/SignInModal'
import { flushSave } from '@/features/editor/store/autosave'

export default function ProFeatureModal() {
    const showProFeatureModal = useEditorUiStore(state => state.modal === 'proFeature')
    const closeModal = useEditorUiStore(state => state.closeModal)

    const [isLoading, setIsLoading] = useState<CheckoutPlan | null>(null)
    // A signed-out price click: the plan to check out once signed in (the sign-in modal is open while set)
    const [signInPlan, setSignInPlan] = useState<CheckoutPlan | null>(null)
    const [showAlreadyProModal, setShowAlreadyProModal] = useState(false)
    const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)

    if (!showProFeatureModal) return null

    const handleAuthRequired = (plan: CheckoutPlan) => {
        setSignInPlan(plan)
    }

    const handleAlreadyPro = (plan: Plan) => {
        setCurrentPlan(plan)
        setShowAlreadyProModal(true)
    }

    const getAlreadyProMessage = () => {
        switch (currentPlan) {
            case 'lifetime':
                return "You have lifetime access with all premium features. Thank you for being an early supporter!"
            case 'studio':
                return "You already have the Studio plan with all premium features."
            case 'creator':
                return "You have an active Creator pass with all premium features. Studio is available once it ends."
            default:
                return "You have an active plan with all premium features."
        }
    }

    return (
        <>
            {/* A bottom drawer on mobile (< lg, as the editor shell), a centred dialog on desktop */}
            <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-4">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={closeModal}
                />

                {/* Modal */}
                <div className="glass relative w-full lg:max-w-md overflow-hidden rounded-b-none lg:rounded-[1.25rem] p-6 lg:p-8 flex flex-col border-accent-pink/20 animate-sheet-up lg:animate-none">
                    {/* Glow Effects */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-[var(--pink-glow)] rounded-full blur-[80px] pointer-events-none opacity-30" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none opacity-30" />

                    {/* Close button */}
                    <button
                        onClick={closeModal}
                        className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 z-10"
                    >
                        <X size={20} className="text-white/60 hover:text-white transition-colors" />
                    </button>

                    {/* Header */}
                    <div className="text-center mb-6 relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h2>
                        <p className="text-[var(--text-muted)] text-sm">
                            Unlock mixed dice, unlimited building and printable HD blueprints.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <StudioCard
                            source="pro_feature_modal"
                            onAuthRequired={handleAuthRequired}
                            cancelPath={EDITOR_CANCEL_PATH}
                            onAlreadyPro={handleAlreadyPro}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                        />
                    </div>

                    {/* The drawer clears the home indicator */}
                    <div className="lg:hidden flex-shrink-0" style={{ height: 'env(safe-area-inset-bottom)' }} />
                </div>
            </div>

            {/* Auth Modal */}
            <SignInModal
                open={signInPlan !== null}
                onClose={() => setSignInPlan(null)}
                message="Sign in to continue to checkout."
                onBeforeSignIn={flushSave}
                redirectTo={signInPlan ? signInThenCheckoutPath(signInPlan) : undefined}
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
                                        closeModal()
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAlreadyProModal(false)
                                        closeModal()
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-accent-pink to-purple-600 hover:from-accent-pink-light hover:to-purple-500 text-white font-medium transition-all text-center"
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
