// Layout of the social card (core/share/card.ts): 1200×630. The art bleeds off the left edge at full card height and
// its own aspect ratio (art too wide for that is scaled to the widest it may be and centred vertically); a fixed-width
// text column is centred in the space to its right. The app draws it with Core Graphics; this only decides where.

public enum ShareCard {
    public static let width = 1200
    public static let height = 630
}

/// Minimum space on either side of the text column, and above/below its lines.
private let PAD = 56
private let TEXT_WIDTH = 360

public struct Box: Equatable, Sendable {
    public var x: Int
    public var y: Int
    public var width: Int
    public var height: Int

    public init(x: Int, y: Int, width: Int, height: Int) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }
}

public struct ShareCardLayout: Equatable, Sendable {
    public let width: Int
    public let height: Int
    public let art: Box
    /// The text column (lines are centred vertically inside it by the renderer).
    public let text: Box
}

public func shareCardLayout(cols: Int, rows: Int) -> ShareCardLayout {
    let width = ShareCard.width
    let height = ShareCard.height
    let maxArtWidth = width - 2 * PAD - TEXT_WIDTH
    let scale = min(Double(maxArtWidth) / Double(cols), Double(height) / Double(rows))
    let artWidth = jsRoundInt(Double(cols) * scale)
    let artHeight = jsRoundInt(Double(rows) * scale)
    return ShareCardLayout(
        width: width,
        height: height,
        art: Box(x: 0, y: jsRoundInt(Double(height - artHeight) / 2), width: artWidth, height: artHeight),
        text: Box(x: artWidth + jsRoundInt(Double(width - artWidth - TEXT_WIDTH) / 2), y: PAD, width: TEXT_WIDTH, height: height - 2 * PAD)
    )
}
