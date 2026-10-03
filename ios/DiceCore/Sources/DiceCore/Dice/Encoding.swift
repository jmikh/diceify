// Text form of a DiceGrid (core/dice/encoding.ts): one string per row (row 0 = the bottom row), dice space-separated
// as colour initial + face + `r` when rotated (`w3`, `b6r`). One encoding for the golden fixtures, the persisted
// document (`grid.rows`, schema v2) and the web, so every reader turns the same text into the same grid.

public enum GridEncodingError: Error, Equatable {
    case invalidDie(String)
    case invalidRows(String)
}

/// `w3`, `b6r`: colour initial, face, `r` when rotated.
public func encodeDie(_ die: Die) -> String {
    "\(die.color == .black ? "b" : "w")\(die.face)\(die.rotate90 ? "r" : "")"
}

/// The inverse of `encodeDie`; throws on anything else.
public func decodeDie(_ token: Substring) throws -> Die {
    let chars = Array(token.utf8)
    guard chars.count == 2 || chars.count == 3,
          chars[0] == UInt8(ascii: "b") || chars[0] == UInt8(ascii: "w"),
          chars[1] >= UInt8(ascii: "1"), chars[1] <= UInt8(ascii: "6"),
          chars.count == 2 || chars[2] == UInt8(ascii: "r")
    else { throw GridEncodingError.invalidDie(String(token)) }
    return Die(face: Int(chars[1] - UInt8(ascii: "0")), color: chars[0] == UInt8(ascii: "b") ? .black : .white, rotate90: chars.count == 3)
}

public func decodeDie(_ token: String) throws -> Die {
    try decodeDie(Substring(token))
}

public func encodeGrid(_ grid: DiceGrid) -> [String] {
    grid.rows.map { row in row.map(encodeDie).joined(separator: " ") }
}

/// Why `rows` is not a `width × height` grid, or nil when it is (same messages as the web).
public func gridRowsProblem(_ rows: [String], width: Int, height: Int) -> String? {
    if rows.count != height { return "expected \(height) rows, got \(rows.count)" }
    for (y, row) in rows.enumerated() {
        let tokens = row.split(separator: " ", omittingEmptySubsequences: false)
        if tokens.count != width { return "row \(y): expected \(width) dice, got \(tokens.count)" }
        for token in tokens where (try? decodeDie(token)) == nil {
            return "row \(y): invalid die \"\(token)\""
        }
    }
    return nil
}

/// The inverse of `encodeGrid`; throws when `rows` is not a `width × height` grid.
public func decodeGrid(_ rows: [String], width: Int, height: Int) throws -> DiceGrid {
    if let problem = gridRowsProblem(rows, width: width, height: height) { throw GridEncodingError.invalidRows(problem) }
    let decoded = try rows.map { row in try row.split(separator: " ", omittingEmptySubsequences: false).map { try decodeDie($0) } }
    return DiceGrid(width: width, height: height, rows: decoded)
}
