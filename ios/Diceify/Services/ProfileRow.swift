import DiceCore
import Foundation

/// The signed-in user's `profiles` row (RLS: exactly one), mapped onto core's `BillingState` (lib/supabase/profile.ts).
struct ProfileRow: Decodable, Equatable, Sendable {
    let id: UUID
    let email: String
    let name: String?
    let avatarUrl: String?
    let plan: String
    let planExpiresAt: String?
    let stripeCustomerId: String?
    let subscriptionStatus: String?
    let currentPeriodEnd: String?
    let cancelAt: String?
    let applePlan: String?
    let appleExpiresAt: String?
    let appleWillRenew: Bool

    enum CodingKeys: String, CodingKey {
        case id, email, name, plan
        case avatarUrl = "avatar_url"
        case planExpiresAt = "plan_expires_at"
        case stripeCustomerId = "stripe_customer_id"
        case subscriptionStatus = "subscription_status"
        case currentPeriodEnd = "current_period_end"
        case cancelAt = "cancel_at"
        case applePlan = "apple_plan"
        case appleExpiresAt = "apple_expires_at"
        case appleWillRenew = "apple_will_renew"
    }

    static let columns = "id, email, name, avatar_url, plan, plan_expires_at, stripe_customer_id, subscription_status, current_period_end, cancel_at, apple_plan, apple_expires_at, apple_will_renew"

    var billingState: BillingState {
        BillingState(
            plan: Plan(rawValue: plan) ?? .explorer,
            planExpiresAt: planExpiresAt,
            subscriptionStatus: subscriptionStatus,
            currentPeriodEnd: currentPeriodEnd,
            cancelAt: cancelAt,
            hasStripeCustomer: !(stripeCustomerId ?? "").isEmpty,
            applePlan: applePlan.flatMap(ApplePlan.init(rawValue:)),
            appleExpiresAt: appleExpiresAt,
            appleWillRenew: appleWillRenew
        )
    }
}
