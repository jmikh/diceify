// JavaScript number semantics the port must reproduce (core/README.md, plans/ios/ios-app-plan.md § 4).

import Foundation

/// JavaScript's `Math.round`: half rounds towards +∞ (`floor(x + 0.5)`), unlike Swift's `.rounded()` (half away
/// from zero). Every rounding step of the spec goes through this so grids match the web byte for byte.
@inlinable
public func jsRound(_ x: Double) -> Double {
    (x + 0.5).rounded(.down)
}

/// `Math.round` as an `Int` (the value is finite and in range at every call site of the spec).
@inlinable
public func jsRoundInt(_ x: Double) -> Int {
    Int(jsRound(x))
}

/// JavaScript's number → string (`${x}`) for the values the SVG renderer prints: integral values without a decimal
/// point ("50", not "50.0"), everything else in the shortest round-trip form Swift shares with JS ("22.5", "0.15").
public func jsNumber(_ x: Double) -> String {
    if x.isFinite, x == x.rounded(.towardZero), abs(x) < 1e15 {
        return String(Int(x))
    }
    return String(x)
}

/// `Date.parse` for the ISO-8601 strings the backend and the web exchange (`2026-10-03T11:49:22.455Z`,
/// `2026-10-03T11:49:22+00:00`, with or without fractional seconds). `nil` for anything unparsable.
public func parseISODate(_ iso: String) -> Date? {
    let withFraction = ISO8601DateFormatter()
    withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = withFraction.date(from: iso) { return date }
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    return plain.date(from: iso)
}

/// `Date#toISOString()`: UTC, millisecond precision, `Z`.
public func isoString(_ date: Date) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: date)
}
