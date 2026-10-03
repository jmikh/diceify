import AuthenticationServices
import SwiftUI

/// The sign-in sheet (features/account/SignInModal.tsx): Apple first (App Store rule 4.8), then Google.
struct SignInSheet: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    var message: String = "Sign in to keep your projects on every device, share your art and unlock the full build."
    @State private var busy = false

    var body: some View {
        VStack(spacing: 20) {
            Capsule().fill(Color.white.opacity(0.2)).frame(width: 36, height: 5).padding(.top, 8)
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(height: 44)
                .padding(.top, 8)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            if let error = session.signInError {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }
            VStack(spacing: 12) {
                SignInWithAppleButton(.signIn) { request in
                    session.configureAppleRequest(request)
                } onCompletion: { result in
                    Task {
                        busy = true
                        await session.completeAppleSignIn(result)
                        busy = false
                        if session.status == .authed { dismiss() }
                    }
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 50)
                .clipShape(Capsule())

                Button {
                    Task {
                        busy = true
                        await session.signInWithGoogle()
                        busy = false
                        if session.status == .authed { dismiss() }
                    }
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "g.circle.fill")
                        Text("Continue with Google")
                    }
                }
                .buttonStyle(.secondary)
            }
            .disabled(busy)
            .padding(.horizontal, 24)
            Text("By signing in you agree to our Terms of Service and Privacy Policy.")
                .font(.caption2)
                .foregroundStyle(Color.textMuted)
                .padding(.top, 4)
            Spacer(minLength: 0)
        }
        .padding(.bottom, 16)
        .presentationDetents([.height(420)])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color.bgSecondary)
        .onDisappear { session.signInError = nil }
    }
}
