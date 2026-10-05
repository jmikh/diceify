import DiceCore
import SwiftUI

/// Feature gating (features/editor/hooks/useGate.ts): one place decides which sheet a blocked action opens.
enum GatedFeature: String { case buildLimit = "build_limit", blueprint, share, upgrade }

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

extension AppSession {
    /// Allowed → nil; anonymous → sign in; signed in without the entitlement → the limit/upgrade sheet. A blocked
    /// action reports `paywall_shown`.
    func gate(_ allowed: Bool, _ feature: GatedFeature, signInMessage: String? = nil, blocked: GatePrompt = .proFeature) -> GatePrompt? {
        if allowed { return nil }
        let prompt: GatePrompt = status != .authed ? .signIn(message: signInMessage ?? "Sign in to continue.") : blocked
        Analytics.track(.paywallShown(feature: feature.rawValue, prompt: prompt.analyticsName))
        return prompt
    }
}
