import DiceCore
import Foundation
import Observation

/// What the paywall needs from the signed-in session (AppSession; a stub in tests).
@MainActor
protocol BillingAccount: AnyObject {
    var userId: UUID? { get }
    var entitlements: Entitlements { get }
    /// Recompute the `apple_*` columns server-side and reload the profile.
    func syncAppleBilling() async throws
}

/// The paywall's state (features/billing/PricingCards.tsx): the App Store offers, one purchase or restore at a time,
/// then the plan as the profile reports it (the single source; `billing/apple-sync` writes it right away).
@MainActor
@Observable
final class PaywallModel {
    enum Phase: Equatable {
        case loading
        case ready
        /// No offers to show (no store key in this build, the store unreachable): the message replaces the cards.
        case unavailable(String)
        /// The account has a paid plan (bought just now or before).
        case active(Plan)
    }

    enum Busy: Equatable {
        case buying(CheckoutPlan)
        case restoring
    }

    private(set) var phase: Phase = .loading
    private(set) var offers: [CheckoutPlan: StoreOffer] = [:]
    private(set) var busy: Busy?
    /// A line under the cards: a failure, a purchase waiting for approval, nothing to restore.
    private(set) var notice: String?
    /// The Studio interval on show (the web defaults to yearly).
    var studioInterval: CheckoutPlan = .studioYearly
    /// Between `billing/apple-sync` attempts (tests: zero).
    var retryDelay: Duration = .seconds(1)

    /// `click_upgrade.source`.
    let source: String
    private let store: PurchaseBackend
    private let account: BillingAccount

    init(source: String, store: PurchaseBackend, account: BillingAccount) {
        self.source = source
        self.store = store
        self.account = account
    }

    /// Yearly against twelve months, rounded like the web's `STUDIO_YEARLY_SAVINGS_PERCENT`; nil without both prices.
    var studioSavingsPercent: Int? {
        guard let monthly = offers[.studioMonthly]?.price, let yearly = offers[.studioYearly]?.price, monthly > 0 else { return nil }
        let ratio = NSDecimalNumber(decimal: yearly / (monthly * 12)).doubleValue
        return Int(((1 - ratio) * 100).rounded())
    }

    func load() async {
        if account.entitlements.isPro {
            phase = .active(account.entitlements.plan)
            return
        }
        guard store.isConfigured else {
            phase = .unavailable("In-app purchases are not set up in this build.")
            return
        }
        phase = .loading
        do {
            let list = try await store.offers()
            offers = Dictionary(list.map { ($0.plan, $0) }, uniquingKeysWith: { first, _ in first })
            if offers[studioInterval] == nil, let other = [CheckoutPlan.studioYearly, .studioMonthly].first(where: { offers[$0] != nil }) {
                studioInterval = other
            }
            phase = offers.isEmpty ? .unavailable(StoreFailure.notOnSale) : .ready
        } catch {
            phase = .unavailable(Self.message(error, fallback: "The App Store could not be reached. Check your connection and try again."))
        }
    }

    func buy(_ plan: CheckoutPlan) async {
        guard busy == nil else { return }
        Analytics.track(.clickUpgrade(source: source, planType: plan.rawValue))
        guard let userId = account.userId else {
            notice = "Sign in to upgrade."
            return
        }
        // Any active paid plan already covers what a purchase offers (no stacking, as on the web)
        if account.entitlements.isPro {
            phase = .active(account.entitlements.plan)
            return
        }
        busy = .buying(plan)
        notice = nil
        defer { busy = nil }
        do {
            Analytics.track(.checkoutStarted(plan: plan.rawValue))
            switch try await store.purchase(plan, userId: userId) {
            case .cancelled:
                break
            case .pending:
                notice = "Waiting for approval. Your plan unlocks as soon as the purchase goes through."
            case .purchased:
                if await !settle() {
                    notice = "Purchase complete. Your plan can take a moment to appear: refresh it on the Account screen."
                }
            }
        } catch {
            notice = Self.message(error, fallback: "The purchase could not be completed. Please try again.")
        }
    }

    /// Restore this Apple ID's purchases onto the signed-in account. True when the account has a paid plan afterwards.
    @discardableResult
    func restore() async -> Bool {
        guard busy == nil, let userId = account.userId else { return false }
        busy = .restoring
        notice = nil
        defer { busy = nil }
        do {
            try await store.restore(userId: userId)
        } catch {
            notice = Self.message(error, fallback: "Purchases could not be restored. Please try again.")
            return false
        }
        if await settle() { return true }
        notice = "No App Store purchases to restore for this Apple ID."
        return false
    }

    /// `billing/apple-sync` (up to three tries: RevenueCat has the purchase once StoreKit returns, so a failure is the
    /// network or the function), then the plan from the reloaded profile.
    private func settle() async -> Bool {
        for attempt in 1 ... 3 {
            do {
                try await account.syncAppleBilling()
                break
            } catch {
                if attempt == 3 {
                    reportError(error, where: "apple-sync")
                } else {
                    try? await Task.sleep(for: retryDelay * attempt)
                }
            }
        }
        guard account.entitlements.isPro else { return false }
        phase = .active(account.entitlements.plan)
        return true
    }

    private static func message(_ error: Error, fallback: String) -> String {
        (error as? StoreFailure)?.message ?? (error as? FunctionError)?.message ?? fallback
    }
}
