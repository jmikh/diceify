import DiceCore
import Foundation
import RevenueCat
import Testing
@testable import Diceify

/// The session side of the paywall: apple-sync grants whatever the test says RevenueCat holds.
@MainActor
private final class StubAccount: BillingAccount {
    var userId: UUID? = UUID()
    var entitlements = EXPLORER_ENTITLEMENTS
    /// What the profile shows after `billing/apple-sync` (nil = no Apple purchase).
    var afterSync: BillingState?
    var syncFailure: Error?
    private(set) var syncCalls = 0

    func syncAppleBilling() async throws {
        syncCalls += 1
        if let syncFailure { throw syncFailure }
        if let afterSync { entitlements = deriveEntitlements(afterSync, now: Date()) }
    }
}

private let appleStudio = BillingState(plan: .explorer, applePlan: .studio, appleExpiresAt: "2099-01-01T00:00:00Z", appleWillRenew: true)

@MainActor
private func makeModel(store: FakeStore = FakeStore(), account: StubAccount = StubAccount()) -> (PaywallModel, FakeStore, StubAccount) {
    let model = PaywallModel(source: "pro_feature_modal", store: store, account: account)
    model.retryDelay = .zero
    return (model, store, account)
}

/// App Store product ids → plans (`_shared/apple-snapshot.ts` `planOfProduct` + the subscription period); the app
/// sells Studio only.
@Suite struct StoreOfferTests {
    @Test func productIdsMapToPlans() {
        #expect(StoreOffer.plan(productId: "creator_30d", yearly: false) == nil)
        #expect(StoreOffer.plan(productId: "studio_monthly", yearly: false) == .studioMonthly)
        #expect(StoreOffer.plan(productId: "studio_yearly", yearly: true) == .studioYearly)
        #expect(StoreOffer.plan(productId: "art.diceify.app.Studio_Annual", yearly: true) == .studioYearly)
        #expect(StoreOffer.plan(productId: "tip_jar", yearly: false) == nil)
    }

    @Test func revenueCatUserIdIsTheServerSpelling() {
        let id = UUID(uuidString: "0B3C8E7A-1F2D-4C5B-9A8E-7D6C5B4A3F21")!
        #expect(RevenueCatStore.appUserID(id) == "0b3c8e7a-1f2d-4c5b-9a8e-7d6c5b4a3f21")
    }

    /// No product from App Store Connect (Paid Apps agreement not active) reads as "not on sale", not a failed purchase.
    @Test @MainActor func missingProductsReadAsNotOnSale() {
        #expect(RevenueCatStore.failure(ErrorCode.configurationError).message == StoreFailure.notOnSale)
        #expect(RevenueCatStore.failure(ErrorCode.productNotAvailableForPurchaseError).message == StoreFailure.notOnSale)
        #expect(RevenueCatStore.failure(ErrorCode.unknownError).message == "The purchase could not be completed. Please try again.")
    }

    @Test func checkoutStartedEvent() {
        let event = AnalyticsEvent.checkoutStarted(plan: CheckoutPlan.studioYearly.rawValue)
        #expect(event.name == "checkout_started" && event.properties["plan"] as? String == "studio_yearly")
        #expect(GatePrompt.limit.upgradeSource == "limit_reached" && GatePrompt.proFeature.upgradeSource == "pro_feature_modal")
    }
}

@Suite @MainActor struct PaywallModelTests {
    @Test func loadsTheOffers() async {
        let (model, _, _) = makeModel()
        await model.load()
        #expect(model.phase == .ready)
        #expect(Set(model.offers.keys) == [.studioMonthly, .studioYearly])
        #expect(model.studioInterval == .studioYearly && model.studioSavingsPercent == Pricing.studioYearlySavingsPercent)
    }

    @Test func onlyMonthlyOnSale() async {
        let store = FakeStore()
        store.catalog.removeAll { $0.plan == .studioYearly }
        let (model, _, _) = makeModel(store: store)
        await model.load()
        #expect(model.studioInterval == .studioMonthly && model.studioSavingsPercent == nil)
    }

    @Test func unavailableStates() async {
        let unconfigured = FakeStore()
        unconfigured.isConfigured = false
        let (a, _, _) = makeModel(store: unconfigured)
        await a.load()
        #expect(a.phase == .unavailable("In-app purchases are not set up in this build."))

        let failing = FakeStore()
        failing.failure = StoreFailure(message: "The App Store could not be reached.")
        let (b, _, _) = makeModel(store: failing)
        await b.load()
        #expect(b.phase == .unavailable("The App Store could not be reached."))

        let empty = FakeStore()
        empty.catalog = []
        let (c, _, _) = makeModel(store: empty)
        await c.load()
        if case .unavailable = c.phase {} else { Issue.record("expected unavailable, got \(c.phase)") }
    }

    @Test func aPaidPlanShowsInsteadOfTheCards() async {
        let account = StubAccount()
        account.entitlements = deriveEntitlements(appleStudio, now: Date())
        let (model, store, _) = makeModel(account: account)
        await model.load()
        #expect(model.phase == .active(.studio))
        await model.buy(.studioMonthly)
        #expect(store.purchases.isEmpty)
    }

    @Test func purchaseThenSyncUnlocks() async {
        let account = StubAccount()
        account.afterSync = appleStudio
        let (model, store, _) = makeModel(account: account)
        await model.load()
        await model.buy(.studioYearly)
        #expect(store.purchases.count == 1 && store.purchases[0].plan == .studioYearly && store.purchases[0].userId == account.userId)
        #expect(account.syncCalls == 1)
        #expect(model.phase == .active(.studio) && model.notice == nil && model.busy == nil)
    }

    @Test func cancelledAndPending() async {
        let (model, store, account) = makeModel()
        await model.load()
        store.outcome = .cancelled
        await model.buy(.studioMonthly)
        #expect(model.phase == .ready && model.notice == nil && account.syncCalls == 0)
        store.outcome = .pending
        await model.buy(.studioMonthly)
        #expect(model.phase == .ready && model.notice?.hasPrefix("Waiting for approval") == true && account.syncCalls == 0)
    }

    @Test func syncFailureKeepsThePurchaseVisible() async {
        let account = StubAccount()
        account.syncFailure = FunctionError(code: "INTERNAL", message: "Apple billing sync failed", status: 500)
        let (model, _, _) = makeModel(account: account)
        await model.load()
        await model.buy(.studioMonthly)
        #expect(account.syncCalls == 3)
        #expect(model.phase == .ready && model.notice?.hasPrefix("Purchase complete") == true)
    }

    @Test func storeFailureIsShown() async {
        let (model, store, account) = makeModel()
        await model.load()
        store.failure = StoreFailure(message: "Purchases are not allowed on this device.")
        await model.buy(.studioMonthly)
        #expect(model.notice == "Purchases are not allowed on this device." && account.syncCalls == 0)
    }

    @Test func signedOutCannotBuy() async {
        let account = StubAccount()
        account.userId = nil
        let (model, store, _) = makeModel(account: account)
        await model.load()
        await model.buy(.studioMonthly)
        #expect(store.purchases.isEmpty && model.notice == "Sign in to upgrade.")
    }

    @Test func restore() async {
        let account = StubAccount()
        let (model, store, _) = makeModel(account: account)
        await model.load()
        #expect(await model.restore() == false)
        #expect(store.restores == [account.userId!] && model.notice == "No App Store purchases to restore for this Apple ID.")
        account.afterSync = appleStudio
        #expect(await model.restore() == true)
        #expect(model.phase == .active(.studio) && model.notice == nil)
    }
}
