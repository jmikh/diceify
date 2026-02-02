'use client'

import { useState } from 'react'
import { Check, Loader2, Clock } from 'lucide-react'
import { getSession } from 'next-auth/react'
import { sendGAEvent } from '@next/third-parties/google'
import { useEditorStore } from '@/lib/store/useEditorStore'

// =============================================================================
// PRICING CONFIGURATION - Single source of truth
// =============================================================================
export const PRICING_CONFIG = {
    creator: {
        price: 19,
        description: "For creators with a vision and a deadline. 30 days of full access to complete your masterpiece.",
        features: [
            { text: <><strong>Unlimited</strong> dice in Builder</>, icon: 'check' as const },
            { text: "Full resolution SVG blueprints", icon: 'check' as const },
            { text: "1 project in the cloud", icon: 'check' as const },
            { text: "Access expires after 30 days", icon: 'clock' as const },
        ],
        // Additional features shown only on landing page
        landingFeatures: [
            { text: "Generate dice art from any photo", icon: 'check' as const },
            { text: <><strong>Unlimited</strong> dice in Builder Studio</>, icon: 'check' as const },
            { text: "Full resolution SVG blueprints", icon: 'check' as const },
            { text: "1 project in the cloud", icon: 'check' as const },
            { text: "Access expires after 30 days", icon: 'clock' as const },
        ],
    },
    studio: {
        monthlyPrice: 9,
        yearlyPrice: 36,
        description: "For artists who want to take their time or create multiple pieces.",
        features: [
            { text: <><strong>Unlimited</strong> dice in Builder</>, icon: 'check' as const },
            { text: "Full resolution SVG blueprints", icon: 'check' as const },
            { text: <><strong>5 projects</strong> in the cloud</>, icon: 'check' as const },
            { text: "Cancel anytime", icon: 'check' as const },
        ],
        landingFeatures: [
            { text: "Generate dice art from any photo", icon: 'check' as const },
            { text: <><strong>Unlimited</strong> dice in Builder Studio</>, icon: 'check' as const },
            { text: "Full resolution SVG blueprints", icon: 'check' as const },
            { text: <><strong>5 projects</strong> in the cloud</>, icon: 'check' as const },
            { text: "Cancel anytime", icon: 'check' as const },
        ],
    },
} as const

export const STUDIO_YEARLY_MONTHLY_EFFECTIVE = PRICING_CONFIG.studio.yearlyPrice / 12
export const STUDIO_YEARLY_SAVINGS_PERCENT = Math.round(
    (1 - (PRICING_CONFIG.studio.yearlyPrice / (PRICING_CONFIG.studio.monthlyPrice * 12))) * 100
)

export type PlanType = 'creator' | 'studio_monthly' | 'studio_yearly'
export type CardVariant = 'compact' | 'full'

// =============================================================================
// SHARED TYPES
// =============================================================================
interface PricingCardProps {
    source: string
    onAuthRequired: () => void
    onAlreadyPro: (planType: string) => void
    isLoading: PlanType | null
    setIsLoading: (loading: PlanType | null) => void
    variant?: CardVariant
    /** If true, renders only the card content (no wrapper). Used when parent provides wrapper. */
    contentOnly?: boolean
}

// =============================================================================
// VARIANT-BASED STYLING
// =============================================================================
const variantStyles = {
    compact: {
        padding: 'p-5',
        titleSize: 'text-lg',
        priceSize: 'text-2xl',
        descriptionSize: 'text-xs',
        featureSpacing: 'space-y-2',
        featureSize: 'text-xs',
        iconSize: 'w-3.5 h-3.5',
        badgeIconSize: 'w-3 h-3',
        buttonPadding: 'py-2.5',
        glowSize: 'w-[150px] h-[150px]',
        glowOffset: '-top-[80px]',
        glowBlur: 'blur-[60px]',
        priceMargin: 'mb-2',
        headerMargin: 'mb-4',
        listMargin: 'mb-4',
    },
    full: {
        padding: 'p-6 md:p-8',
        titleSize: 'text-xl',
        priceSize: 'text-3xl',
        descriptionSize: 'text-sm',
        featureSpacing: 'space-y-3',
        featureSize: 'text-sm',
        iconSize: 'w-4 h-4',
        badgeIconSize: 'w-3 h-3',
        buttonPadding: 'py-3',
        glowSize: 'w-[200px] h-[200px]',
        glowOffset: '-top-[100px]',
        glowBlur: 'blur-[80px]',
        priceMargin: 'mb-3',
        headerMargin: 'mb-6',
        listMargin: 'mb-6',
    },
}

// =============================================================================
// CREATOR CARD
// =============================================================================
export function CreatorCard({
    source,
    onAuthRequired,
    onAlreadyPro,
    isLoading,
    setIsLoading,
    variant = 'compact',
    contentOnly = false,
}: PricingCardProps) {
    const styles = variantStyles[variant]
    const features = variant === 'full' ? PRICING_CONFIG.creator.landingFeatures : PRICING_CONFIG.creator.features

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

    const content = (
        <>
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
            <div className={`absolute ${styles.glowOffset} left-1/2 -translate-x-1/2 ${styles.glowSize} bg-blue-500/15 ${styles.glowBlur} rounded-full pointer-events-none group-hover:bg-blue-500/25 transition-colors duration-500`}></div>

            <div className={`${styles.headerMargin} relative z-10`}>
                <div className="flex items-center gap-2 mb-2">
                    <h3 className={`${styles.titleSize} font-bold`}>Creator</h3>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold`}>
                        <Clock className={styles.badgeIconSize} />
                        30 Days
                    </div>
                </div>
                <div className={`flex items-baseline gap-1 ${styles.priceMargin}`}>
                    <span className={`${styles.priceSize} font-bold`}>${PRICING_CONFIG.creator.price}</span>
                    <span className={`text-white/50 ${variant === 'compact' ? 'text-sm' : ''}`}>one-time</span>
                </div>
                <p className={`text-white/50 ${styles.descriptionSize}`}>{PRICING_CONFIG.creator.description}</p>
            </div>

            <ul className={`${styles.featureSpacing} ${styles.listMargin} relative z-10 ${styles.featureSize} flex-1`}>
                {features.map((feature, index) => (
                    <li key={index} className={`flex items-start gap-2 ${feature.icon === 'clock' ? 'text-white/50' : 'text-white/90'}`}>
                        {feature.icon === 'check' ? (
                            <Check className={`${styles.iconSize} text-blue-400 shrink-0 mt-0.5`} />
                        ) : (
                            <Clock className={`${styles.iconSize} shrink-0 mt-0.5`} />
                        )}
                        <span>{feature.text}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={onUpgrade}
                disabled={isLoading !== null}
                className={`w-full ${styles.buttonPadding} px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all ${styles.featureSize} disabled:opacity-50 disabled:cursor-not-allowed mt-auto`}
            >
                {isLoading === 'creator' ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                    "Get Creator Pass"
                )}
            </button>
        </>
    )

    if (contentOnly) {
        return content
    }

    return (
        <div className={`glass ${styles.padding} rounded-2xl relative border-blue-500/30 overflow-hidden group flex flex-col min-w-0`}>
            {content}
        </div>
    )
}

// =============================================================================
// STUDIO CARD
// =============================================================================
export function StudioCard({
    source,
    onAuthRequired,
    onAlreadyPro,
    isLoading,
    setIsLoading,
    variant = 'compact',
    contentOnly = false,
}: PricingCardProps) {
    const [studioInterval, setStudioInterval] = useState<'monthly' | 'yearly'>('yearly')
    const styles = variantStyles[variant]
    const features = variant === 'full' ? PRICING_CONFIG.studio.landingFeatures : PRICING_CONFIG.studio.features

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

    const content = (
        <>
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-50"></div>
            <div className={`absolute ${styles.glowOffset} left-1/2 -translate-x-1/2 ${styles.glowSize} bg-pink-500/20 ${styles.glowBlur} rounded-full pointer-events-none group-hover:bg-pink-500/30 transition-colors duration-500`}></div>

            <div className={`${styles.headerMargin} relative z-10`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className={`${styles.titleSize} font-bold`}>Studio</h3>
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
                    <div className={styles.priceMargin}>
                        <div className="flex items-baseline gap-1 mb-0.5">
                            <span className={`${styles.priceSize} font-bold`}>${PRICING_CONFIG.studio.monthlyPrice}</span>
                            <span className={`text-white/50 ${variant === 'compact' ? 'text-sm' : ''}`}>/month</span>
                        </div>
                        <p className={`${styles.descriptionSize} text-white/40`}>Billed monthly</p>
                    </div>
                ) : (
                    <div className={styles.priceMargin}>
                        <div className="flex items-baseline gap-2 mb-0.5">
                            <span className={`text-white/40 line-through ${variant === 'compact' ? 'text-base' : 'text-lg'}`}>${PRICING_CONFIG.studio.monthlyPrice}</span>
                            <span className={`${styles.priceSize} font-bold text-green-400`}>${STUDIO_YEARLY_MONTHLY_EFFECTIVE.toFixed(2)}</span>
                            <span className={`text-white/50 ${variant === 'compact' ? 'text-sm' : ''}`}>/month</span>
                        </div>
                        <p className={`${styles.descriptionSize} text-white/40`}>Billed annually at ${PRICING_CONFIG.studio.yearlyPrice}</p>
                    </div>
                )}
                <p className={`text-white/50 ${styles.descriptionSize}`}>{PRICING_CONFIG.studio.description}</p>
            </div>

            <ul className={`${styles.featureSpacing} ${styles.listMargin} relative z-10 ${styles.featureSize} flex-1`}>
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-white/90">
                        <Check className={`${styles.iconSize} text-pink-400 shrink-0 mt-0.5`} />
                        <span>{feature.text}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={onUpgrade}
                disabled={isLoading !== null}
                className={`btn-primary w-full justify-center relative z-10 ${styles.featureSize} mt-auto`}
            >
                {isLoading === 'studio_monthly' || isLoading === 'studio_yearly' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    "Subscribe"
                )}
            </button>
        </>
    )

    if (contentOnly) {
        return content
    }

    return (
        <div className={`glass ${styles.padding} rounded-2xl relative border-pink-500/30 overflow-hidden group flex flex-col min-w-0`}>
            {content}
        </div>
    )
}
