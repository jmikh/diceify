// Plan catalogue (core/billing/plans.ts): limits and display/pricing metadata. Projects are unlimited on every plan.
// App Store prices live in App Store Connect; these numbers are the web's and feed copy only.

public enum Plan: String, Sendable, CaseIterable, Codable {
    case explorer, creator, studio, lifetime
}

public struct PlanLimits: Equatable, Sendable {
    /// Rows a user may build; nil = unlimited.
    public let builderRowLimit: Int?
    public let hasSvgExport: Bool
    /// Black and white dice in one design (colour mode `both`).
    public let hasMixedDice: Bool
    /// Rows a design may have without the watermark; nil = unlimited.
    public let designRowLimit: Int?

    public init(builderRowLimit: Int?, hasSvgExport: Bool, hasMixedDice: Bool, designRowLimit: Int?) {
        self.builderRowLimit = builderRowLimit
        self.hasSvgExport = hasSvgExport
        self.hasMixedDice = hasMixedDice
        self.designRowLimit = designRowLimit
    }
}

public let PLAN_LIMITS: [Plan: PlanLimits] = [
    .explorer: PlanLimits(builderRowLimit: 5, hasSvgExport: false, hasMixedDice: false, designRowLimit: nil),
    .creator: PlanLimits(builderRowLimit: nil, hasSvgExport: true, hasMixedDice: true, designRowLimit: nil),
    .studio: PlanLimits(builderRowLimit: nil, hasSvgExport: true, hasMixedDice: true, designRowLimit: nil),
    .lifetime: PlanLimits(builderRowLimit: nil, hasSvgExport: true, hasMixedDice: true, designRowLimit: nil),
]

/// What a user can buy (`CheckoutPlan`): the web's checkout route plans, the app's App Store products.
public enum CheckoutPlan: String, Sendable, CaseIterable {
    case creator
    case studioMonthly = "studio_monthly"
    case studioYearly = "studio_yearly"
}

public enum Pricing {
    public enum Creator {
        public static let name = "Creator"
        public static let price = 19
        public static let accessDays = 30
        public static let description = "For creators with a vision and a deadline. 30 days of full access to complete your masterpiece."
    }

    public enum Studio {
        public static let name = "Studio"
        public static let monthlyPrice = 9
        public static let yearlyPrice = 36
    }

    public static let studioYearlyMonthlyEffective = Double(Studio.yearlyPrice) / 12
    public static let studioYearlySavingsPercent = Int(((1 - Double(Studio.yearlyPrice) / Double(Studio.monthlyPrice * 12)) * 100).rounded())
}
