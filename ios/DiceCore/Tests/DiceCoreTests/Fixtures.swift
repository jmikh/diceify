// The TypeScript golden fixtures (core/dice/__fixtures__/*.json), decoded. Read by path relative to this file so
// nothing is copied: a fixture regenerated on the web side changes these tests immediately.
import DiceCore
import Foundation

struct FixtureParams: Decodable, Equatable {
    let numRows: Int
    let colorMode: String
    let contrast: Double
    let gamma: Double
    let edgeSharpening: Double
    let rotate6: Bool
    let rotate3: Bool
    let rotate2: Bool

    var diceParams: DiceParams {
        DiceParams(numRows: numRows, colorMode: ColorMode(rawValue: colorMode)!, contrast: contrast, gamma: gamma, edgeSharpening: edgeSharpening, rotate6: rotate6, rotate3: rotate3, rotate2: rotate2)
    }
}

struct FixtureExpected: Decodable {
    let width: Int
    let height: Int
    /// `rows[y]` = grid row y (0 = bottom), dice space-separated as colour initial + face + `r` when rotated.
    let rows: [String]
}

struct Fixture: Decodable {
    let name: String
    let width: Int
    let height: Int
    let rgbaBase64: String
    let params: FixtureParams
    let expected: FixtureExpected

    /// RGBA bytes, row-major, top row first (`Pixels` in core/README.md).
    var rgba: [UInt8] {
        get throws {
            guard let data = Data(base64Encoded: rgbaBase64) else { throw FixtureError.badBase64(name) }
            return [UInt8](data)
        }
    }

    var pixels: Pixels {
        get throws { Pixels(data: try rgba, width: width, height: height) }
    }
}

enum FixtureError: Error {
    case badBase64(String)
    case missingDirectory(String)
}

enum Fixtures {
    /// `<repo>/core/dice/__fixtures__`, four levels above this file (ios/DiceCore/Tests/DiceCoreTests).
    static var directory: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()  // DiceCoreTests
            .deletingLastPathComponent()  // Tests
            .deletingLastPathComponent()  // DiceCore
            .deletingLastPathComponent()  // ios
            .deletingLastPathComponent()  // repo root
            .appendingPathComponent("core/dice/__fixtures__", isDirectory: true)
    }

    /// `<repo>/core/dice/__fixtures__/<name>` as text (the frozen SVG snapshot).
    static func text(_ name: String) throws -> String {
        try String(contentsOf: directory.appendingPathComponent(name), encoding: .utf8)
    }

    static func load() throws -> [Fixture] {
        let dir = directory
        guard FileManager.default.fileExists(atPath: dir.path) else { throw FixtureError.missingDirectory(dir.path) }
        let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
        return try files.map { try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: $0)) }
    }
}
