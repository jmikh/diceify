'use client'

import { useState } from 'react'
import { Check, Loader2, Clock } from 'lucide-react'
import { getSession } from 'next-auth/react'
import { sendGAEvent } from '@next/third-parties/google'
import { useEditorStore } from '@/lib/store/useEditorStore'

// Pricing configuration
const CREATOR_PRICE = 19 // One-time 30-day pass
const STUDIO_MONTHLY_PRICE = 9
const STUDIO_YEARLY_PRICE = 36
const STUDIO_YEARLY_MONTHLY_EFFECTIVE = STUDIO_YEARLY_PRICE / 12
const STUDIO_YEARLY_SAVINGS_PERCENT = Math.round((1 - (STUDIO_YEARLY_PRICE / (STUDIO_MONTHLY_PRICE * 12))) * 100)

export type PlanType = 'creator' | 'studio_monthly' | 'studio_yearly'

interface PricingCardProps {
    source: string
    onAuthRequired: () => void
    onAlreadyPro: (planType: string) => void
    isLoading: PlanType | null
    setIsLoading: (loading: PlanType | null) => void
}

export function CreatorCard({ source, onAuthRequired, onAlreadyPro, isLoading, setIsLoading }: PricingCardProps) {
    const onUpgrade = async () => {
        sendGAEvent('event', 'click_upgrade', {
            source,
            plan_type: 'creator'
        })

        setIsLoading('creator')
        const session = await getSession()

        if (!session) {
            setIsLoading(null)
            onAuthRequired()
            return
        }

        try {
            const statusResponse = await fetch("/api/user/subscription")
            if (statusResponse.ok) {
                const { isPro, planType: userPlanType } = await statusResponse.json()

                if (isPro) {
                    if (userPlanType === 'lifetime' || userPlanType === 'studio' || userPlanType === 'creator') {
                        onAlreadyPro(userPlanType)
                        setIsLoading(null)
                        return
                    }
                }
            }

            const response = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planType: 'creator' }),
            })

            if (!response.ok) {
                throw new Error(await response.text() || "Something went wrong")
            }

            const data = await response.json()
            window.location.href = data.url
        } catch (error) {
            console.error("Billing Error:", error)
            setIsLoading(null)
        }
    }

    return (
        <div className="glass p-5 rounded-2xl relative border-blue-500/30 overflow-hidden group flex flex-col min-w-0">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
            <div className="absolute -top-[80px] left-1/2 -translate-x-1/2 w-[150px] h-[150px] bg-blue-500/15 blur-[60px] rounded-full pointer-events-none group-hover:bg-blue-500/25 transition-colors duration-500"></div>

            <div className="mb-4 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold">Creator</h3>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                        <Clock className="w-3 h-3" />
                        30 Days
                    </div>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold">${CREATOR_PRICE}</span>
                    <span className="text-white/50 text-sm">one-time</span>
                </div>
                <p className="text-white/50 text-xs">Ideal for focused projects—everything you need to complete a single masterpiece.</p>
            </div>

            <ul className="space-y-2 mb-4 relative z-10 text-xs flex-1">
                <li className="flex items-start gap-2 text-white/90">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Unlimited</strong> dice in Builder</span>
                </li>
                <li className="flex items-start gap-2 text-white/90">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Full resolution SVG blueprints</span>
                </li>
                <li className="flex items-start gap-2 text-white/90">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>1 project in the cloud</span>
                </li>
                <li className="flex items-start gap-2 text-white/50">
                    <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Access expires after 30 days</span>
                </li>
            </ul>

            <button
                onClick={onUpgrade}
                disabled={isLoading !== null}
                className="w-full py-2.5 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
            >
                {isLoading === 'creator' ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                    "Get Creator Pass"
                )}
            </button>
        </div>
    )
}

export function StudioCard({ source, onAuthRequired, onAlreadyPro, isLoading, setIsLoading }: PricingCardProps) {
    const [studioInterval, setStudioInterval] = useState<'monthly' | 'yearly'>('yearly')

    const onUpgrade = async () => {
        const planType = studioInterval === 'monthly' ? 'studio_monthly' : 'studio_yearly'

        sendGAEvent('event', 'click_upgrade', {
            source,
            plan_type: planType
        })

        setIsLoading(planType)
        const session = await getSession()

        if (!session) {
            setIsLoading(null)
            onAuthRequired()
            return
        }

        try {
            const statusResponse = await fetch("/api/user/subscription")
            if (statusResponse.ok) {
                const { isPro, planType: userPlanType } = await statusResponse.json()

                if (isPro) {
                    if (userPlanType === 'lifetime' || userPlanType === 'studio') {
                        onAlreadyPro(userPlanType)
                        setIsLoading(null)
                        return
                    }
                    // Allow Creator -> Studio upgrade
                }
            }

            const response = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planType }),
            })

            if (!response.ok) {
                throw new Error(await response.text() || "Something went wrong")
            }

            const data = await response.json()
            window.location.href = data.url
        } catch (error) {
            console.error("Billing Error:", error)
            setIsLoading(null)
        }
    }

    return (
        <div className="glass p-5 rounded-2xl relative border-pink-500/30 overflow-hidden group flex flex-col min-w-0">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-50"></div>
            <div className="absolute -top-[80px] left-1/2 -translate-x-1/2 w-[150px] h-[150px] bg-pink-500/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-pink-500/30 transition-colors duration-500"></div>

            <div className="mb-4 relative z-10">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-lg font-bold">Studio</h3>
                    {/* Toggle */}
                    <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/10">
                        <button
                            onClick={() => setStudioInterval('monthly')}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${studioInterval === 'monthly'
                                ? 'bg-white text-black'
                                : 'text-white/70 hover:text-white'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setStudioInterval('yearly')}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${studioInterval === 'yearly'
                                ? 'bg-white text-black'
                                : 'text-white/70 hover:text-white'
                                }`}
                        >
                            Yearly
                            <span className={`text-[10px] px-1 py-0.5 rounded-full ${studioInterval === 'yearly'
                                ? 'bg-green-500 text-white'
                                : 'bg-green-500/20 text-green-400'
                                }`}>
                                -{STUDIO_YEARLY_SAVINGS_PERCENT}%
                            </span>
                        </button>
                    </div>
                </div>

                {studioInterval === 'monthly' ? (
                    <div className="mb-2">
                        <div className="flex items-baseline gap-1 mb-0.5">
                            <span className="text-2xl font-bold">${STUDIO_MONTHLY_PRICE}</span>
                            <span className="text-white/50 text-sm">/month</span>
                        </div>
                        <p className="text-xs text-white/40">Billed monthly</p>
                    </div>
                ) : (
                    <div className="mb-2">
                        <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-white/40 line-through text-base">${STUDIO_MONTHLY_PRICE}</span>
                            <span className="text-2xl font-bold text-green-400">${STUDIO_YEARLY_MONTHLY_EFFECTIVE.toFixed(2)}</span>
                            <span className="text-white/50 text-sm">/month</span>
                        </div>
                        <p className="text-xs text-white/40">Billed annually at ${STUDIO_YEARLY_PRICE}</p>
                    </div>
                )}
                <p className="text-white/50 text-xs">For artists who want to take their time or create multiple pieces.</p>
            </div>

            <ul className="space-y-2 mb-4 relative z-10 text-xs flex-1">
                <li className="flex items-start gap-2 text-white/90">
                    <Check className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                    <span><strong>Unlimited</strong> dice in Builder</span>
                </li>
                <li className="flex items-start gap-2 text-white/90">
                    <Check className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                    <span>Full resolution SVG blueprints</span>
                </li>
                <li className="flex items-start gap-2 text-white/90">
                    <Check className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                    <span><strong>5 projects</strong> in the cloud</span>
                </li>
                <li className="flex items-start gap-2 text-white/90">
                    <Check className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                    <span>Cancel anytime</span>
                </li>
            </ul>

            <button
                onClick={onUpgrade}
                disabled={isLoading !== null}
                className="btn-primary w-full justify-center relative z-10 text-sm mt-auto"
            >
                {isLoading === 'studio_monthly' || isLoading === 'studio_yearly' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    "Subscribe"
                )}
            </button>
        </div>
    )
}
