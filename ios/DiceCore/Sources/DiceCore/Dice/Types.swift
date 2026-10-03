// Core dice types (core/dice/types.ts). Pure data. See core/README.md for the layout rules.

public typealias DiceFace = Int // 1...6

public enum DiceColor: String, Sendable, Codable, CaseIterable {
    case black, white
}

public enum ColorMode: String, Sendable, Codable, CaseIterable {
    case both, black, white
}

public struct Die: Equatable, Hashable, Sendable {
    public var face: DiceFace
    public var color: DiceColor
    /// Drawn rotated 90°. The TS object has the key only when true; here it is simply false otherwise.
    public var rotate90: Bool

    public init(face: DiceFace, color: DiceColor, rotate90: Bool = false) {
        self.face = face
        self.color = color
        self.rotate90 = rotate90
    }
}

/// Row-major grid: `rows[y][x]`, with y = 0 the BOTTOM row (the build row number users see).
public struct DiceGrid: Equatable, Sendable {
    public var width: Int
    public var height: Int
    public var rows: [[Die]]

    public init(width: Int, height: Int, rows: [[Die]]) {
        self.width = width
        self.height = height
        self.rows = rows
    }

    public subscript(x: Int, y: Int) -> Die { rows[y][x] }
}

public struct DiceParams: Equatable, Sendable {
    /// Grid height in dice (positive integer). Columns follow the image aspect ratio.
    public var numRows: Int
    public var colorMode: ColorMode
    /// 0...100, additive only.
    public var contrast: Double
    /// 1 = unchanged.
    public var gamma: Double
    /// 0...100.
    public var edgeSharpening: Double
    public var rotate6: Bool
    public var rotate3: Bool
    public var rotate2: Bool

    public init(numRows: Int, colorMode: ColorMode, contrast: Double, gamma: Double, edgeSharpening: Double, rotate6: Bool, rotate3: Bool, rotate2: Bool) {
        self.numRows = numRows
        self.colorMode = colorMode
        self.contrast = contrast
        self.gamma = gamma
        self.edgeSharpening = edgeSharpening
        self.rotate6 = rotate6
        self.rotate3 = rotate3
        self.rotate2 = rotate2
    }

    /// `DEFAULT_DICE_PARAMS`: 70 rows, both colours, contrast 25, gamma 1, sharpening 5, no rotation.
    public static let `default` = DiceParams(numRows: 70, colorMode: .both, contrast: 25, gamma: 1, edgeSharpening: 5, rotate6: false, rotate3: false, rotate2: false)
}

public struct DiceStats: Equatable, Sendable {
    public var blackCount: Int
    public var whiteCount: Int
    public var totalCount: Int

    public init(blackCount: Int, whiteCount: Int, totalCount: Int) {
        self.blackCount = blackCount
        self.whiteCount = whiteCount
        self.totalCount = totalCount
    }

    public static let empty = DiceStats(blackCount: 0, whiteCount: 0, totalCount: 0)
}

/// RGBA, 8 bits per channel, row-major, top row first. Alpha is ignored by the pipeline.
public struct Pixels: Sendable {
    public var data: [UInt8]
    public var width: Int
    public var height: Int

    public init(data: [UInt8], width: Int, height: Int) {
        precondition(data.count == width * height * 4, "Pixels needs width * height * 4 bytes")
        self.data = data
        self.width = width
        self.height = height
    }
}

public struct GridPos: Equatable, Hashable, Sendable {
    public var x: Int
    public var y: Int

    public init(x: Int, y: Int) {
        self.x = x
        self.y = y
    }

    public static let origin = GridPos(x: 0, y: 0)
}

public struct GridSize: Equatable, Hashable, Sendable {
    public var width: Int
    public var height: Int

    public init(width: Int, height: Int) {
        self.width = width
        self.height = height
    }
}
