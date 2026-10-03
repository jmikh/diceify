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

    /// Where share links live (`/s/<id>`), the UTM origin.
    static let siteOrigin = "https://diceify.art"

    private static func string(_ key: String) -> String? {
        let value = Bundle.main.object(forInfoDictionaryKey: key) as? String
        return value?.isEmpty == false ? value : nil
    }
}
