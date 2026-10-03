import Foundation
import Supabase

/// The one Supabase client (anon key + the signed-in user's JWT, session in the Keychain by the SDK).
enum SupabaseService {
    static let client = SupabaseClient(
        supabaseURL: AppConfig.supabaseURL,
        supabaseKey: AppConfig.supabaseAnonKey,
        options: SupabaseClientOptions(auth: .init(flowType: .pkce))
    )
}
