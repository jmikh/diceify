import DiceCore
import SwiftUI

/// The paywall (features/editor/components/account/{LimitReachedModal,ProFeatureModal}.tsx with
/// features/billing/PricingCards.tsx): Studio (monthly / yearly) as an App Store subscription; the Creator pass is not
/// sold in the app. Prices come from StoreKit. App Store 3.1.2: the billed amount is the prominent price, the renewal terms and the Terms /
/// Privacy links sit under the cards, and Restore purchases is one tap away.
struct PaywallSheet: View {
    let prompt: GatePrompt
    /// `click_upgrade.source`; nil = the prompt's.
    var source: String?
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: PaywallModel?

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                if let model {
                    if case let .active(plan) = model.phase {
                        ActivePlanView(plan: plan) { dismiss() }
                    } else {
                        header
                        offers(model)
                        PaywallFooter(model: model) { dismiss() }
                    }
                } else {
                    header
                    ProgressView().padding(.vertical, 40)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 40)
            .padding(.bottom, 24)
        }
        .scrollBounceBehavior(.basedOnSize)
        .overlay(alignment: .topTrailing) {
            Button { dismiss() } label: {
                Image(systemName: "xmark").font(.body.weight(.semibold)).foregroundStyle(Color.textSecondary)
                    .frame(width: 36, height: 36).background(Color.white.opacity(0.08), in: Circle())
            }
            .accessibilityLabel("Close")
            .padding(16)
        }
        .background { PaywallGlows() }
        .presentationDetents([.large])
        .presentationBackground(Color.bgSecondary)
        .task {
            guard model == nil else { return }
            let model = PaywallModel(source: source ?? prompt.upgradeSource, store: session.store, account: session)
            self.model = model
            Analytics.screen("paywall")
            await model.load()
            #if DEBUG
            // `--ui-buy <plan>`: buy once the offers are in (with `--ui-fake-store`: the real apple-sync round trip)
            let args = ProcessInfo.processInfo.arguments
            if let at = args.firstIndex(of: "--ui-buy"), at + 1 < args.count, let plan = CheckoutPlan(rawValue: args[at + 1]) {
                await model.buy(plan)
            }
            #endif
        }
    }

    private var header: some View {
        VStack(spacing: 10) {
            if prompt == .limit {
                Image("Logo").resizable().scaledToFit().frame(height: 52)
                    .shadow(color: .brandPink.opacity(0.5), radius: 15)
            }
            Text(prompt == .limit ? "Build Limit Reached" : "Upgrade to Pro")
                .font(.display(28)).foregroundStyle(.white).multilineTextAlignment(.center)
            Text(prompt == .limit
                ? "You've reached the Explorer plan limit of \(PLAN_LIMITS[.explorer]?.builderRowLimit ?? 5) rows. Upgrade to unlock unlimited building and create massive masterpieces!"
                : "Unlock unlimited dice, SVG blueprints, and more.")
                .font(.subheadline).foregroundStyle(Color.textMuted).multilineTextAlignment(.center)
        }
        .padding(.horizontal, 12)
    }

    @ViewBuilder
    private func offers(_ model: PaywallModel) -> some View {
        switch model.phase {
        case .loading, .active:
            ProgressView().padding(.vertical, 40)
        case let .unavailable(message):
            VStack(spacing: 14) {
                Label(message, systemImage: "exclamationmark.triangle").font(.subheadline).foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
                Button("Try again") { Task { await model.load() } }.buttonStyle(.secondary)
            }
            .padding(20)
            .glassPanel()
        case .ready:
            StudioCard(model: model)
        }
    }
}

extension GatePrompt {
    /// `click_upgrade.source` of a purchase from this prompt's paywall (the web's modal names).
    var upgradeSource: String { self == .limit ? "limit_reached" : "pro_feature_modal" }
}

// MARK: Cards

/// PricingCards.tsx Studio `features` (the compact variant).
private enum PlanFeatures {
    static var studio: [LocalizedStringKey] { ["**Unlimited** dice in Builder", "Full resolution SVG blueprints", "**Unlimited** projects in the cloud", "Cancel anytime"] }
}

private struct StudioCard: View {
    @Bindable var model: PaywallModel

    var body: some View {
        let yearly = model.studioInterval == .studioYearly
        let offer = model.offers[model.studioInterval]
        PlanCard(accent: .brandPink) {
            HStack(spacing: 10) {
                Text(Pricing.Studio.name).font(.title3.bold()).foregroundStyle(.white)
                if model.offers[.studioMonthly] != nil && model.offers[.studioYearly] != nil {
                    IntervalToggle(selection: $model.studioInterval, savings: model.studioSavingsPercent)
                }
            }
            if let offer {
                VStack(alignment: .leading, spacing: 2) {
                    PriceLine(price: offer.priceText, suffix: yearly ? "/year" : "/month")
                    Text(yearly ? offer.perMonthText.map { "\($0)/month, billed annually" } ?? "Billed annually" : "Billed monthly")
                        .font(.footnote).foregroundStyle(yearly ? Color.accentGreen : Color.textMuted)
                }
            }
            Text(Pricing.Studio.description).font(.footnote).foregroundStyle(Color.textMuted)
            FeatureList(features: PlanFeatures.studio, tint: .brandPinkLight)
            BuyButton(title: "Subscribe", plan: model.studioInterval, model: model)
                .buttonStyle(.primary)
        }
    }
}

/// `.glass` card with the plan's accent: a hairline across the top and a soft glow under it.
private struct PlanCard<Content: View>: View {
    let accent: Color
    @ViewBuilder let content: Content

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)
        VStack(alignment: .leading, spacing: 14) { content }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(alignment: .top) {
                ZStack(alignment: .top) {
                    Circle().fill(accent.opacity(0.18)).frame(width: 180, height: 180).blur(radius: 60).offset(y: -110)
                    LinearGradient(colors: [.clear, accent.opacity(0.6), .clear], startPoint: .leading, endPoint: .trailing).frame(height: 2)
                }
            }
            .clipShape(shape)
            .glassPanel()
            .overlay(shape.strokeBorder(accent.opacity(0.3), lineWidth: 1))
    }
}

private struct PriceLine: View {
    let price: String
    let suffix: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(price).font(.system(size: 30, weight: .bold)).foregroundStyle(.white)
            Text(suffix).font(.subheadline).foregroundStyle(Color.textMuted)
        }
    }
}

private struct FeatureList: View {
    let features: [LocalizedStringKey]
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(features.indices, id: \.self) { i in
                Label { Text(features[i]).foregroundStyle(.white.opacity(0.9)) } icon: {
                    Image(systemName: "checkmark").font(.footnote.bold()).foregroundStyle(tint)
                }
                .font(.subheadline)
            }
        }
    }
}

private struct BuyButton: View {
    let title: String
    let plan: CheckoutPlan
    let model: PaywallModel

    var body: some View {
        Button {
            Task { await model.buy(plan) }
        } label: {
            if model.busy == .buying(plan) { ProgressView().tint(.white) } else { Text(title) }
        }
        .disabled(model.busy != nil)
        .padding(.top, 4)
    }
}

/// The web's Monthly / Yearly pill with the savings badge.
private struct IntervalToggle: View {
    @Binding var selection: CheckoutPlan
    let savings: Int?

    var body: some View {
        HStack(spacing: 2) {
            segment("Monthly", .studioMonthly, badge: nil)
            segment("Yearly", .studioYearly, badge: savings.map { "-\($0)%" })
        }
        .padding(2)
        .background(Color.white.opacity(0.05), in: Capsule())
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.1)))
    }

    private func segment(_ label: String, _ plan: CheckoutPlan, badge: String?) -> some View {
        let on = selection == plan
        return Button { selection = plan } label: {
            HStack(spacing: 4) {
                Text(label)
                if let badge {
                    Text(badge).font(.caption2.bold())
                        .padding(.horizontal, 4).padding(.vertical, 1)
                        .foregroundStyle(on ? Color.black.opacity(0.8) : Color.accentGreen)
                        .background(on ? Color.accentGreen : Color.accentGreen.opacity(0.2), in: Capsule())
                }
            }
            .font(.caption.weight(.medium))
            .foregroundStyle(on ? Color.black : Color.textSecondary)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(on ? Color.white : Color.clear, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// MARK: Footer, success, background

private struct PaywallFooter: View {
    let model: PaywallModel
    let close: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            if let notice = model.notice {
                Text(notice).font(.footnote).foregroundStyle(Color.brandPinkLight).multilineTextAlignment(.center)
            }
            Text("Studio renews automatically at the price shown until you cancel it in Settings → Apple Account → Subscriptions, at least 24 hours before the current period ends.")
                .font(.caption2).foregroundStyle(Color.textMuted).multilineTextAlignment(.center)
            HStack(spacing: 16) {
                Button(model.busy == .restoring ? "Restoring…" : "Restore purchases") { Task { await model.restore() } }
                    .disabled(model.busy != nil)
                Link("Terms of Use", destination: URL(string: "\(AppConfig.siteOrigin)/terms")!)
                Link("Privacy Policy", destination: URL(string: "\(AppConfig.siteOrigin)/privacy")!)
            }
            .font(.caption.weight(.medium))
            .foregroundStyle(Color.brandPinkLight)
            Button("Maybe later", action: close).font(.subheadline).foregroundStyle(Color.textMuted).padding(.top, 2)
        }
        .padding(.horizontal, 8)
    }
}

/// ProFeatureModal's "You already have access!", also shown right after a purchase.
private struct ActivePlanView: View {
    let plan: Plan
    let close: () -> Void

    private var message: String {
        switch plan {
        case .lifetime: "You have lifetime access with all premium features. Thank you for being an early supporter!"
        case .studio: "You have the Studio plan with all premium features."
        case .creator: "You have an active Creator pass with all premium features."
        case .explorer: "You have an active plan with all premium features."
        }
    }

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark").font(.title2.bold()).foregroundStyle(Color.accentGreen)
                .frame(width: 56, height: 56).background(Color.accentGreen.opacity(0.18), in: Circle())
            Text("You're all set!").font(.display(28)).foregroundStyle(.white)
            Text(message).font(.subheadline).foregroundStyle(Color.textSecondary).multilineTextAlignment(.center)
            Button("Continue Creating", action: close).buttonStyle(.primary).padding(.top, 8)
        }
        .padding(.top, 40)
        .padding(.horizontal, 12)
    }
}

/// The modal's two glows: pink top-right, purple bottom-left.
private struct PaywallGlows: View {
    var body: some View {
        GeometryReader { geo in
            Circle().fill(Color.brandPink.opacity(0.16)).frame(width: 260).blur(radius: 80)
                .offset(x: geo.size.width - 150, y: -90)
            Circle().fill(Color.accentPurple.opacity(0.14)).frame(width: 260).blur(radius: 80)
                .offset(x: -110, y: geo.size.height - 170)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}
