import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Plan types
export type PlanType = 'explorer' | 'creator' | 'studio' | 'lifetime'

// Plan limits configuration
export const PLAN_LIMITS = {
    explorer: {
        projectLimit: 1,
        diceLimit: 100,
        hasSvgExport: false,
    },
    creator: {
        projectLimit: 1,
        diceLimit: Infinity,
        hasSvgExport: true,
    },
    studio: {
        projectLimit: 5,
        diceLimit: Infinity,
        hasSvgExport: true,
    },
    lifetime: {
        projectLimit: 5,
        diceLimit: Infinity,
        hasSvgExport: true,
    },
} as const

export const hasPremiumAccess = async (userId: string) => {
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
        },
        select: {
            isPro: true,
            planType: true,
            subscriptionExpiresAt: true,
            subscriptionStatus: true,
        },
    })

    if (!user) return false

    // Lifetime users always have access (grandfathered)
    if (user.planType === 'lifetime') {
        return true
    }

    // Check if subscription is active
    if (!user.isPro) {
        return false
    }

    // Check subscription expiration
    if (user.subscriptionExpiresAt) {
        const now = new Date()
        // Allow access if subscription hasn't expired yet
        // This covers the grace period after cancellation
        if (user.subscriptionExpiresAt > now) {
            return true
        }
        return false
    }

    // Fallback: if isPro is true but no expiration, check status
    // This handles edge cases during webhook processing
    if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'creator_pass') {
        return true
    }

    return false
}

export const checkPremium = async () => {
    const session = await auth()

    if (!session?.user?.id) {
        return false
    }

    return await hasPremiumAccess(session.user.id)
}

// Get the user's current plan type, considering expiration
export const getUserPlanType = async (userId: string): Promise<PlanType> => {
    const user = await prisma.user.findFirst({
        where: { id: userId },
        select: {
            isPro: true,
            planType: true,
            subscriptionExpiresAt: true,
            subscriptionStatus: true,
        },
    })

    if (!user) return 'explorer'

    // Lifetime users always keep their status
    if (user.planType === 'lifetime') {
        return 'lifetime'
    }

    // Check if plan is still active
    const now = new Date()
    const isExpired = user.subscriptionExpiresAt && user.subscriptionExpiresAt <= now
    const isInactive = !user.isPro || isExpired

    if (isInactive) {
        return 'explorer'
    }

    // Return the stored plan type
    return (user.planType as PlanType) || 'explorer'
}

// Get plan limits for a user
export const getUserPlanLimits = async (userId: string) => {
    const user = await prisma.user.findFirst({
        where: { id: userId },
        select: {
            planType: true,
            isPro: true,
            subscriptionExpiresAt: true,
        },
    })

    if (!user) return PLAN_LIMITS.explorer

    // Lifetime users get lifetime limits
    if (user.planType === 'lifetime') {
        return PLAN_LIMITS.lifetime
    }

    // Check if expired
    const now = new Date()
    const isExpired = user.subscriptionExpiresAt && user.subscriptionExpiresAt <= now

    if (!user.isPro || isExpired) {
        return PLAN_LIMITS.explorer
    }

    const planType = (user.planType as PlanType) || 'explorer'
    return PLAN_LIMITS[planType]
}

// Get detailed subscription info for UI display
export const getSubscriptionDetails = async (userId: string) => {
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
        },
        select: {
            isPro: true,
            planType: true,
            subscriptionExpiresAt: true,
            subscriptionStatus: true,
            stripeCustomerId: true,
        },
    })

    if (!user) {
        return {
            isPro: false,
            planType: 'explorer' as PlanType,
            status: null,
            expiresAt: null,
            canManage: false,
            limits: PLAN_LIMITS.explorer,
        }
    }

    const effectivePlanType = (user.planType as PlanType) || 'explorer'
    const limits = PLAN_LIMITS[effectivePlanType]
    const isLifetime = user.planType === 'lifetime'

    return {
        isPro: user.isPro,
        planType: effectivePlanType,
        status: user.subscriptionStatus,
        expiresAt: user.subscriptionExpiresAt,
        canManage: !!user.stripeCustomerId && !isLifetime && user.subscriptionStatus !== 'creator_pass',
        limits,
    }
}

// Check if user can create a new project
export const canCreateProject = async (userId: string): Promise<{ allowed: boolean; reason?: string; currentCount: number; limit: number }> => {
    const limits = await getUserPlanLimits(userId)

    const projectCount = await prisma.project.count({
        where: { userId }
    })

    if (projectCount >= limits.projectLimit) {
        const planType = await getUserPlanType(userId)
        let upgradeMessage = ''

        if (planType === 'explorer') {
            upgradeMessage = 'Upgrade to Creator or Studio for more projects.'
        } else if (planType === 'creator') {
            upgradeMessage = 'Upgrade to Studio for up to 5 projects.'
        }

        return {
            allowed: false,
            reason: `Project limit reached (${projectCount}/${limits.projectLimit}). ${upgradeMessage}`,
            currentCount: projectCount,
            limit: limits.projectLimit,
        }
    }

    return {
        allowed: true,
        currentCount: projectCount,
        limit: limits.projectLimit,
    }
}
