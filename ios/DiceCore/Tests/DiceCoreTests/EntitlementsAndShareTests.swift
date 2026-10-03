import Foundation
import Testing
@testable import DiceCore

private let NOW = parseISODate("2026-09-30T12:00:00.000Z")!
private let DAY = 86_400.0
private func iso(_ offsetSeconds: Double) -> String { isoString(NOW.addingTimeInterval(offsetSeconds)) }

@Suite struct EntitlementsTests {
    @Test func limitsAndPricing() {
        #expect(PLAN_LIMITS[.explorer] == PlanLimits(builderRowLimit: 5, hasSvgExport: false))
        for plan in [Plan.creator, .studio, .lifetime] { #expect(PLAN_LIMITS[plan] == PlanLimits(builderRowLimit: nil, hasSvgExport: true)) }
        #expect(Pricing.Creator.price == 19 && Pricing.Creator.accessDays == 30 && Pricing.Studio.monthlyPrice == 9 && Pricing.Studio.yearlyPrice == 36)
        #expect(Pricing.studioYearlyMonthlyEffective == 3 && Pricing.studioYearlySavingsPercent == 67)
    }

    @Test func dates() {
        #expect(parseISODate("2026-10-03T11:49:22.455Z") != nil && parseISODate("2026-10-03T11:49:22+00:00") != nil && parseISODate("2026-10-03T11:49:22.455+00:00") != nil)
        #expect(parseISODate("never") == nil)
        #expect(isoString(NOW) == "2026-09-30T12:00:00.000Z")
    }

    /// Every plan × status × expiry × cancelAt × customer, against the same expectation table as the web test.
    @Test func exhaustiveStripe() {
        let statuses: [String?] = [nil, "active", "trialing", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]
        let expiries: [(String?, Bool)] = [(nil, false), (iso(-30 * DAY), false), (iso(-1), false), (iso(0), false), (iso(1), true), (iso(30 * DAY), true)]
        let periodEnd = iso(25 * DAY)
        for plan in Plan.allCases {
            for status in statuses {
                for (expiry, live) in expiries {
                    for cancelAt in [nil, iso(20 * DAY)] {
                        for hasCustomer in [false, true] {
                            let b = BillingState(plan: plan, planExpiresAt: expiry, subscriptionStatus: status, currentPeriodEnd: periodEnd, cancelAt: cancelAt, hasStripeCustomer: hasCustomer)
                            let e = deriveEntitlements(b, now: NOW)
                            let studioLive = plan == .studio && status != nil && PRO_SUBSCRIPTION_STATUSES.contains(status!)
                            let expected: Plan = plan == .lifetime ? .lifetime : studioLive ? .studio : (plan == .creator && live ? .creator : .explorer)
                            let limits = PLAN_LIMITS[expected]!
                            var want = Entitlements(plan: expected, isPro: expected != .explorer, builderRowLimit: limits.builderRowLimit, hasSvgExport: limits.hasSvgExport, accessUntil: nil, cancelAt: nil, renews: false, canManageBilling: hasCustomer, source: expected == .studio || expected == .creator ? .stripe : nil)
                            if expected == .studio {
                                want.accessUntil = cancelAt ?? periodEnd
                                want.cancelAt = cancelAt
                                want.renews = cancelAt == nil
                            } else if expected == .creator {
                                want.accessUntil = expiry
                            }
                            #expect(e == want, "\(plan) \(status ?? "-") expires \(expiry ?? "-") cancel \(cancelAt ?? "-") customer \(hasCustomer)")
                        }
                    }
                }
            }
        }
        #expect(EXPLORER_ENTITLEMENTS == deriveEntitlements(BillingState(plan: .explorer), now: NOW))
    }

    @Test func appleSource() {
        let future = iso(10 * DAY), later = iso(20 * DAY), past = iso(-DAY)
        let apple = deriveEntitlements(BillingState(plan: .explorer, applePlan: .studio, appleExpiresAt: future, appleWillRenew: true), now: NOW)
        #expect(apple.plan == .studio && apple.source == .apple && apple.accessUntil == future && apple.cancelAt == nil && apple.renews && !apple.canManageBilling)
        #expect(!deriveEntitlements(BillingState(plan: .explorer, applePlan: .studio, appleExpiresAt: future, appleWillRenew: false), now: NOW).renews)
        for state in [
            BillingState(plan: .explorer, applePlan: .studio, appleExpiresAt: past),
            BillingState(plan: .explorer, applePlan: .studio, appleExpiresAt: iso(0)),
            BillingState(plan: .explorer, applePlan: .creator, appleExpiresAt: nil),
            BillingState(plan: .explorer, applePlan: nil, appleExpiresAt: future),
        ] {
            #expect(deriveEntitlements(state, now: NOW) == EXPLORER_ENTITLEMENTS)
        }
        let both = deriveEntitlements(BillingState(plan: .studio, subscriptionStatus: "active", currentPeriodEnd: later, applePlan: .studio, appleExpiresAt: future), now: NOW)
        #expect(both.plan == .studio && both.source == .stripe && both.accessUntil == later)
        let pass = deriveEntitlements(BillingState(plan: .creator, planExpiresAt: later, applePlan: .studio, appleExpiresAt: future), now: NOW)
        #expect(pass.plan == .studio && pass.source == .apple && pass.accessUntil == future)
        let appleLater = deriveEntitlements(BillingState(plan: .creator, planExpiresAt: future, applePlan: .creator, appleExpiresAt: later), now: NOW)
        #expect(appleLater.plan == .creator && appleLater.source == .apple && appleLater.accessUntil == later)
        let stripeLater = deriveEntitlements(BillingState(plan: .creator, planExpiresAt: later, applePlan: .creator, appleExpiresAt: future), now: NOW)
        #expect(stripeLater.source == .stripe && stripeLater.accessUntil == later)
        #expect(deriveEntitlements(BillingState(plan: .creator, planExpiresAt: later, applePlan: .creator, appleExpiresAt: later), now: NOW).source == .stripe)
        let expiredStripe = deriveEntitlements(BillingState(plan: .creator, planExpiresAt: past, applePlan: .creator, appleExpiresAt: future), now: NOW)
        #expect(expiredStripe.plan == .creator && expiredStripe.source == .apple)
        let lifetime = deriveEntitlements(BillingState(plan: .lifetime, applePlan: .studio, appleExpiresAt: future), now: NOW)
        #expect(lifetime.plan == .lifetime && lifetime.source == nil)
    }

    @Test func pinnedCases() {
        #expect(deriveEntitlements(BillingState(plan: .studio, subscriptionStatus: "past_due"), now: NOW).plan == .studio)
        let canceled = deriveEntitlements(BillingState(plan: .studio, subscriptionStatus: "canceled", currentPeriodEnd: iso(DAY)), now: NOW)
        #expect(canceled.plan == .explorer && canceled.accessUntil == nil)
        #expect(deriveEntitlements(BillingState(plan: .creator, planExpiresAt: iso(-1)), now: NOW).plan == .explorer)
        #expect(deriveEntitlements(BillingState(plan: .creator, planExpiresAt: iso(0)), now: NOW).plan == .explorer)
        #expect(deriveEntitlements(BillingState(plan: .creator, planExpiresAt: iso(1)), now: NOW).plan == .creator)
    }
}

@Suite struct ShareTests {
    @Test func ids() throws {
        #expect(SHARE_ID_ALPHABET.count == 32 && Set(SHARE_ID_ALPHABET).count == 32)
        #expect(try shareId(fromBytes: [0, 1, 31, 32, 255, 63, 2, 3, 4, 5]) == "ab9a99cdef")
        let id = try shareId(fromBytes: (0..<SHARE_ID_LENGTH).map { UInt8(($0 * 37) & 255) })
        #expect(isShareId(id) && !isShareId(String(id.dropFirst())) && !isShareId(id + "a"))
        #expect(!isShareId("abcdefghil") && !isShareId("ABCDEFGHIJ") && !isShareId("abc/../efg"))
        #expect(throws: ShareIdError.self) { try shareId(fromBytes: [1, 2, 3]) }
    }

    @Test func urls() {
        #expect(shareUrl(origin: "https://diceify.art", id: "abcdefghij", source: .x) == "https://diceify.art/s/abcdefghij?utm_source=x&utm_medium=social&utm_campaign=share")
        #expect(shareUrl(origin: "https://diceify.art", id: "abcdefghij", source: .shareSheet).hasSuffix("utm_source=share_sheet&utm_medium=social&utm_campaign=share"))
        #expect(shareImageUrl(supabaseUrl: "https://ref.supabase.co/", id: "abcdefghij") == "https://ref.supabase.co/storage/v1/object/public/share-images/abcdefghij.jpg")
        let url = "https://diceify.art/s/abcdefghij?utm_source=x"
        let x = URLComponents(string: postIntentUrl(platform: .x, url: url, text: "Look 🎲 & see"))!
        #expect(x.host == "x.com" && x.path == "/intent/tweet")
        #expect(x.queryItems?.first { $0.name == "text" }?.value == "Look 🎲 & see" && x.queryItems?.first { $0.name == "url" }?.value == url)
        let fb = URLComponents(string: postIntentUrl(platform: .facebook, url: url, text: "ignored"))!
        #expect(fb.host == "www.facebook.com" && fb.path == "/sharer/sharer.php" && fb.queryItems?.map(\.name) == ["u"] && fb.queryItems?.first?.value == url)
        #expect(encodeURIComponent("a b&c=d/é!*'()") == "a%20b%26c%3Dd%2F%C3%A9!*'()")
    }

    @Test func copy() {
        #expect(formatDiceCount(2304) == "2,304" && formatDiceCount(999) == "999" && formatDiceCount(1_234_567) == "1,234,567" && formatDiceCount(0) == "0")
        #expect(shareCopy(ShareGrid(cols: 48, rows: 48)) == ShareCopy(
            title: "Dice art made from 2,304 dice",
            description: "A 48 × 48 dice mosaic made with Diceify. Turn any photo into dice art you can build by hand.",
            imageAlt: "Dice art mosaic made from 2,304 dice (48 × 48)",
            postText: "Look what I made with Diceify: dice art from 2,304 dice 🎲"
        ))
    }

    @Test func cardLayout() {
        let inside = { (box: Box) in box.x >= 0 && box.y >= 0 && box.x + box.width <= ShareCard.width && box.y + box.height <= ShareCard.height }
        for (cols, rows) in [(48, 48), (36, 48), (80, 45), (120, 20), (20, 120)] {
            let layout = shareCardLayout(cols: cols, rows: rows)
            let art = layout.art, text = layout.text
            #expect(abs(Double(art.width) / Double(art.height) - Double(cols) / Double(rows)) < 0.05 * Double(cols) / Double(rows))
            #expect(inside(art) && inside(text) && art.x + art.width <= text.x && art.x == 0)
            #expect(abs(art.y - (ShareCard.height - (art.y + art.height))) <= 1)
            #expect(abs(text.x - art.width - (ShareCard.width - (text.x + text.width))) <= 1)
        }
        for (cols, rows) in [(48, 48), (36, 48), (20, 120)] {
            let art = shareCardLayout(cols: cols, rows: rows).art
            #expect(art.y == 0 && art.height == ShareCard.height)
        }
    }
}
