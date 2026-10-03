// The words around a share (core/share/copy.ts): page title/description, the card image's alt text and the prefilled
// post. One source for the app (post text, card) and the web.

public struct ShareGrid: Equatable, Sendable {
    public var cols: Int
    public var rows: Int

    public init(cols: Int, rows: Int) {
        self.cols = cols
        self.rows = rows
    }
}

public struct ShareCopy: Equatable, Sendable {
    public let title: String
    public let description: String
    public let imageAlt: String
    /// Prefilled post text (X, the native share sheet). The link is appended by the platform.
    public let postText: String
}

/// `toLocaleString('en-US')`: thousands separated by commas.
public func formatDiceCount(_ count: Int) -> String {
    let digits = Array(String(abs(count)))
    var out = ""
    for (i, digit) in digits.enumerated() {
        if i > 0 && (digits.count - i) % 3 == 0 { out.append(",") }
        out.append(digit)
    }
    return count < 0 ? "-\(out)" : out
}

public func gridLabel(_ grid: ShareGrid) -> String {
    "\(grid.cols) × \(grid.rows)"
}

public func shareCopy(_ grid: ShareGrid) -> ShareCopy {
    let dice = formatDiceCount(grid.cols * grid.rows)
    return ShareCopy(
        title: "Dice art made from \(dice) dice",
        description: "A \(gridLabel(grid)) dice mosaic made with Diceify. Turn any photo into dice art you can build by hand.",
        imageAlt: "Dice art mosaic made from \(dice) dice (\(gridLabel(grid)))",
        postText: "Look what I made with Diceify: dice art from \(dice) dice 🎲"
    )
}
