import DiceCore
import SwiftUI

/// Feature gating (features/editor/hooks/useGate.ts): one place decides which sheet a blocked action opens.
enum GatedFeature: String { case buildLimit = "build_limit", blueprint, share, upgrade }

/// What a blocked user lacks. A plan (default): the paywall, signed in or not — pricing comes first, and the paywall
/// asks for sign-in once a price is picked. An account (share): anonymous users get the sign-in sheet.
enum GateRequirement { case plan, account }

enum GatePrompt: Identifiable, Equatable {
    case signIn(message: String)
    case limit
    case proFeature

    var id: String {
        switch self {
        case .signIn: "signIn"
        case .limit: "limit"
        case .proFeature: "proFeature"
        }
    }

    /// The web's `paywall_shown.prompt` values.
    var analyticsName: String { id == "signIn" ? "sign_in" : id }
}

/// Pure decision (`resolveGate`): allowed → nil; an account gate while anonymous → sign in; otherwise the limit/upgrade sheet.
func resolveGate(_ allowed: Bool, signedIn: Bool, requires: GateRequirement = .plan, signInMessage: String? = nil, blocked: GatePrompt = .proFeature) -> GatePrompt? {
    if allowed { return nil }
    if requires == .account && !signedIn { return .signIn(message: signInMessage ?? "Sign in to continue.") }
    return blocked
}

extension AppSession {
    /// The prompt a blocked action opens, or nil when allowed. A blocked action reports `paywall_shown`.
    func gate(_ allowed: Bool, _ feature: GatedFeature, requires: GateRequirement = .plan, signInMessage: String? = nil, blocked: GatePrompt = .proFeature) -> GatePrompt? {
        guard let prompt = resolveGate(allowed, signedIn: status == .authed, requires: requires, signInMessage: signInMessage, blocked: blocked) else { return nil }
        Analytics.track(.paywallShown(feature: feature.rawValue, prompt: prompt.analyticsName))
        return prompt
    }

    /// The open design's settings the plan does not include (the design paywall); empty = no watermark.
    func designLocks(for dice: DiceParams) -> [DesignLock] { DiceCore.designLocks(entitlements, dice) }

    /// The header's Upgrade button and the design paywall: `click_upgrade` then the paywall.
    func upgradePrompt(source: String) -> GatePrompt? {
        Analytics.track(.clickUpgrade(source: source, planType: nil))
        return gate(false, .upgrade)
    }
}
