import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

export type PlanType = 'explorer' | 'creator' | 'studio' | 'lifetime'

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's Pro status (has active premium plan) */
            isPro: boolean
            /** The user's current plan type */
            planType: PlanType
            /** The subscription status (active, canceled, past_due, creator_pass, etc.) */
            subscriptionStatus: string | null
            /** When the subscription expires (ISO string) */
            subscriptionExpiresAt: string | null
            id: string
        } & DefaultSession["user"]
    }

    interface User {
        isPro: boolean
        planType?: PlanType
        subscriptionStatus?: string | null
        subscriptionExpiresAt?: string | null
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        isPro: boolean
        planType?: PlanType
        uid: string
    }
}
