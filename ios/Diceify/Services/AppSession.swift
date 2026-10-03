import AuthenticationServices
import CryptoKit
import DiceCore
import Foundation
import GoogleSignIn
import Observation
import os

private let log = Logger(subsystem: "art.diceify.app", category: "auth")
import Supabase
import UIKit

/// Who is signed in and what they are entitled to (features/account/useUser.tsx): THE source for both. Views read
/// `session.user` / `session.entitlements`, never the Supabase session directly.
@MainActor
@Observable
final class AppSession {
    enum Status: Equatable { case loading, anon, authed }

    struct UserInfo: Equatable, Sendable {
        let id: UUID
        let email: String?
        let name: String?
        let avatarURL: URL?
        /// `apple` / `google`, for the account screen.
        let provider: String?
    }

    private(set) var status: Status = .loading
    private(set) var user: UserInfo?
    private(set) var profile: ProfileRow?
    private(set) var entitlements: Entitlements = EXPLORER_ENTITLEMENTS
    /// The last sign-in failure, shown by the sign-in sheet.
    var signInError: String?

    private let auth = SupabaseService.client.auth
    private var listening = false
    /// The raw nonce of the Sign in with Apple request in flight (its SHA-256 went to Apple).
    private var appleNonce: String?

    // MARK: Lifecycle

    /// Restore the stored session and follow auth changes. Idempotent; runs for the app's lifetime.
    func start() async {
        guard !listening else { return }
        listening = true
        for await (event, session) in auth.authStateChanges {
            log.notice("auth event \(String(describing: event), privacy: .public) user \(session?.user.id.uuidString ?? "-", privacy: .public)")
            switch event {
            case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                await load(session)
            case .signedOut:
                await load(nil)
            default:
                break
            }
        }
    }

    private func load(_ session: Session?) async {
        guard let session else {
            user = nil
            profile = nil
            entitlements = EXPLORER_ENTITLEMENTS
            status = .anon
            return
        }
        var row: ProfileRow? = nil
        do {
            row = try await fetchProfile()
        } catch {
            log.error("profile fetch failed, using explorer entitlements: \(String(describing: error), privacy: .public)")
        }
        let meta = session.user.userMetadata
        user = UserInfo(
            id: session.user.id,
            email: session.user.email ?? row?.email,
            name: meta.string("full_name") ?? meta.string("name") ?? row?.name,
            avatarURL: (meta.string("avatar_url") ?? meta.string("picture") ?? row?.avatarUrl).flatMap(URL.init(string:)),
            provider: session.user.appMetadata.string("provider")
        )
        profile = row
        entitlements = row.map { deriveEntitlements($0.billingState, now: Date()) } ?? EXPLORER_ENTITLEMENTS
        status = .authed
    }

    private func fetchProfile() async throws -> ProfileRow? {
        let rows: [ProfileRow] = try await SupabaseService.client.from("profiles").select(ProfileRow.columns).execute().value
        return rows.first
    }

    /// Refetch the profile (after a purchase, or when the plan may have changed).
    func refreshProfile() async {
        guard let session = try? await auth.session else { return }
        await load(session)
    }

    // MARK: Sign in

    /// Prepare the Sign in with Apple request: scopes and a fresh nonce (its hash goes to Apple, the raw one to Supabase).
    func configureAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = Self.randomNonce()
        appleNonce = nonce
        request.requestedScopes = [.fullName, .email]
        request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    /// Finish Sign in with Apple: the identity token becomes a Supabase session (native, no browser).
    func completeAppleSignIn(_ result: Result<ASAuthorization, Error>) async {
        signInError = nil
        defer { appleNonce = nil }
        switch result {
        case let .failure(error):
            if (error as? ASAuthorizationError)?.code != .canceled { signInError = "Could not sign in with Apple. Please try again." }
        case let .success(authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken, let idToken = String(data: tokenData, encoding: .utf8),
                  let nonce = appleNonce
            else {
                signInError = "Apple returned no identity token."
                return
            }
            do {
                _ = try await auth.signInWithIdToken(credentials: OpenIDConnectCredentials(provider: .apple, idToken: idToken, nonce: nonce))
                // Apple sends the name only on the first authorization: keep it in the user metadata (→ profiles.name).
                if let name = credential.fullName {
                    let formatted = PersonNameComponentsFormatter.localizedString(from: name, style: .default, options: [])
                    if !formatted.isEmpty { _ = try? await auth.update(user: UserAttributes(data: ["full_name": .string(formatted)])) }
                }
            } catch {
                signInError = "Sign-in failed: \(error.localizedDescription)"
            }
        }
    }

    /// Google Sign-In (native SDK) → Supabase session. The iOS client id comes from Info.plist (`GIDClientID`).
    func signInWithGoogle() async {
        signInError = nil
        guard let presenter = Self.topViewController() else {
            signInError = "No window to present Google sign-in."
            return
        }
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
            guard let idToken = result.user.idToken?.tokenString else {
                signInError = "Google returned no identity token."
                return
            }
            _ = try await auth.signInWithIdToken(credentials: OpenIDConnectCredentials(provider: .google, idToken: idToken, accessToken: result.user.accessToken.tokenString))
        } catch let error as GIDSignInError where error.code == .canceled {
            // the user dismissed the sheet
        } catch {
            signInError = "Sign-in failed: \(error.localizedDescription)"
        }
    }

    #if DEBUG
    /// Terminal-driven checks against the local stack (`--ui-login <email> <password>`): a password user created
    /// through the Admin API. Never compiled into release builds.
    func debugSignIn(email: String, password: String) async {
        do { _ = try await auth.signIn(email: email, password: password) } catch { signInError = "debug sign-in failed: \(error)" }
    }
    #endif

    func signOut() async {
        try? await auth.signOut()
        GIDSignIn.sharedInstance.signOut()
        await load(nil)
    }

    /// Google's redirect back into the app (URL scheme = the reversed client id).
    func handle(openURL url: URL) {
        _ = GIDSignIn.sharedInstance.handle(url)
    }

    // MARK: Helpers

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    private static func topViewController() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        guard let window = scenes.flatMap(\.windows).first(where: \.isKeyWindow), var top = window.rootViewController else { return nil }
        while let presented = top.presentedViewController { top = presented }
        return top
    }
}

private extension [String: AnyJSON] {
    func string(_ key: String) -> String? {
        if case let .string(value)? = self[key], !value.isEmpty { return value }
        return nil
    }
}
