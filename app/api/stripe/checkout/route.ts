import { auth } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import Stripe from "stripe"

type PlanType = 'creator' | 'studio_monthly' | 'studio_yearly'

export async function POST(req: Request) {
    try {
        const session = await auth()

        if (!session?.user || !session?.user.email) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const planType: PlanType = body.planType || 'studio_yearly'

        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        if (!appUrl) {
            throw new Error("Missing NEXT_PUBLIC_APP_URL")
        }

        // Determine the checkout mode and price ID based on plan type
        let priceId: string | undefined
        let mode: 'payment' | 'subscription'

        switch (planType) {
            case 'creator':
                // One-time 30-day pass
                priceId = process.env.STRIPE_CREATOR_PRICE_ID
                mode = 'payment'
                break
            case 'studio_monthly':
                priceId = process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID
                mode = 'subscription'
                break
            case 'studio_yearly':
                priceId = process.env.STRIPE_STUDIO_YEARLY_PRICE_ID
                mode = 'subscription'
                break
            default:
                throw new Error(`Invalid plan type: ${planType}`)
        }

        if (!priceId) {
            throw new Error(`Missing price ID for plan: ${planType}`)
        }

        // Base config shared by both modes
        const baseConfig = {
            payment_method_types: ["card"] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
            customer_email: session.user.email as string,
            metadata: {
                userId: session.user.id,
                planType,
            },
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${appUrl}/?success=true`,
            cancel_url: `${appUrl}/?canceled=true`,
        }

        // Build mode-specific config
        const checkoutSessionConfig: Stripe.Checkout.SessionCreateParams = mode === 'payment'
            ? {
                ...baseConfig,
                mode: 'payment',
                customer_creation: 'always',
            }
            : {
                ...baseConfig,
                mode: 'subscription',
                subscription_data: {
                    metadata: {
                        userId: session.user.id,
                        planType,
                    },
                },
            }

        const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionConfig)

        return NextResponse.json({ url: checkoutSession.url })
    } catch (error: any) {
        console.error("[STRIPE_CHECKOUT_ERROR]", error)
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error("Missing STRIPE_SECRET_KEY environment variable")
        }
        return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
    }
}
