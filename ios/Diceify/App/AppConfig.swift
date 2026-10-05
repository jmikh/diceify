import Foundation

/// Build-time configuration from Info.plist (filled from Config/*.xcconfig): which Supabase project, which Google client.
enum AppConfig {
    static let supabaseURL: URL = {
        guard let raw = string("SUPABASE_URL"), let url = URL(string: raw) else { fatalError("SUPABASE_URL missing from Info.plist (Config/*.xcconfig)") }
        return url
    }()

    static let supabaseAnonKey: String = {
        guard let key = string("SUPABASE_ANON_KEY"), !key.isEmpty, key != "REPLACE_WITH_HOSTED_ANON_KEY" else { fatalError("SUPABASE_ANON_KEY missing from Info.plist (Config/*.xcconfig)") }
        return key
    }()

    static let googleClientID: String? = string("GIDClientID")

    /// PostHog project key (public, like the web bundle's); nil = analytics off.
    static let posthogKey: String? = string("POSTHOG_KEY")
    static let posthogHost: String = string("POSTHOG_HOST") ?? "https://us.i.posthog.com"
    /// Sentry DSN of the iOS project; nil = errors go to the unified log only.
    static let sentryDSN: String? = string("SENTRY_DSN")

    /// RevenueCat public SDK key (`appl_…`; a Test Store `test_…` key in Debug); nil = in-app purchases off.
    static let revenueCatKey: String? = string("REVENUECAT_API_KEY")

    /// `CFBundleShortVersionString`, the `app_version` on every event.
    static let appVersion: String = string("CFBundleShortVersionString") ?? "0"

    /// Where share links live (`/s/<id>`), the UTM origin.
    static let siteOrigin = "https://diceify.art"

    private static func string(_ key: String) -> String? {
        let value = Bundle.main.object(forInfoDictionaryKey: key) as? String
        return value?.isEmpty == false ? value : nil
    }
}
