import CoreGraphics
import DiceCore
import Foundation
import Supabase
import Testing
import UIKit
@testable import Diceify

/// The event catalog mirrors lib/analytics.ts (names, property keys, the web's values).
@Suite struct AnalyticsEventTests {
    @Test func namesAndPropertiesMatchTheWeb() {
        let share = AnalyticsEvent.share(method: "copy_link", shareId: "abc")
        #expect(share.name == "share")
        #expect(share.properties["method"] as? String == "copy_link" && share.properties["content_type"] as? String == "dice_art" && share.properties["item_id"] as? String == "abc")
        let tune = AnalyticsEvent.tuneCompleted(rows: 70, cols: nil, totalDice: nil, colorMode: "both", contrast: 25, gamma: 1, edgeSharpening: 5, rotate6: false, rotate3: true, rotate2: false)
        #expect(tune.name == "tune_completed")
        #expect(Set(tune.properties.keys) == ["rows", "cols", "total_dice", "color_mode", "contrast", "gamma", "edge_sharpening", "rotate6", "rotate3", "rotate2"])
        #expect(tune.properties["cols"] is NSNull && tune.properties["rotate3"] as? Bool == true)
        #expect(AnalyticsEvent.clickUpgrade(source: "account_page", planType: nil).properties.keys.sorted() == ["source"])
        #expect(AnalyticsEvent.clickUpgrade(source: "x", planType: "studio").properties["plan_type"] as? String == "studio")
        #expect(AnalyticsEvent.paywallShown(feature: "share", prompt: "sign_in").name == "paywall_shown")
        #expect(GatePrompt.signIn(message: "m").analyticsName == "sign_in" && GatePrompt.limit.analyticsName == "limit" && GatePrompt.proFeature.analyticsName == "proFeature")
    }

    @Test func mimeTypeFromSignature() {
        #expect(ImageKit.mimeType(of: Data([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0])) == "image/jpeg")
        #expect(ImageKit.mimeType(of: Data([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])) == "image/png")
        #expect(ImageKit.mimeType(of: Data([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])) == "image/heic")
        #expect(ImageKit.mimeType(of: Data([1, 2, 3])) == "image/unknown")
    }
}

/// The functions' error envelope (lib/supabase/functions.ts).
@Suite struct FunctionErrorTests {
    @Test func parsesTheEnvelope() {
        let body = Data(#"{"error":{"code":"UNAUTHORIZED","message":"Sign in required"}}"#.utf8)
        #expect(FunctionError.from(status: 401, body: body) == FunctionError(code: "UNAUTHORIZED", message: "Sign in required", status: 401))
        let garbage = FunctionError.from(status: 502, body: Data("<html>".utf8))
        #expect(garbage.code == "INTERNAL" && garbage.status == 502 && garbage.errorDescription == "Request failed (502)")
    }
}

/// The plan words (features/billing/planCopy.ts + AccountScreen `statusLine`).
@Suite struct PlanCopyTests {
    @Test func statusLines() {
        #expect(PlanCopy.date("2026-09-30T10:00:00.000Z") == "Sep 30, 2026")
        let appleStudio = deriveEntitlements(BillingState(plan: .explorer, applePlan: .studio, appleExpiresAt: "2099-01-02T00:00:00Z", appleWillRenew: true), now: Date())
        #expect(PlanCopy.statusLine(appleStudio) == "Renews on Jan 2, 2099. Subscribed in this app.")
        let stripeStudio = deriveEntitlements(BillingState(plan: .studio, subscriptionStatus: "active", currentPeriodEnd: "2099-01-02T00:00:00Z", hasStripeCustomer: true), now: Date())
        #expect(PlanCopy.statusLine(stripeStudio) == "Renews on Jan 2, 2099. Subscribed on the web.")
        let applePass = deriveEntitlements(BillingState(plan: .explorer, applePlan: .creator, appleExpiresAt: "2099-01-02T00:00:00Z"), now: Date())
        #expect(PlanCopy.statusLine(applePass) == "Access until Jan 2, 2099 — bought in this app.")
        #expect(PlanCopy.displayName(.lifetime) == "Pro" && PlanCopy.statusLine(EXPLORER_ENTITLEMENTS).hasPrefix("Free plan"))
    }
}

/// The social card: 1200 × 630, the art flush left at the layout's size, the text column on the dark background.
@Suite @MainActor struct ShareCardTests {
    private func pixel(_ image: CGImage, _ x: Int, _ y: Int) -> (r: UInt8, g: UInt8, b: UInt8) {
        let ctx = CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: image.width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        let p = ctx.data!.assumingMemoryBound(to: UInt8.self)
        let i = (y * image.width + x) * 4 // drawn rows come out top-down (see DiceRendererTests)
        return (p[i], p[i + 1], p[i + 2])
    }

    @Test func rendersTheLayout() throws {
        // 40 × 30 grid, black 1s with a white top row (row 29: row 0 is the bottom): the art is 728 × 546
        // (scale 18.2), centred vertically (y 42)
        var rows = Array(repeating: Array(repeating: Die(face: 1, color: .black), count: 40), count: 30)
        rows[29] = Array(repeating: Die(face: 1, color: .white), count: 40)
        let grid = DiceGrid(width: 40, height: 30, rows: rows)
        let layout = shareCardLayout(cols: 40, rows: 30)
        #expect(layout.art == Box(x: 0, y: 42, width: 728, height: 546))
        let jpeg = try ShareCardRenderer.render(grid)
        let image = try ImageKit.decode(jpeg, maxSide: 4096)
        #expect(image.width == 1200 && image.height == 630)
        // the top-left die is white (the grid's last row is drawn at the top), the bottom-left one black
        let top = pixel(image, 3, 45), bottom = pixel(image, 3, 585)
        #expect(top.r > 200 && top.g > 200 && top.b > 200)
        #expect(bottom.r < 60 && bottom.g < 60 && bottom.b < 60)
        // above the art: the card's near-black background
        let bg = pixel(image, 3, 10)
        #expect(bg.r < 40 && bg.g < 40 && bg.b < 60)
        // the text column has light pixels (the dice count) somewhere in its band
        var light = 0
        for y in stride(from: layout.text.y, to: layout.text.y + layout.text.height, by: 4) {
            for x in stride(from: layout.text.x, to: layout.text.x + layout.text.width, by: 4) where pixel(image, x, y).r > 200 { light += 1 }
        }
        #expect(light > 50)
    }
}

/// Shares against the LOCAL stack (lib/supabase/shares.integration.test.ts): the row, then the public image.
@Suite(.serialized, .enabled(if: ProcessInfo.processInfo.environment["DICEIFY_SUPABASE_TEST"] == "1"))
struct ShareServiceTests {
    @Test func createsRowThenPublicImage() async throws {
        _ = try await SupabaseService.client.auth.signIn(email: "ios-dev@test.dev", password: "pass1234")
        let card = Data([0xFF, 0xD8, 0xFF, 0xD9]) // a JPEG signature is enough for the bucket's MIME check
        let id = try await ShareService().create(projectId: nil, cols: 40, rows: 30, card: card)
        #expect(isShareId(id))
        struct Row: Decodable { let id: String; let grid_cols: Int; let grid_rows: Int }
        let rows: [Row] = try await SupabaseService.client.rpc("get_share", params: ["share_id": id]).execute().value
        #expect(rows.first?.id == id && rows.first?.grid_cols == 40 && rows.first?.grid_rows == 30)
        let url = URL(string: shareImageUrl(supabaseUrl: AppConfig.supabaseURL.absoluteString, id: id))!
        let (data, response) = try await URLSession.shared.data(from: url)
        #expect((response as? HTTPURLResponse)?.statusCode == 200 && data == card)
        // signed-out: no share
        try await SupabaseService.client.auth.signOut()
        await #expect(throws: ShareError.self) { try await ShareService().create(projectId: nil, cols: 1, rows: 1, card: card) }
    }
}
