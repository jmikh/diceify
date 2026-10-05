import Foundation
import Supabase

/// An edge function's error envelope `{ error: { code, message } }` (lib/supabase/functions.ts `FunctionError`).
struct FunctionError: Error, Equatable, LocalizedError {
    let code: String
    let message: String
    let status: Int

    var errorDescription: String? { message }

    /// The envelope of a non-2xx answer, or a generic INTERNAL error for anything else.
    static func from(status: Int, body: Data) -> FunctionError {
        struct Envelope: Decodable {
            struct Inner: Decodable { let code: String?; let message: String? }
            let error: Inner?
        }
        let inner = (try? JSONDecoder().decode(Envelope.self, from: body))?.error
        return FunctionError(code: inner?.code ?? "INTERNAL", message: inner?.message ?? "Request failed (\(status))", status: status)
    }
}

/// Calling the edge functions (supabase/functions/*) with the signed-in user's JWT: the parsed JSON body, or a
/// `FunctionError`.
enum EdgeFunctions {
    static func invoke<T: Decodable>(_ fn: String, _ route: String, method: FunctionInvokeOptions.Method = .post) async throws -> T {
        do {
            return try await SupabaseService.client.functions.invoke("\(fn)/\(route)", options: FunctionInvokeOptions(method: method))
        } catch let FunctionsError.httpError(code, data) {
            throw FunctionError.from(status: code, body: data)
        }
    }
}

/// The `account` function (lib/supabase/account.ts).
enum AccountService {
    struct DeleteResult: Decodable, Equatable {
        let deleted: Bool
        let projects: Int
        let shares: Int
        let cancelledSubscription: String?
    }

    /// Delete the account: cancels an active Stripe subscription, removes the user's images and share cards, then
    /// the auth user (profile, projects and share rows cascade). The caller signs out locally afterwards.
    static func deleteAccount() async throws -> DeleteResult {
        try await EdgeFunctions.invoke("account", "delete")
    }
}
