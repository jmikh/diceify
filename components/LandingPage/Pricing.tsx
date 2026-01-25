"use client"
import Link from 'next/link'
import { Check, Loader2, Sparkles, Clock, Zap } from 'lucide-react'
import { useState } from 'react'
import { getSession, SessionProvider } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import AuthModal from '@/components/AuthModal'
import SessionRefresher from '@/components/SessionRefresher'
import { sendGAEvent } from '@next/third-parties/google'

// Pricing configuration
const CREATOR_PRICE = 19 // One-time 30-day pass
const STUDIO_MONTHLY_PRICE = 9
const STUDIO_YEARLY_PRICE = 36
const STUDIO_YEARLY_MONTHLY_EFFECTIVE = STUDIO_YEARLY_PRICE / 12
const STUDIO_YEARLY_SAVINGS_PERCENT = Math.round((1 - (STUDIO_YEARLY_PRICE / (STUDIO_MONTHLY_PRICE * 12))) * 100)

type PlanType = 'creator' | 'studio_monthly' | 'studio_yearly'

export default function Pricing() {
    const [isLoading, setIsLoading] = useState<PlanType | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showAlreadyProModal, setShowAlreadyProModal] = useState(false)
    const [currentPlanType, setCurrentPlanType] = useState<string | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [studioInterval, setStudioInterval] = useState<'monthly' | 'yearly'>('yearly')

    const searchParams = useSearchParams()
    const router = useRouter()

    const onUpgrade = async (planType: PlanType) => {
        sendGAEvent('event', 'click_upgrade', {
            source: 'landing_page',
            plan_type: planType
        })

        setIsLoading(planType)
        const session = await getSession()

        if (!session) {
            setIsLoading(null)
            setShowAuthModal(true)
            return
        }

        try {
            const statusResponse = await fetch("/api/user/subscription")
            if (statusResponse.ok) {
                const { isPro, planType: userPlanType } = await statusResponse.json()

                // Check if user already has the plan they're trying to buy or higher
                if (isPro) {
                    // Lifetime users can't buy any plan
                    if (userPlanType === 'lifetime') {
                        setCurrentPlanType('lifetime')
                        setShowAlreadyProModal(true)
                        setIsLoading(null)
                        return
                    }

                    // Studio users can't buy any plan (already have the highest)
                    if (userPlanType === 'studio') {
                        setCurrentPlanType('studio')
                        setShowAlreadyProModal(true)
                        setIsLoading(null)
                        return
                    }

                    // Creator users can upgrade to Studio, but can't re-buy Creator
                    if (userPlanType === 'creator' && planType === 'creator') {
                        setCurrentPlanType('creator')
                        setShowAlreadyProModal(true)
                        setIsLoading(null)
                        return
                    }
                    // Allow Creator -> Studio upgrade to continue
                }
            }

            const response = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ planType }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error("Server Error Response:", errorText)
                throw new Error(errorText || "Something went wrong")
            }

            const data = await response.json()
            window.location.href = data.url
        } catch (error) {
            console.error("Billing Error:", error)
            setIsLoading(null)
        }
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

                    {/* Creator Plan - One-time 30-day pass */}
                    <div className="glass p-6 md:p-8 rounded-[2rem] relative border-blue-500/30 overflow-hidden group flex flex-col">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                        <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-blue-500/15 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-500/25 transition-colors duration-500"></div>

                        <div className="mb-6 relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-bold">Creator</h3>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                                    <Clock className="w-3 h-3" />
                                    30 Days
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1 mb-3">
                                <span className="text-3xl font-bold">${CREATOR_PRICE}</span>
                                <span className="text-white/50">one-time</span>
                            </div>
                            <p className="text-white/50 text-sm">Ideal for focused projects—everything you need to complete a single masterpiece.</p>
                        </div>

                        <ul className="space-y-3 mb-6 relative z-10 text-sm flex-1">
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <span>Generate dice art from any photo</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <span><strong>Unlimited</strong> dice in Builder Studio</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <span>Full resolution SVG blueprints</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <span>1 project in the cloud</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/50">
                                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Access expires after 30 days</span>
                            </li>
                        </ul>

                        <button
                            onClick={() => onUpgrade('creator')}
                            disabled={isLoading !== null}
                            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                        >
                            {isLoading === 'creator' ? (
                                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                                "Get Creator Pass"
                            )}
                        </button>
                    </div>

                    {/* Studio Plan - Subscription */}
                    <div className="glass p-6 md:p-8 rounded-[2rem] relative border-pink-500/30 overflow-hidden group flex flex-col">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-50"></div>
                        <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-pink-500/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-pink-500/30 transition-colors duration-500"></div>

                        <div className="mb-6 relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl font-bold">Studio</h3>
                                {/* Toggle inline with title */}
                                <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
                                    <button
                                        onClick={() => setStudioInterval('monthly')}
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${studioInterval === 'monthly'
                                            ? 'bg-white text-black'
                                            : 'text-white/70 hover:text-white'
                                            }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setStudioInterval('yearly')}
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${studioInterval === 'yearly'
                                            ? 'bg-white text-black'
                                            : 'text-white/70 hover:text-white'
                                            }`}
                                    >
                                        Yearly
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${studioInterval === 'yearly'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-green-500/20 text-green-400'
                                            }`}>
                                            -{STUDIO_YEARLY_SAVINGS_PERCENT}%
                                        </span>
                                    </button>
                                </div>
                            </div>


                            {studioInterval === 'monthly' ? (
                                <div className="flex items-baseline gap-1 mb-3">
                                    <span className="text-3xl font-bold">${STUDIO_MONTHLY_PRICE}</span>
                                    <span className="text-white/50">/month</span>
                                </div>
                            ) : (
                                <div className="mb-3">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-white/40 line-through text-lg">${STUDIO_MONTHLY_PRICE}</span>
                                        <span className="text-3xl font-bold text-green-400">${STUDIO_YEARLY_MONTHLY_EFFECTIVE.toFixed(2)}</span>
                                        <span className="text-white/50">/month</span>
                                    </div>
                                    <p className="text-sm text-white/40">Billed annually at ${STUDIO_YEARLY_PRICE}</p>
                                </div>
                            )}
                            <p className="text-white/50 text-sm">For artists who want to take their time or create multiple pieces.</p>
                        </div>

                        <ul className="space-y-3 mb-6 relative z-10 text-sm flex-1">
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                                <span>Generate dice art from any photo</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                                <span><strong>Unlimited</strong> dice in Builder Studio</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                                <span>Full resolution SVG blueprints</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                                <span><strong>5 projects</strong> in the cloud</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                                <span>Cancel anytime</span>
                            </li>
                        </ul>

                        <button
                            onClick={() => onUpgrade(studioInterval === 'monthly' ? 'studio_monthly' : 'studio_yearly')}
                            disabled={isLoading !== null}
                            className="btn-primary w-full justify-center relative z-10 text-sm mt-auto"
                        >
                            {isLoading === 'studio_monthly' || isLoading === 'studio_yearly' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                `Subscribe ${studioInterval === 'yearly' ? 'Yearly' : 'Monthly'}`
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
