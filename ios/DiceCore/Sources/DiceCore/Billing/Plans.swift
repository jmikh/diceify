// Plan catalogue (core/billing/plans.ts): limits and display/pricing metadata. Projects are unlimited on every plan.
// App Store prices live in App Store Connect; these numbers are the web's and feed copy only.

public enum Plan: String, Sendable, CaseIterable, Codable {
    case explorer, creator, studio, lifetime
}

public struct PlanLimits: Equatable, Sendable {
    /// Rows a user may build; nil = unlimited.
    public let builderRowLimit: Int?
    public let hasSvgExport: Bool
}

public let PLAN_LIMITS: [Plan: PlanLimits] = [
    .explorer: PlanLimits(builderRowLimit: 5, hasSvgExport: false),
    .creator: PlanLimits(builderRowLimit: nil, hasSvgExport: true),
    .studio: PlanLimits(builderRowLimit: nil, hasSvgExport: true),
    .lifetime: PlanLimits(builderRowLimit: nil, hasSvgExport: true),
]

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
        public static let description = "For artists who want to take their time or create multiple pieces."
    }

    public static let studioYearlyMonthlyEffective = Double(Studio.yearlyPrice) / 12
    public static let studioYearlySavingsPercent = Int(((1 - Double(Studio.yearlyPrice) / Double(Studio.monthlyPrice * 12)) * 100).rounded())
}
