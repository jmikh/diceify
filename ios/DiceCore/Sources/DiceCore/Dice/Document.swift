// The persisted project document (core/dice/document.ts + document.schema.ts): what the editor needs to restore a
// project besides the image. Schema v2. The app reads rows written by the web (always carrying a `schemaVersion`),
// so there is no legacy-draft path here; v1 is migrated, anything newer is refused without being overwritten.
// Parsing is done over `JSONSerialization` dictionaries so unknown keys and out-of-range values are rejected exactly
// as the zod schema does.

import Foundation

public let CURRENT_SCHEMA_VERSION = 2

public enum AspectRatio: String, Sendable, CaseIterable, Codable {
    case square = "1:1"
    case threeFour = "3:4"
    case fourThree = "4:3"
    case twoThree = "2:3"
    case sixteenNine = "16:9"

    /// Width / height.
    public var ratio: Double {
        let parts = rawValue.split(separator: ":").map { Double($0)! }
        return parts[0] / parts[1]
    }
}

/// The crop preset used before the user picks one.
public let DEFAULT_ASPECT_RATIO = AspectRatio.square

public enum DocumentStep: String, Sendable, CaseIterable, Codable {
    case crop, tune, build
}

/// Slider ranges (single source for the tune controls).
public enum DiceParamBounds {
    public static let numRows = 20...120
    public static let contrast = 0.0...100.0
    public static let gamma = 0.5...1.5
    public static let edgeSharpening = 0.0...100.0
}

/// Crop box in downscaled-image coordinates (the rotated image's bounding box).
public struct CropParams: Equatable, Sendable {
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double
    public var rotation: Double
    public var aspectRatio: AspectRatio

    public init(x: Double, y: Double, width: Double, height: Double, rotation: Double, aspectRatio: AspectRatio) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.rotation = rotation
        self.aspectRatio = aspectRatio
    }
}

/// The generated grid as persisted: its size, plus every die (`encodeGrid`) once it has been generated.
public struct StoredGrid: Equatable, Sendable {
    public var width: Int
    public var height: Int
    public var rows: [String]?

    public init(width: Int, height: Int, rows: [String]?) {
        self.width = width
        self.height = height
        self.rows = rows
    }

    public var size: GridSize { GridSize(width: width, height: height) }
}

public struct ProjectDocument: Equatable, Sendable {
    public var schemaVersion: Int
    /// 'upload' is never persisted: a project always has an image.
    public var step: DocumentStep
    public var crop: CropParams?
    public var dice: DiceParams
    /// The grid `buildProgress` refers to (nil until one has been generated; `rows` nil when only its size is known).
    public var grid: StoredGrid?
    public var buildProgress: GridPos

    public init(schemaVersion: Int = CURRENT_SCHEMA_VERSION, step: DocumentStep, crop: CropParams?, dice: DiceParams, grid: StoredGrid?, buildProgress: GridPos) {
        self.schemaVersion = schemaVersion
        self.step = step
        self.crop = crop
        self.dice = dice
        self.grid = grid
        self.buildProgress = buildProgress
    }

    public static func createDefault() -> ProjectDocument {
        ProjectDocument(step: .crop, crop: nil, dice: .default, grid: nil, buildProgress: .origin)
    }
}

public enum DocumentError: Error, Equatable {
    /// Not a document, or a current one that fails validation (`message` names the first problem).
    case invalid(String)
    /// A schema this build does not know: show "update the app", never overwrite.
    case unsupportedVersion(String)
}

// MARK: Parsing (strict, like the zod schema)

/// JSON `true`/`false` arrive as `CFBoolean`; a JSON `1` is an `NSNumber` that Swift would also bridge to `Bool`, so
/// the type id is the only reliable test (zod distinguishes them the same way).
private func isBoolean(_ value: Any?) -> Bool {
    guard let value else { return false }
    return CFGetTypeID(value as CFTypeRef) == CFBooleanGetTypeID()
}

private struct Validator {
    /// `path` names the failing field in the error, as zod does (`dice.numRows`).
    func object(_ value: Any?, _ path: String, keys: Set<String>) throws -> [String: Any] {
        guard let dict = value as? [String: Any] else { throw DocumentError.invalid("\(path): expected an object") }
        if let extra = dict.keys.first(where: { !keys.contains($0) }) { throw DocumentError.invalid("\(path): unrecognized key \"\(extra)\"") }
        return dict
    }

    func number(_ value: Any?, _ path: String, in range: ClosedRange<Double>? = nil) throws -> Double {
        guard let number = value as? NSNumber, !isBoolean(value), number.doubleValue.isFinite else { throw DocumentError.invalid("\(path): expected a number") }
        let v = number.doubleValue
        if let range, !range.contains(v) { throw DocumentError.invalid("\(path): out of range") }
        return v
    }

    func int(_ value: Any?, _ path: String, min: Int? = nil, in range: ClosedRange<Int>? = nil) throws -> Int {
        let v = try number(value, path)
        guard v == v.rounded(.towardZero), abs(v) < 9e15 else { throw DocumentError.invalid("\(path): expected an integer") }
        let i = Int(v)
        if let min, i < min { throw DocumentError.invalid("\(path): too small") }
        if let range, !range.contains(i) { throw DocumentError.invalid("\(path): out of range") }
        return i
    }

    func bool(_ value: Any?, _ path: String) throws -> Bool {
        guard let b = value as? Bool, isBoolean(value) else { throw DocumentError.invalid("\(path): expected a boolean") }
        return b
    }

    func string(_ value: Any?, _ path: String) throws -> String {
        guard let s = value as? String else { throw DocumentError.invalid("\(path): expected a string") }
        return s
    }

    func isNull(_ value: Any?) -> Bool { value == nil || value is NSNull }
}

private let DOCUMENT_KEYS: Set<String> = ["schemaVersion", "step", "crop", "dice", "grid", "buildProgress"]
private let DICE_KEYS: Set<String> = ["numRows", "colorMode", "contrast", "gamma", "edgeSharpening", "rotate6", "rotate3", "rotate2"]
private let CROP_KEYS: Set<String> = ["x", "y", "width", "height", "rotation", "aspectRatio"]
private let GRID_KEYS: Set<String> = ["width", "height", "rows"]
private let POS_KEYS: Set<String> = ["x", "y"]

private func parseDocument(_ raw: [String: Any]) throws -> ProjectDocument {
    let v = Validator()
    let root = try v.object(raw, "<root>", keys: DOCUMENT_KEYS)
    guard try v.int(root["schemaVersion"], "schemaVersion") == CURRENT_SCHEMA_VERSION else { throw DocumentError.invalid("schemaVersion: expected \(CURRENT_SCHEMA_VERSION)") }
    guard let step = DocumentStep(rawValue: try v.string(root["step"], "step")) else { throw DocumentError.invalid("step: invalid value") }

    var crop: CropParams? = nil
    if !v.isNull(root["crop"]) {
        let c = try v.object(root["crop"], "crop", keys: CROP_KEYS)
        let width = try v.number(c["width"], "crop.width")
        let height = try v.number(c["height"], "crop.height")
        guard width > 0, height > 0 else { throw DocumentError.invalid("crop.width: must be positive") }
        guard let aspect = AspectRatio(rawValue: try v.string(c["aspectRatio"], "crop.aspectRatio")) else { throw DocumentError.invalid("crop.aspectRatio: invalid value") }
        crop = CropParams(x: try v.number(c["x"], "crop.x"), y: try v.number(c["y"], "crop.y"), width: width, height: height, rotation: try v.number(c["rotation"], "crop.rotation"), aspectRatio: aspect)
    }

    let d = try v.object(root["dice"], "dice", keys: DICE_KEYS)
    guard let colorMode = ColorMode(rawValue: try v.string(d["colorMode"], "dice.colorMode")) else { throw DocumentError.invalid("dice.colorMode: invalid value") }
    let dice = DiceParams(
        numRows: try v.int(d["numRows"], "dice.numRows", in: DiceParamBounds.numRows),
        colorMode: colorMode,
        contrast: try v.number(d["contrast"], "dice.contrast", in: DiceParamBounds.contrast),
        gamma: try v.number(d["gamma"], "dice.gamma", in: DiceParamBounds.gamma),
        edgeSharpening: try v.number(d["edgeSharpening"], "dice.edgeSharpening", in: DiceParamBounds.edgeSharpening),
        rotate6: try v.bool(d["rotate6"], "dice.rotate6"),
        rotate3: try v.bool(d["rotate3"], "dice.rotate3"),
        rotate2: try v.bool(d["rotate2"], "dice.rotate2")
    )

    var grid: StoredGrid? = nil
    if !v.isNull(root["grid"]) {
        let g = try v.object(root["grid"], "grid", keys: GRID_KEYS)
        let width = try v.int(g["width"], "grid.width", min: 1)
        let height = try v.int(g["height"], "grid.height", min: 1)
        guard g.keys.contains("rows") else { throw DocumentError.invalid("grid.rows: required") }
        var rows: [String]? = nil
        if !v.isNull(g["rows"]) {
            guard let list = g["rows"] as? [Any] else { throw DocumentError.invalid("grid.rows: expected an array") }
            rows = try list.enumerated().map { try v.string($0.element, "grid.rows.\($0.offset)") }
            if let problem = gridRowsProblem(rows!, width: width, height: height) { throw DocumentError.invalid("grid.rows: \(problem)") }
        }
        grid = StoredGrid(width: width, height: height, rows: rows)
    }

    let p = try v.object(root["buildProgress"], "buildProgress", keys: POS_KEYS)
    let progress = GridPos(x: try v.int(p["x"], "buildProgress.x", min: 0), y: try v.int(p["y"], "buildProgress.y", min: 0))

    return ProjectDocument(schemaVersion: CURRENT_SCHEMA_VERSION, step: step, crop: crop, dice: dice, grid: grid, buildProgress: progress)
}

/// v1 → v2: the grid gains `rows` (unknown for a v1 document: null until the next generation).
private func fromV1(_ raw: [String: Any]) -> [String: Any] {
    var out = raw
    out["schemaVersion"] = 2
    if var grid = raw["grid"] as? [String: Any] {
        grid["rows"] = NSNull()
        out["grid"] = grid
    }
    return out
}

/// Accepts a current document (validated strictly) or an older version (migrated, then validated).
public func migrateDocument(_ raw: Any) throws -> ProjectDocument {
    guard let dict = raw as? [String: Any] else { throw DocumentError.invalid("Project document must be an object") }
    guard let versionNumber = dict["schemaVersion"] as? NSNumber, !isBoolean(dict["schemaVersion"]) else {
        throw DocumentError.unsupportedVersion("Unsupported project document version \(dict["schemaVersion"].map { "\($0)" } ?? "undefined")")
    }
    switch versionNumber.doubleValue {
    case 1: return try parseDocument(fromV1(dict))
    case Double(CURRENT_SCHEMA_VERSION): return try parseDocument(dict)
    default: throw DocumentError.unsupportedVersion("Unsupported project document version \(versionNumber)")
    }
}

/// `migrateDocument` over JSON bytes (a `projects.document` column, a cached file).
public func migrateDocument(json: Data) throws -> ProjectDocument {
    let raw: Any
    do { raw = try JSONSerialization.jsonObject(with: json) } catch { throw DocumentError.invalid("Project document is not JSON") }
    return try migrateDocument(raw)
}

// MARK: Serialising

extension ProjectDocument {
    /// The document as the JSON object the web writes (same keys; `rotate90`-style optional members do not occur here).
    public var jsonObject: [String: Any] {
        var out: [String: Any] = [
            "schemaVersion": schemaVersion,
            "step": step.rawValue,
            "crop": crop.map { ["x": $0.x, "y": $0.y, "width": $0.width, "height": $0.height, "rotation": $0.rotation, "aspectRatio": $0.aspectRatio.rawValue] as [String: Any] } ?? NSNull(),
            "dice": [
                "numRows": dice.numRows, "colorMode": dice.colorMode.rawValue, "contrast": dice.contrast, "gamma": dice.gamma,
                "edgeSharpening": dice.edgeSharpening, "rotate6": dice.rotate6, "rotate3": dice.rotate3, "rotate2": dice.rotate2,
            ] as [String: Any],
            "buildProgress": ["x": buildProgress.x, "y": buildProgress.y],
        ]
        out["grid"] = grid.map { ["width": $0.width, "height": $0.height, "rows": $0.rows.map { $0 as Any } ?? NSNull()] as [String: Any] } ?? NSNull()
        return out
    }

    /// JSON bytes with sorted keys (deterministic, like the web's stable stringify).
    public func jsonData() throws -> Data {
        try JSONSerialization.data(withJSONObject: jsonObject, options: [.sortedKeys])
    }
}

// MARK: Derived values and helpers

/// The persisted grid as a `DiceGrid`, or nil when the document holds no (complete) grid.
public func decodeStoredGrid(_ grid: StoredGrid?) throws -> DiceGrid? {
    guard let grid, let rows = grid.rows else { return nil }
    return try decodeGrid(rows, width: grid.width, height: grid.height)
}

public func documentStats(grid: GridSize?, buildProgress: GridPos) -> (totalDice: Int, completedDice: Int) {
    guard let grid else { return (0, 0) }
    let total = grid.width * grid.height
    return (total, min(total, max(0, countCompleted(buildProgress, width: grid.width))))
}

extension ProjectDocument {
    public var stats: (totalDice: Int, completedDice: Int) { documentStats(grid: grid?.size, buildProgress: buildProgress) }
}

/// Crop coordinates jitter by fractions of a pixel when the cropper remounts, so compare with a tolerance.
public func cropParamsEqual(_ a: CropParams?, _ b: CropParams?, tolerance: Double = 0.01) -> Bool {
    guard let a, let b else { return a == nil && b == nil }
    return abs(a.x - b.x) < tolerance && abs(a.y - b.y) < tolerance && abs(a.width - b.width) < tolerance
        && abs(a.height - b.height) < tolerance && abs(a.rotation - b.rotation) < tolerance
}

/// The inputs a grid is generated from (also what build progress is anchored to).
public struct GridInputs: Equatable, Sendable {
    public var crop: CropParams?
    public var dice: DiceParams

    public init(crop: CropParams?, dice: DiceParams) {
        self.crop = crop
        self.dice = dice
    }
}

public typealias BuildBaseline = GridInputs

/// Same crop (within the cropper's jitter tolerance) and the same tune params.
public func gridInputsEqual(_ a: GridInputs, _ b: GridInputs?) -> Bool {
    guard let b else { return false }
    return cropParamsEqual(a.crop, b.crop) && a.dice == b.dice
}

/// Does build progress made against `baseline` still apply to the document's current crop/tune params?
public func progressApplies(_ doc: GridInputs, baseline: BuildBaseline?) -> Bool {
    gridInputsEqual(doc, baseline)
}

extension ProjectDocument {
    public var gridInputs: GridInputs { GridInputs(crop: crop, dice: dice) }
}

// MARK: Crop helpers

/// The preset closest to w/h; `DEFAULT_ASPECT_RATIO` for degenerate input.
public func nearestAspectRatio(width: Double, height: Double) -> AspectRatio {
    let ratio = width / height
    guard ratio.isFinite, ratio > 0 else { return DEFAULT_ASPECT_RATIO }
    var best = AspectRatio.allCases[0]
    var bestDistance = Double.infinity
    for aspect in AspectRatio.allCases {
        let distance = abs(ratio - aspect.ratio)
        if distance < bestDistance {
            best = aspect
            bestDistance = distance
        }
    }
    return best
}

/// The largest box of `ratio` (width / height) that fits in `bounds`.
private func largestBox(_ bounds: (width: Double, height: Double), ratio: Double) -> (width: Double, height: Double) {
    bounds.width / bounds.height > ratio
        ? (bounds.height * ratio, bounds.height)
        : (bounds.width, bounds.width / ratio)
}

/// The crop for a new preset: as zoomed in relative to the largest box each preset allows, around the same centre
/// (moved back inside `bounds`, the rotated image).
public func reframeCrop(_ crop: CropParams, aspectRatio: AspectRatio, bounds: (width: Double, height: Double)) -> CropParams {
    guard crop.width > 0, crop.height > 0, bounds.width > 0, bounds.height > 0 else {
        var out = crop
        out.aspectRatio = aspectRatio
        return out
    }
    let from = largestBox(bounds, ratio: crop.width / crop.height)
    let zoom = min(1, max(crop.width / from.width, crop.height / from.height))
    let to = largestBox(bounds, ratio: aspectRatio.ratio)
    let width = to.width * zoom
    let height = to.height * zoom
    let clamp = { (value: Double, max: Double) in Swift.min(Swift.max(value, 0), max) }
    return CropParams(
        x: clamp(crop.x + (crop.width - width) / 2, bounds.width - width),
        y: clamp(crop.y + (crop.height - height) / 2, bounds.height - height),
        width: width,
        height: height,
        rotation: crop.rotation,
        aspectRatio: aspectRatio
    )
}

/// Rescale a crop box when the image it refers to is resized by `factor` (rotation and preset unchanged).
public func scaleCrop(_ crop: CropParams, factor: Double) -> CropParams {
    var out = crop
    out.x *= factor
    out.y *= factor
    out.width *= factor
    out.height *= factor
    return out
}
