import Foundation
import PostHog

/// The one place that talks to PostHog (lib/analytics.ts): the same event names and properties as the web, with
/// `platform: "ios"` and `app_version` on every event. Autocapture and session replay are off (screens are named
/// explicitly, photos never leave the device). Without a key (`POSTHOG_KEY` in Config/*.xcconfig) nothing is sent.
enum Analytics {
    private static let platform = "ios"
    private nonisolated(unsafe) static var enabled = false

    /// Start PostHog once, at launch. Idempotent; a missing key leaves it inert.
    static func start() {
        guard !enabled, let key = AppConfig.posthogKey else { return }
        let config = PostHogConfig(apiKey: key, host: AppConfig.posthogHost)
        config.captureApplicationLifecycleEvents = true
        config.captureScreenViews = false
        config.sessionReplay = false
        // Anonymous users get no person profile; `identify` on sign-in merges their earlier events into the user
        config.personProfiles = .identifiedOnly
        PostHogSDK.shared.setup(config)
        PostHogSDK.shared.register(["platform": platform, "app_version": AppConfig.appVersion])
        enabled = true
    }

    static func track(_ event: AnalyticsEvent) {
        guard enabled else { return }
        PostHogSDK.shared.capture(event.name, properties: event.properties)
    }

    /// A screen shown (PostHog `$screen`): `start`, `editor`, `account`, `share`, `sign_in`.
    static func screen(_ name: String) {
        guard enabled else { return }
        PostHogSDK.shared.screen(name)
    }

    /// The signed-in user (links the anonymous history) and their plan as a person property.
    static func identify(userId: UUID, plan: String) {
        guard enabled else { return }
        PostHogSDK.shared.identify(userId.uuidString.lowercased(), userProperties: ["plan": plan])
    }

    /// After a sign-out: later events belong to a new anonymous visitor.
    static func reset() {
        guard enabled else { return }
        PostHogSDK.shared.reset()
    }
}

/// The catalog (`AnalyticsEvents` in lib/analytics.ts), the part the app sends. Flat primitives only.
enum AnalyticsEvent: Equatable {
    case editorOpened(signedIn: Bool, restored: Bool)
    case photoUploaded(fileType: String, fileSize: Int)
    case cropCompleted(aspectRatio: String)
    case tuneCompleted(rows: Int, cols: Int?, totalDice: Int?, colorMode: String, contrast: Double, gamma: Double, edgeSharpening: Double, rotate6: Bool, rotate3: Bool, rotate2: Bool)
    case buildStarted(totalDice: Int)
    case buildProgress(percent: Int, totalDice: Int)
    case blueprintDownloaded(totalDice: Int)
    /// `prompt`: `sign_in` | `limit` | `proFeature` (the web's modal names).
    case paywallShown(feature: String, prompt: String)
    case clickUpgrade(source: String, planType: String?)
    /// The App Store purchase sheet is about to show (the web: Stripe Checkout created). The purchase itself is
    /// recorded server-side (`purchase_completed`, revenuecat-webhook).
    case checkoutStarted(plan: String)
    case shareCreate(shareId: String, totalDice: Int)
    case share(method: String, shareId: String)

    var name: String {
        switch self {
        case .editorOpened: "editor_opened"
        case .photoUploaded: "photo_uploaded"
        case .cropCompleted: "crop_completed"
        case .tuneCompleted: "tune_completed"
        case .buildStarted: "build_started"
        case .buildProgress: "build_progress"
        case .blueprintDownloaded: "blueprint_downloaded"
        case .paywallShown: "paywall_shown"
        case .clickUpgrade: "click_upgrade"
        case .checkoutStarted: "checkout_started"
        case .shareCreate: "share_create"
        case .share: "share"
        }
    }

    var properties: [String: Any] {
        switch self {
        case let .editorOpened(signedIn, restored):
            ["signed_in": signedIn, "restored": restored]
        case let .photoUploaded(fileType, fileSize):
            ["file_type": fileType, "file_size": fileSize]
        case let .cropCompleted(aspectRatio):
            ["aspect_ratio": aspectRatio]
        case let .tuneCompleted(rows, cols, totalDice, colorMode, contrast, gamma, edgeSharpening, rotate6, rotate3, rotate2):
            ["rows": rows, "cols": cols.map { $0 as Any } ?? NSNull(), "total_dice": totalDice.map { $0 as Any } ?? NSNull(), "color_mode": colorMode, "contrast": contrast, "gamma": gamma, "edge_sharpening": edgeSharpening, "rotate6": rotate6, "rotate3": rotate3, "rotate2": rotate2]
        case let .buildStarted(totalDice):
            ["total_dice": totalDice]
        case let .buildProgress(percent, totalDice):
            ["percent": percent, "total_dice": totalDice]
        case let .blueprintDownloaded(totalDice):
            ["total_dice": totalDice]
        case let .paywallShown(feature, prompt):
            ["feature": feature, "prompt": prompt]
        case let .clickUpgrade(source, planType):
            planType.map { ["source": source, "plan_type": $0] } ?? ["source": source]
        case let .checkoutStarted(plan):
            ["plan": plan]
        case let .shareCreate(shareId, totalDice):
            ["share_id": shareId, "total_dice": totalDice]
        case let .share(method, shareId):
            ["method": method, "content_type": "dice_art", "item_id": shareId]
        }
    }
}
