import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

export async function POST(req: Request) {
    const body = await req.text()
    const signature = headers().get("Stripe-Signature") as string

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: any) {
        console.error("Webhook signature verification failed:", error.message)
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session
                await handleCheckoutCompleted(session)
                break
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionUpdated(subscription)
                break
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionDeleted(subscription)
                break
            }

            case "invoice.paid": {
                const invoice = event.data.object as Stripe.Invoice
                await handleInvoicePaid(invoice)
                break
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice
                await handleInvoicePaymentFailed(invoice)
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }
    } catch (error) {
        console.error(`Error handling ${event.type}:`, error)
        return new NextResponse("Webhook handler error", { status: 500 })
    }

    return new NextResponse(null, { status: 200 })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log("[WEBHOOK] handleCheckoutCompleted called")
    console.log("[WEBHOOK] Session metadata:", session.metadata)
    console.log("[WEBHOOK] Session mode:", session.mode)
    console.log("[WEBHOOK] Session subscription:", session.subscription)

    const userId = session.metadata?.userId
    const planType = session.metadata?.planType // 'creator', 'studio_monthly', 'studio_yearly'

    if (!userId) {
        console.error("[WEBHOOK] Checkout completed but no userId in metadata")
        return
    }

    console.log("[WEBHOOK] Processing for userId:", userId, "planType:", planType)

    if (session.mode === "subscription" && session.subscription) {
        console.log("[WEBHOOK] Handling SUBSCRIPTION mode")
        // Studio subscription (monthly or yearly)
        // Expand items to ensure we get current_period_end
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['items.data'] }
        )

        // In Stripe v20+, current_period_end is on subscription items, not subscription root
        console.log("[WEBHOOK] Subscription items:", JSON.stringify(subscription.items, null, 2))
        const firstItem = subscription.items?.data?.[0]
        console.log("[WEBHOOK] First item:", JSON.stringify(firstItem, null, 2))
        const currentPeriodEnd = firstItem?.current_period_end

        console.log("[WEBHOOK] Subscription id:", subscription.id)
        console.log("[WEBHOOK] Subscription status:", subscription.status)
        console.log("[WEBHOOK] First item current_period_end:", currentPeriodEnd)

        if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
            console.error("[WEBHOOK] Invalid current_period_end, using 30-day fallback")
            // Default to 30 days from now if we can't get the period end
            const fallbackDate = new Date()
            fallbackDate.setDate(fallbackDate.getDate() + 30)

            const updateResult = await prisma.user.update({
                where: { id: userId },
                data: {
                    isPro: true,
                    proSince: new Date(),
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: subscription.id,
                    subscriptionStatus: subscription.status,
                    subscriptionExpiresAt: fallbackDate,
                    planType: 'studio',
                },
            })
            console.log("[WEBHOOK] User updated with fallback date:", updateResult.id, "planType:", updateResult.planType)
            return
        }

        const expiresAt = new Date(currentPeriodEnd * 1000)
        console.log("[WEBHOOK] Calculated expiresAt:", expiresAt.toISOString())

        const updateResult = await prisma.user.update({
            where: { id: userId },
            data: {
                isPro: true,
                proSince: new Date(),
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                subscriptionExpiresAt: expiresAt,
                planType: 'studio', // Studio plan for subscriptions
            },
        })
        console.log("[WEBHOOK] User updated successfully:", updateResult.id, "planType:", updateResult.planType)
    } else if (session.mode === "payment") {
        console.log("[WEBHOOK] Handling PAYMENT mode")
        // Creator one-time pass (30 days)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        const updateResult = await prisma.user.update({
            where: { id: userId },
            data: {
                isPro: true,
                proSince: new Date(),
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: null, // No subscription for one-time
                subscriptionStatus: 'creator_pass', // Special status for Creator plan
                subscriptionExpiresAt: expiresAt,
                planType: 'creator', // Creator plan for one-time purchase
            },
        })
        console.log("[WEBHOOK] User updated successfully:", updateResult.id, "planType:", updateResult.planType)
    } else {
        console.log("[WEBHOOK] Unknown mode, not updating database")
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId

    if (!userId) {
        // Try to find user by subscription ID
        const user = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscription.id },
        })
        if (!user) {
            console.error("Subscription updated but no user found")
            return
        }

        await updateUserSubscription(user.id, subscription)
    } else {
        await updateUserSubscription(userId, subscription)
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id },
    })

    if (!user) {
        console.error("Subscription deleted but no user found")
        return
    }

    // Get current_period_end from subscription items (Stripe v20+)
    const firstItem = subscription.items?.data?.[0]
    const currentPeriodEnd = firstItem?.current_period_end
    const expiresAt = currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : new Date() // Fallback to now if not available

    // Don't immediately revoke access - let them use until period end
    await prisma.user.update({
        where: { id: user.id },
        data: {
            subscriptionStatus: "canceled",
            subscriptionExpiresAt: expiresAt,
        },
    })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    // In Stripe v20, subscription is accessed differently
    const subscriptionId = (invoice as any).subscription
    if (!subscriptionId) return

    const subscription = await stripe.subscriptions.retrieve(
        subscriptionId as string
    )

    const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id },
    })

    if (!user) {
        console.error("Invoice paid but no user found for subscription")
        return
    }

    // Get current_period_end from subscription items (Stripe v20+)
    const firstItem = subscription.items?.data?.[0]
    const currentPeriodEnd = firstItem?.current_period_end
    const expiresAt = currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Fallback to 30 days

    // Extend the subscription period
    await prisma.user.update({
        where: { id: user.id },
        data: {
            isPro: true,
            subscriptionStatus: subscription.status,
            subscriptionExpiresAt: expiresAt,
        },
    })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // In Stripe v20, subscription is accessed differently
    const subscriptionId = (invoice as any).subscription
    if (!subscriptionId) return

    const user = await prisma.user.findFirst({
        where: {
            stripeSubscriptionId: subscriptionId as string
        },
    })

    if (!user) {
        console.error("Invoice payment failed but no user found")
        return
    }

    // Update status to past_due
    await prisma.user.update({
        where: { id: user.id },
        data: {
            subscriptionStatus: "past_due",
        },
    })
}

async function updateUserSubscription(userId: string, subscription: Stripe.Subscription) {
    const isActive = ["active", "trialing"].includes(subscription.status)

    // Get current_period_end from subscription items (Stripe v20+)
    const firstItem = subscription.items?.data?.[0]
    const currentPeriodEnd = firstItem?.current_period_end
    const expiresAt = currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Fallback to 30 days

    await prisma.user.update({
        where: { id: userId },
        data: {
            isPro: isActive,
            subscriptionStatus: subscription.status,
            subscriptionExpiresAt: expiresAt,
        },
    })
}
