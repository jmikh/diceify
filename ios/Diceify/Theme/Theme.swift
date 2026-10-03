import SwiftUI

// The Diceify theme in iOS clothes (plans/ios/ios-app-plan.md § 6): the web's tokens as asset colours, glass panels
// as system materials, pink filled buttons, SF for UI text, Syne for display moments.

extension Color {
    static let bgPrimary = Color("Colors/BgPrimary")
    static let bgSecondary = Color("Colors/BgSecondary")
    static let bgDeep = Color("Colors/BgDeep")
    static let brandPink = Color("Colors/BrandPink")
    static let brandPinkLight = Color("Colors/BrandPinkLight")
    static let brandPinkStrong = Color("Colors/BrandPinkStrong")
    static let accentPurple = Color("Colors/AccentPurple")
    static let accentBlue = Color("Colors/AccentBlue")
    static let accentGreen = Color("Colors/AccentGreen")
    static let textDim = Color("Colors/TextDim")
    /// `--text-secondary` / `--text-muted`.
    static let textSecondary = Color.white.opacity(0.7)
    static let textMuted = Color.white.opacity(0.5)
    /// `--border-glass`.
    static let borderGlass = Color.white.opacity(0.08)
    static let glassFill = Color.white.opacity(0.03)
}

extension Font {
    /// Syne 700, the display face (Start title, paywall headline).
    static func display(_ size: CGFloat) -> Font { .custom("Syne-Bold", size: size) }
}

/// The web's `.glass`: a frosted panel with a hairline border and 20 pt continuous corners. iOS 26 gets the system
/// glass; earlier versions the thin material.
struct GlassPanel: ViewModifier {
    var cornerRadius: CGFloat = 20

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        if #available(iOS 26, *) {
            content
                .background(Color.glassFill, in: shape)
                .glassEffect(.regular, in: shape)
                .overlay(shape.strokeBorder(Color.borderGlass, lineWidth: 1))
        } else {
            content
                .background(.ultraThinMaterial, in: shape)
                .overlay(shape.strokeBorder(Color.borderGlass, lineWidth: 1))
        }
    }
}

extension View {
    func glassPanel(cornerRadius: CGFloat = 20) -> some View { modifier(GlassPanel(cornerRadius: cornerRadius)) }
}

/// `.btn-primary`: pink-strong fill, white label, capsule, a soft glow.
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(Color.brandPinkStrong, in: Capsule())
            .shadow(color: .brandPink.opacity(configuration.isPressed ? 0.1 : 0.3), radius: 18, y: 6)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// `.btn-secondary`: glass capsule, muted label.
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.medium))
            .foregroundStyle(Color.textSecondary)
            .padding(.horizontal, 20)
            .padding(.vertical, 13)
            .frame(maxWidth: .infinity)
            .background(Color.white.opacity(configuration.isPressed ? 0.1 : 0.05), in: Capsule())
            .overlay(Capsule().strokeBorder(Color.borderGlass, lineWidth: 1))
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}

/// The landing page's soft orbs, static: two blurred radial glows behind the Start screen only.
struct OrbsBackground: View {
    var body: some View {
        ZStack {
            Color.bgPrimary
            GeometryReader { geo in
                Circle()
                    .fill(Color.brandPink.opacity(0.22))
                    .frame(width: geo.size.width * 1.1)
                    .blur(radius: 90)
                    .offset(x: geo.size.width * 0.35, y: -geo.size.height * 0.25)
                Circle()
                    .fill(Color.accentPurple.opacity(0.16))
                    .frame(width: geo.size.width * 0.9)
                    .blur(radius: 90)
                    .offset(x: -geo.size.width * 0.4, y: geo.size.height * 0.55)
            }
        }
        .ignoresSafeArea()
    }
}
