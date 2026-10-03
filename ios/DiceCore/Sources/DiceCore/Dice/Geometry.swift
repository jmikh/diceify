// Shared constants for dice rendering (core/dice/geometry.ts): both the SVG strings and the app's Core Graphics
// die images use them.

public enum DiceRendering {
    /// Dot radius, 12 % of the die size.
    public static let dotRadiusFactor = 0.12
    /// Controls dot spacing (0 = furthest apart).
    public static let paddingFactor = 0.35
    /// Rounded corners, 10 % of the die size.
    public static let cornerRadiusFactor = 0.10
    /// Border width, 5 % of the die size.
    public static let borderWidthFactor = 0.05

    public struct Colors: Sendable {
        public let background: String
        public let dot: String
        public let border: String
    }

    public static let black = Colors(background: "#1a1a1a", dot: "#ffffff", border: "#333")
    public static let white = Colors(background: "#fafafa", dot: "#1a1a1a", border: "#ddd")
    /// SVG stroke colour.
    public static let stroke = "#6b6b6b"

    public static func colors(_ color: DiceColor) -> Colors {
        color == .black ? black : white
    }
}

/// Dot centres of `face` on a die of `size`, in the order the TS renderer emits them.
public func dotPositions(face: DiceFace, size: Double) -> [(x: Double, y: Double)] {
    let lower = size * (1 + DiceRendering.paddingFactor) / 6
    let middle = size * 3 / 6
    let upper = size * (5 - DiceRendering.paddingFactor) / 6
    var positions: [(x: Double, y: Double)] = []
    if face >= 2 { positions.append((lower, lower)) }      // top left
    if face == 6 { positions.append((middle, lower)) }     // top centre
    if face >= 4 { positions.append((upper, lower)) }      // top right
    if face % 2 == 1 { positions.append((middle, middle)) } // centre
    if face >= 4 { positions.append((lower, upper)) }      // bottom left
    if face == 6 { positions.append((middle, upper)) }     // bottom centre
    if face >= 2 { positions.append((upper, upper)) }      // bottom right
    return positions
}
