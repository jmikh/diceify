import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST() {
    const session = await auth()

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        // Get user's Stripe customer ID
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { stripeCustomerId: true, planType: true }
        })

        if (!user?.stripeCustomerId) {
            return NextResponse.json(
                { error: "No billing information found" },
                { status: 400 }
            )
        }

        // Only allow managing subscription for studio plan users
        if (user.planType !== 'studio') {
            return NextResponse.json(
                { error: "Only Studio plan subscriptions can be managed" },
                { status: 400 }
            )
        }

        // Create billing portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/editor`,
        })

        return NextResponse.json({ url: portalSession.url })
    } catch (error) {
        console.error("Billing portal error:", error)
        return NextResponse.json(
            { error: "Failed to create billing portal session" },
            { status: 500 }
        )
    }
}
