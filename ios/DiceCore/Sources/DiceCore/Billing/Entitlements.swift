// Entitlements derived from the profile's billing snapshot (core/billing/entitlements.ts). THE gating source for the
// app, exactly as for the web: two sources, Stripe (`plan` + subscription/pass columns) and Apple (`apple_*`,
// RevenueCat). Priority: lifetime → Studio from either → Creator from either → Explorer. Mirrored by the SQL function
// `effective_plan` and `_shared/billing-snapshot.ts` `effectivePlan`; change all together.

import Foundation

/// Stripe subscription statuses that keep Studio access (past_due = payment grace period).
public let PRO_SUBSCRIPTION_STATUSES: Set<String> = ["active", "trialing", "past_due"]

/// What an Apple purchase grants (`apple_plan`).
public enum ApplePlan: String, Sendable, Codable {
    case creator, studio
}

/// Who granted the current plan; nil for Explorer and the legacy lifetime grant.
public enum BillingSource: String, Sendable {
    case stripe, apple
}

/// Billing columns of a profile row (timestamps as ISO strings, as PostgREST returns them).
public struct BillingState: Equatable, Sendable {
    public var plan: Plan
    /// Creator pass end (Stripe).
    public var planExpiresAt: String?
    public var subscriptionStatus: String?
    public var currentPeriodEnd: String?
    public var cancelAt: String?
    public var hasStripeCustomer: Bool
    public var applePlan: ApplePlan?
    public var appleExpiresAt: String?
    public var appleWillRenew: Bool

    public init(plan: Plan, planExpiresAt: String? = nil, subscriptionStatus: String? = nil, currentPeriodEnd: String? = nil, cancelAt: String? = nil, hasStripeCustomer: Bool = false, applePlan: ApplePlan? = nil, appleExpiresAt: String? = nil, appleWillRenew: Bool = false) {
        self.plan = plan
        self.planExpiresAt = planExpiresAt
        self.subscriptionStatus = subscriptionStatus
        self.currentPeriodEnd = currentPeriodEnd
        self.cancelAt = cancelAt
        self.hasStripeCustomer = hasStripeCustomer
        self.applePlan = applePlan
        self.appleExpiresAt = appleExpiresAt
        self.appleWillRenew = appleWillRenew
    }
}

public struct Entitlements: Equatable, Sendable {
    public var plan: Plan
    public var isPro: Bool
    /// nil = unlimited.
    public var builderRowLimit: Int?
    public var hasSvgExport: Bool
    /// When paid access ends (creator expiry, or the studio period/cancel date); nil for lifetime and explorer.
    public var accessUntil: String?
    public var cancelAt: String?
    /// Studio subscription that will renew (no pending cancellation).
    public var renews: Bool
    /// The user has a Stripe customer, so the Stripe portal can be offered (on the web).
    public var canManageBilling: Bool
    /// Where the current plan comes from: Stripe (managed on the web) or Apple (managed in the App Store).
    public var source: BillingSource?
}

private func withLimits(_ plan: Plan, accessUntil: String?, cancelAt: String?, renews: Bool, canManageBilling: Bool, source: BillingSource?) -> Entitlements {
    let limits = PLAN_LIMITS[plan]!
    return Entitlements(plan: plan, isPro: plan != .explorer, builderRowLimit: limits.builderRowLimit, hasSvgExport: limits.hasSvgExport, accessUntil: accessUntil, cancelAt: cancelAt, renews: renews, canManageBilling: canManageBilling, source: source)
}

/// Signed-out / unknown-profile default.
public let EXPLORER_ENTITLEMENTS = withLimits(.explorer, accessUntil: nil, cancelAt: nil, renews: false, canManageBilling: false, source: nil)

private func isAfter(_ iso: String?, _ now: Date) -> Bool {
    guard let iso, let date = parseISODate(iso) else { return false }
    return date > now
}

/// Priority: lifetime → Studio (Stripe PRO status, else an unexpired Apple Studio) → Creator (whichever of the Stripe
/// pass and an Apple pass ends later) → Explorer. With both sources granting Studio, Stripe wins.
public func deriveEntitlements(_ b: BillingState, now: Date) -> Entitlements {
    let canManageBilling = b.hasStripeCustomer
    if b.plan == .lifetime {
        return withLimits(.lifetime, accessUntil: nil, cancelAt: nil, renews: false, canManageBilling: canManageBilling, source: nil)
    }
    if b.plan == .studio, let status = b.subscriptionStatus, PRO_SUBSCRIPTION_STATUSES.contains(status) {
        return withLimits(.studio, accessUntil: b.cancelAt ?? b.currentPeriodEnd, cancelAt: b.cancelAt, renews: b.cancelAt == nil, canManageBilling: canManageBilling, source: .stripe)
    }
    let appleGrants = { (plan: ApplePlan) in b.applePlan == plan && isAfter(b.appleExpiresAt, now) }
    if appleGrants(.studio) {
        return withLimits(.studio, accessUntil: b.appleExpiresAt, cancelAt: nil, renews: b.appleWillRenew, canManageBilling: canManageBilling, source: .apple)
    }
    let stripePass = b.plan == .creator && isAfter(b.planExpiresAt, now) ? b.planExpiresAt : nil
    let applePass = appleGrants(.creator) ? b.appleExpiresAt : nil
    if stripePass != nil || applePass != nil {
        let appleWins: Bool
        if let applePass {
            if let stripePass { appleWins = parseISODate(applePass)! > parseISODate(stripePass)! } else { appleWins = true }
        } else {
            appleWins = false
        }
        return withLimits(.creator, accessUntil: appleWins ? applePass : stripePass, cancelAt: nil, renews: false, canManageBilling: canManageBilling, source: appleWins ? .apple : .stripe)
    }
    return withLimits(.explorer, accessUntil: nil, cancelAt: nil, renews: false, canManageBilling: canManageBilling, source: nil)
}
