"use client"
import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import AuthModal from '@/components/AuthModal'
import SessionRefresher from '@/components/SessionRefresher'
import { sendGAEvent } from '@next/third-parties/google'
import { CreatorCard, StudioCard, PlanType } from '@/components/PricingCards'

export default function Pricing() {
    const [isLoading, setIsLoading] = useState<PlanType | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showAlreadyProModal, setShowAlreadyProModal] = useState(false)
    const [currentPlanType, setCurrentPlanType] = useState<string | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    const searchParams = useSearchParams()

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
        <section className="py-24 px-6 relative" id="pricing">
            {searchParams?.get('success') && (
                <SessionProvider>
                    <SessionRefresher onComplete={() => setShowSuccessModal(true)} />
                </SessionProvider>
            )}

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                message="Sign in to upgrade and unlock premium features."
            />

            {/* Already Pro Modal */}
            {showAlreadyProModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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
                                    onClick={() => setShowAlreadyProModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                                >
                                    Close
                                </button>
                                <Link
                                    href="/editor"
                                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium transition-all text-center"
                                >
                                    Go to Editor
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f0f12] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 pointer-events-none" />

                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-400 flex items-center justify-center mb-6 animate-in zoom-in duration-300 delay-150">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 mb-2">You're all set!</h3>
                            <p className="text-gray-400 mb-8 max-w-[280px]">
                                Your purchase was successful. Enjoy all premium features!
                            </p>

                            <Link
                                href="/editor"
                                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20 text-center"
                            >
                                Start Creating
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold font-syne mb-6">Choose Your Creative Journey</h2>
                    <p className="text-lg text-white/50 max-w-2xl mx-auto">
                        Start for free, then pick a plan that fits your ambitions.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
                    {/* Free Plan */}
                    <div className="glass p-6 md:p-8 rounded-[2rem] relative flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold mb-2">Explorer</h3>
                            <div className="text-3xl font-bold mb-3">Free</div>
                            <p className="text-white/50 text-sm">Perfect for exploring dice art and sharing on social media and testing the builder before committing.</p>
                        </div>

                        <ul className="space-y-3 mb-6 text-sm flex-1">
                            <li className="flex items-start gap-2.5 text-white/80">
                                <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                                <span>Generate dice art from any photo</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/80">
                                <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                                <span>Social-ready image downloads</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/80">
                                <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                                <span>Builder Studio works up to 100 dice</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/80">
                                <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                                <span>1 project in the cloud</span>
                            </li>
                        </ul>

                        <Link href="/editor" className="btn-secondary w-full justify-center text-sm mt-auto" onClick={() => sendGAEvent('event', 'go_to_editor', { source: 'pricing_free' })}>
                            Start Free
                        </Link>
                    </div>

                    {/* Creator Plan - Uses shared component with full variant */}
                    <div className="glass p-6 md:p-8 rounded-[2rem] relative border-blue-500/30 overflow-hidden group flex flex-col">
                        <CreatorCard
                            source="landing_page"
                            onAuthRequired={handleAuthRequired}
                            onAlreadyPro={handleAlreadyPro}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            variant="full"
                            contentOnly={true}
                        />
                    </div>

                    {/* Studio Plan - Uses shared component with full variant */}
                    <div className="glass p-6 md:p-8 rounded-[2rem] relative border-pink-500/30 overflow-hidden group flex flex-col">
                        <StudioCard
                            source="landing_page"
                            onAuthRequired={handleAuthRequired}
                            onAlreadyPro={handleAlreadyPro}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            variant="full"
                            contentOnly={true}
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
