import DiceCore
import SwiftUI

/// The account screen (features/billing/AccountScreen.tsx): who is signed in, the plan and when it ends or renews,
/// a refresh, the paywall, restore purchases, the App Store's subscription sheet for an Apple Studio plan, sign-out
/// and account deletion (the `account` function; App Store 5.1.1(v)). Entitlements always come from the profile row.
/// No links to web checkout or the Stripe portal (App Store 3.1.1): a web-bought plan is described, not managed, here.
struct AccountScreen: View {
    @Environment(AppSession.self) private var session
    @Environment(ProjectsStore.self) private var projects
    @Environment(\.dismiss) private var dismiss
    @State private var refreshing = false
    @State private var confirmingDelete = false
    @State private var deleting = false
    @State private var error: String?
    @State private var prompt: GatePrompt?
    /// Restore purchases (the paywall's logic, without its cards).
    @State private var restoreFlow: PaywallModel?
    @State private var restoreNote: String?
    @State private var managingSubscription = false

    var body: some View {
        ZStack {
            Color.bgPrimary.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let user = session.user {
                        Text("Signed in as ").foregroundStyle(Color.textMuted) + Text(user.email ?? user.name ?? "you").foregroundStyle(Color.textSecondary)
                    }
                    if let error {
                        Label(error, systemImage: "exclamationmark.triangle").font(.footnote).foregroundStyle(.red)
                    }
                    planCard
                    Button("Sign out", role: .destructive) {
                        Task {
                            await session.signOut()
                            await projects.clearCloudCache()
                            dismiss()
                        }
                    }
                    .buttonStyle(.secondary)
                    dangerZone
                }
                .font(.subheadline)
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Account")
        .navigationBarTitleDisplayMode(.large)
        .onAppear { Analytics.screen("account") }
        .task {
            if restoreFlow == nil { restoreFlow = PaywallModel(source: "account_page", store: session.store, account: session) }
            await session.refreshProfile()
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--ui-paywall"), prompt == nil { prompt = .proFeature }
            #endif
        }
        .sheet(item: $prompt) { prompt in PaywallSheet(prompt: prompt, source: "account_page") }
        .manageSubscriptionsSheet(isPresented: $managingSubscription)
        .onChange(of: managingSubscription) { _, open in
            // back from the App Store's sheet: a cancellation or plan change reaches RevenueCat, then the profile
            if !open { Task { try? await session.syncAppleBilling() } }
        }
        .alert("Delete your account?", isPresented: $confirmingDelete) {
            Button("Delete my account", role: .destructive) { Task { await deleteAccount() } }
            Button("Keep it", role: .cancel) {}
        } message: {
            Text("This cannot be undone. Your projects, photos and share images go for good.")
        }
    }

    private var planCard: some View {
        let ent = session.entitlements
        return VStack(alignment: .leading, spacing: 10) {
            Text("CURRENT PLAN").font(.caption.weight(.semibold)).tracking(1).foregroundStyle(Color.textMuted)
            HStack(spacing: 10) {
                Text(PlanCopy.displayName(ent.plan)).font(.display(24)).foregroundStyle(.white)
                Spacer()
                Button {
                    Task {
                        refreshing = true
                        await session.refreshProfile()
                        refreshing = false
                    }
                } label: {
                    if refreshing { ProgressView().controlSize(.small) } else { Image(systemName: "arrow.clockwise") }
                }
                .disabled(refreshing)
                .accessibilityLabel("Refresh plan")
            }
            Text(PlanCopy.statusLine(ent)).foregroundStyle(Color.textSecondary)
            if !ent.isPro {
                Button("See plans") {
                    Analytics.track(.clickUpgrade(source: "account_page", planType: nil))
                    prompt = .proFeature
                }
                .buttonStyle(.primary)
                .padding(.top, 4)
            }
            if ent.source == .apple && ent.plan == .studio {
                Button("Manage subscription") { managingSubscription = true }
                    .buttonStyle(.secondary)
                    .padding(.top, 4)
            }
            if ent.plan != .lifetime, let restoreFlow {
                Button(restoreFlow.busy == .restoring ? "Restoring…" : "Restore purchases") {
                    Task {
                        restoreNote = nil
                        if await restoreFlow.restore() { restoreNote = "Your App Store purchases are restored." }
                    }
                }
                .font(.footnote.weight(.medium))
                .foregroundStyle(Color.brandPinkLight)
                .disabled(restoreFlow.busy != nil)
                .padding(.top, 4)
                if let note = restoreNote ?? restoreFlow.notice {
                    Text(note).font(.footnote).foregroundStyle(Color.textMuted)
                }
            }
        }
        .padding(20)
        .glassPanel()
    }

    private var dangerZone: some View {
        let ent = session.entitlements
        return VStack(alignment: .leading, spacing: 10) {
            Text("Delete account").font(.headline).foregroundStyle(.white)
            Text("Deletes your projects, photos and share images for good." + (ent.plan == .studio && ent.renews && ent.source == .stripe ? " Your Studio subscription is cancelled immediately." : ""))
                .foregroundStyle(Color.textSecondary)
            if ent.source == .apple {
                Text("An App Store subscription keeps renewing until you cancel it in Settings → Apple Account → Subscriptions.")
                    .font(.footnote).foregroundStyle(Color.textMuted)
            }
            Button {
                confirmingDelete = true
            } label: {
                if deleting { ProgressView().controlSize(.small) } else { Label("Delete account…", systemImage: "trash") }
            }
            .buttonStyle(.secondary)
            .tint(.red)
            .disabled(deleting)
        }
        .padding(20)
        .glassPanel()
    }

    private func deleteAccount() async {
        deleting = true
        error = nil
        do {
            _ = try await AccountService.deleteAccount()
            await session.signOut()
            await projects.clearCloudCache()
            dismiss()
        } catch {
            reportError(error, where: "account-delete")
            self.error = (error as? FunctionError)?.message ?? "Something went wrong. Please try again."
        }
        deleting = false
    }
}

/// Plan words (features/billing/planCopy.ts + AccountScreen's `statusLine`).
enum PlanCopy {
    /// What a plan is called in the UI (lifetime is grandfathered: it shows as Pro).
    static func displayName(_ plan: Plan) -> String {
        switch plan {
        case .lifetime: "Pro"
        case .studio: "Studio"
        case .creator: "Creator pass"
        case .explorer: "Explorer"
        }
    }

    /// `Sep 30, 2026`.
    static func date(_ iso: String) -> String {
        guard let date = parseISODate(iso) else { return iso }
        return date.formatted(.dateTime.month(.abbreviated).day().year().locale(Locale(identifier: "en_US")))
    }

    static func statusLine(_ ent: Entitlements) -> String {
        switch ent.plan {
        case .lifetime:
            return "Lifetime access — thank you for being an early supporter."
        case .studio:
            let when = ent.accessUntil.map { " on \(date($0))" } ?? ""
            if ent.source == .apple {
                return "\(ent.renews ? "Renews" : "Ends")\(when). Subscribed in this app."
            }
            if let cancelAt = ent.cancelAt { return "Cancels on \(date(cancelAt)) — you keep access until then. Subscribed on the web." }
            return "\(ent.accessUntil != nil ? "Renews\(when)." : "Active subscription.") Subscribed on the web."
        case .creator:
            let until = ent.accessUntil.map { "Access until \(date($0))" } ?? "Active pass"
            return "\(until)\(ent.source == .apple ? " — bought in this app" : " — bought on the web")."
        case .explorer:
            return "Free plan — the builder works for the first rows; upgrade for unlimited building and SVG blueprints."
        }
    }
}
