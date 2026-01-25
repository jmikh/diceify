import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                planType: true,
                subscriptionExpiresAt: true,
                subscriptionStatus: true,
            },
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        const planType = (user.planType as 'explorer' | 'creator' | 'studio' | 'lifetime') || 'explorer'
        const now = new Date()
        const isExpired = user.subscriptionExpiresAt && user.subscriptionExpiresAt <= now

        // Determine if user has active premium access
        let hasPremiumAccess = false

        if (planType === 'lifetime') {
            // Lifetime users always have access
            hasPremiumAccess = true
        } else if (planType === 'creator' || planType === 'studio') {
            // Creator and Studio need valid (non-expired) subscription
            hasPremiumAccess = !isExpired
        }

        return NextResponse.json({
            isPro: hasPremiumAccess,
            planType,
            subscriptionStatus: user.subscriptionStatus,
            expiresAt: user.subscriptionExpiresAt?.toISOString() || null,
        })
    } catch (error) {
        console.error("[USER_SUBSCRIPTION_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
