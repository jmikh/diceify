import DiceCore
import Foundation
import RevenueCat

/// A plan the App Store sells, with its price as StoreKit formats it for the buyer (prices live in App Store Connect).
struct StoreOffer: Equatable, Sendable, Identifiable {
    let plan: CheckoutPlan
    let productId: String
    let price: Decimal
    /// `$9.00`, in the buyer's currency.
    let priceText: String
    /// Studio yearly: the price per month (`$3.00`).
    let perMonthText: String?
    var id: CheckoutPlan { plan }

    /// Which plan an App Store product sells: `studio…` (after an optional reverse-DNS prefix, as in
    /// `_shared/apple-snapshot.ts` `planOfProduct`), the interval from the product's subscription period. The app sells
    /// Studio only: a `creator…` product is ignored (a Creator pass bought on the web is still honoured).
    static func plan(productId: String, yearly: Bool) -> CheckoutPlan? {
        let name = (productId.lowercased().split(separator: ".").last).map(String.init) ?? ""
        return name.hasPrefix("studio") ? (yearly ? .studioYearly : .studioMonthly) : nil
    }
}

enum PurchaseOutcome: Equatable, Sendable {
    case purchased
    case cancelled
    /// Waiting for approval (Ask to Buy, a bank check): StoreKit finishes it later and the webhook records it.
    case pending
}

/// A store failure worded for the buyer.
struct StoreFailure: Error, Equatable, LocalizedError {
    let message: String
    var errorDescription: String? { message }

    /// The store returned no plans (empty offering, or no product fetched from App Store Connect).
    static let notOnSale = "No plans are on sale right now. Please try again later."
}

/// The App Store side of billing. Entitlements never come from here: a purchase or restore is followed by
/// `billing/apple-sync`, which writes the profile's `apple_*` columns (AppSession.syncAppleBilling).
@MainActor
protocol PurchaseBackend: AnyObject {
    /// False when the build has no store key (`REVENUECAT_API_KEY`).
    var isConfigured: Bool { get }
    /// The current offering's plans.
    func offers() async throws -> [StoreOffer]
    /// Buy `plan` for `userId` (the RevenueCat app user id is the Supabase user id).
    func purchase(_ plan: CheckoutPlan, userId: UUID) async throws -> PurchaseOutcome
    /// Attach this Apple ID's purchases to `userId` (RevenueCat moves them from another account: a TRANSFER event).
    func restore(userId: UUID) async throws
    /// Follow sign-in (nil = signed out).
    func identify(_ userId: UUID?) async
}

/// RevenueCat (purchases-ios): the one importer, like Analytics for PostHog.
@MainActor
final class RevenueCatStore: PurchaseBackend {
    static let shared = RevenueCatStore()
    /// The packages behind the last `offers()`, which `purchase` buys.
    private var packages: [CheckoutPlan: Package] = [:]

    /// Configure once, at launch; without a key the store stays off. Anonymous until `identify`.
    static func start() {
        guard !Purchases.isConfigured, let key = AppConfig.revenueCatKey else { return }
        Purchases.logLevel = .warn
        Purchases.configure(with: Configuration.Builder(withAPIKey: key).build())
    }

    /// The RevenueCat app user id: the Supabase user id as the server spells it. RevenueCat ids are case-sensitive
    /// and `UUID.uuidString` is upper case.
    nonisolated static func appUserID(_ userId: UUID) -> String { userId.uuidString.lowercased() }

    var isConfigured: Bool { Purchases.isConfigured }

    func offers() async throws -> [StoreOffer] {
        guard isConfigured else { throw StoreFailure(message: "In-app purchases are not set up in this build.") }
        let offering = try await mapped { try await Purchases.shared.offerings().current }
        var found: [CheckoutPlan: Package] = [:]
        var offers: [StoreOffer] = []
        for package in offering?.availablePackages ?? [] {
            let product = package.storeProduct
            guard let plan = StoreOffer.plan(productId: product.productIdentifier, yearly: product.subscriptionPeriod?.unit == .year),
                  found[plan] == nil else { continue }
            found[plan] = package
            offers.append(StoreOffer(plan: plan, productId: product.productIdentifier, price: product.price, priceText: product.localizedPriceString, perMonthText: plan == .studioYearly ? product.localizedPricePerMonth : nil))
        }
        packages = found
        return offers
    }

    func purchase(_ plan: CheckoutPlan, userId: UUID) async throws -> PurchaseOutcome {
        try await logIn(userId)
        if packages[plan] == nil { _ = try await offers() }
        guard let package = packages[plan] else { throw StoreFailure(message: "That plan is not on sale right now.") }
        do {
            return try await Purchases.shared.purchase(package: package).userCancelled ? .cancelled : .purchased
        } catch let error as ErrorCode where error == .purchaseCancelledError {
            return .cancelled
        } catch let error as ErrorCode where error == .paymentPendingError {
            return .pending
        } catch {
            throw Self.failure(error)
        }
    }

    func restore(userId: UUID) async throws {
        try await logIn(userId)
        _ = try await mapped { try await Purchases.shared.restorePurchases() }
    }

    func identify(_ userId: UUID?) async {
        guard isConfigured else { return }
        do {
            if let userId {
                try await logIn(userId)
            } else if !Purchases.shared.isAnonymous {
                _ = try await Purchases.shared.logOut()
            }
        } catch {
            reportError(error, where: "purchases-identify")
        }
    }

    private func logIn(_ userId: UUID) async throws {
        guard isConfigured else { throw StoreFailure(message: "In-app purchases are not set up in this build.") }
        let id = Self.appUserID(userId)
        if Purchases.shared.appUserID != id { _ = try await mapped { try await Purchases.shared.logIn(id) } }
    }

    private func mapped<T>(_ work: () async throws -> T) async throws -> T {
        do { return try await work() } catch { throw Self.failure(error) }
    }

    /// RevenueCat's error codes in the buyer's words; the original goes to the error log.
    static func failure(_ error: Error) -> StoreFailure {
        reportError(error, where: "purchases")
        let message: String = switch error as? ErrorCode {
        // No product fetched from App Store Connect (e.g. the Paid Apps agreement is not active yet)
        case .configurationError, .productNotAvailableForPurchaseError: StoreFailure.notOnSale
        case .networkError, .offlineConnectionError: "The App Store could not be reached. Check your connection and try again."
        case .purchaseNotAllowedError: "Purchases are not allowed on this device (Screen Time or a managed device)."
        case .receiptAlreadyInUseError: "These App Store purchases belong to another Diceify account."
        case .productAlreadyPurchasedError: "This Apple ID already owns that plan. Try Restore purchases."
        case .storeProblemError: "The App Store had a problem. Please try again in a moment."
        default: "The purchase could not be completed. Please try again."
        }
        return StoreFailure(message: message)
    }
}

#if DEBUG
/// A store without RevenueCat, for the app tests and `--ui-fake-store` screenshots: the web's prices, scripted
/// outcomes, every call recorded.
@MainActor
final class FakeStore: PurchaseBackend {
    var isConfigured = true
    var catalog: [StoreOffer] = [
        StoreOffer(plan: .studioMonthly, productId: "studio_monthly", price: 9, priceText: "$9.00", perMonthText: nil),
        StoreOffer(plan: .studioYearly, productId: "studio_yearly", price: 36, priceText: "$36.00", perMonthText: "$3.00"),
    ]
    var outcome: PurchaseOutcome = .purchased
    /// Thrown by the next store call instead of answering.
    var failure: Error?
    private(set) var purchases: [(plan: CheckoutPlan, userId: UUID)] = []
    private(set) var restores: [UUID] = []
    private(set) var identified: [UUID?] = []

    func offers() async throws -> [StoreOffer] {
        if let failure { throw failure }
        return catalog
    }

    func purchase(_ plan: CheckoutPlan, userId: UUID) async throws -> PurchaseOutcome {
        if let failure { throw failure }
        purchases.append((plan, userId))
        return outcome
    }

    func restore(userId: UUID) async throws {
        if let failure { throw failure }
        restores.append(userId)
    }

    func identify(_ userId: UUID?) async { identified.append(userId) }
}
#endif
