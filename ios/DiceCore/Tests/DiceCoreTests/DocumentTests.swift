import Foundation
import Testing
@testable import DiceCore

private let crop = CropParams(x: 10, y: 20, width: 400, height: 300, rotation: 90, aspectRatio: .fourThree)

private func fullDoc() -> ProjectDocument {
    var dice = DiceParams.default
    dice.numRows = 40
    dice.contrast = 30
    return ProjectDocument(step: .build, crop: crop, dice: dice, grid: StoredGrid(width: 53, height: 40, rows: nil), buildProgress: GridPos(x: 7, y: 3))
}

/// A document whose grid carries its dice: 2 × 3 (rows[0] = bottom).
private func gridDoc() -> ProjectDocument {
    var doc = fullDoc()
    doc.dice.numRows = 20
    doc.grid = StoredGrid(width: 2, height: 3, rows: ["w1 b6r", "b2 b2", "w5 w6"])
    doc.buildProgress = GridPos(x: 1, y: 1)
    return doc
}

private func json(_ doc: ProjectDocument, _ patch: (inout [String: Any]) -> Void = { _ in }) -> [String: Any] {
    var raw = doc.jsonObject
    patch(&raw)
    return raw
}

private func expectInvalid(_ raw: Any, _ note: String = "") {
    do {
        _ = try migrateDocument(raw)
        Issue.record("expected INVALID \(note)")
    } catch DocumentError.invalid {
    } catch {
        Issue.record("expected INVALID, got \(error) \(note)")
    }
}

@Suite struct DocumentTests {
    @Test func defaultDocument() throws {
        let doc = ProjectDocument.createDefault()
        #expect(doc == ProjectDocument(schemaVersion: CURRENT_SCHEMA_VERSION, step: .crop, crop: nil, dice: .default, grid: nil, buildProgress: .origin))
        #expect(try migrateDocument(doc.jsonObject) == doc)
    }

    @Test func currentDocumentsRoundTrip() throws {
        for doc in [fullDoc(), gridDoc()] {
            #expect(try migrateDocument(doc.jsonObject) == doc)
            #expect(try migrateDocument(json: try doc.jsonData()) == doc)
        }
        // What the web writes (JSON from a project row) reads back the same
        let web = """
        {"schemaVersion":2,"step":"tune","crop":{"x":1.5,"y":2.5,"width":640,"height":360,"rotation":180,"aspectRatio":"16:9"},"dice":{"numRows":50,"colorMode":"both","contrast":25,"gamma":1,"edgeSharpening":20,"rotate6":false,"rotate3":false,"rotate2":false},"grid":{"width":89,"height":50,"rows":null},"buildProgress":{"x":0,"y":0}}
        """
        let doc = try migrateDocument(json: Data(web.utf8))
        #expect(doc.step == .tune && doc.crop?.aspectRatio == .sixteenNine && doc.dice.numRows == 50 && doc.grid == StoredGrid(width: 89, height: 50, rows: nil))
    }

    @Test func strictValidation() {
        expectInvalid(json(fullDoc()) { $0["extra"] = 1 }, "unknown key")
        expectInvalid(json(fullDoc()) { $0["crop"] = ["x": 10, "y": 20, "width": 400, "height": 300, "rotation": "NaN", "aspectRatio": "4:3"] }, "rotation")
        expectInvalid(json(fullDoc()) { var d = $0["dice"] as! [String: Any]; d["numRows"] = 121; $0["dice"] = d }, "numRows")
        expectInvalid(json(fullDoc()) { var d = $0["dice"] as! [String: Any]; d["gamma"] = 0.49; $0["dice"] = d }, "gamma")
        expectInvalid(json(fullDoc()) { var d = $0["dice"] as! [String: Any]; d["numRows"] = 40.5; $0["dice"] = d }, "non-integer")
        expectInvalid(json(fullDoc()) { var d = $0["dice"] as! [String: Any]; d["rotate6"] = 1; $0["dice"] = d }, "bool as number")
        expectInvalid(json(fullDoc()) { $0["buildProgress"] = ["x": -1, "y": 0] }, "negative progress")
        expectInvalid(json(fullDoc()) { $0["step"] = "upload" }, "step")
        expectInvalid(json(fullDoc()) { var c = $0["crop"] as! [String: Any]; c["aspectRatio"] = "5:4"; $0["crop"] = c }, "aspect")
        expectInvalid(json(fullDoc()) { var c = $0["crop"] as! [String: Any]; c["width"] = 0; $0["crop"] = c }, "crop width")
        expectInvalid(json(gridDoc()) { $0["grid"] = ["width": 2, "height": 3, "rows": ["w1 b6r", "b2 b2"]] }, "row count")
        expectInvalid(json(gridDoc()) { $0["grid"] = ["width": 2, "height": 3, "rows": ["w1 b6r", "b2 b2 b2", "w5 w6"]] }, "row width")
        expectInvalid(json(gridDoc()) { $0["grid"] = ["width": 2, "height": 3, "rows": ["w1 b6r", "b2 b7", "w5 w6"]] }, "token")
        expectInvalid(json(gridDoc()) { $0["grid"] = ["width": 2, "height": 3] }, "rows missing")
        expectInvalid("doc"); expectInvalid(NSNull()); expectInvalid([1, 2])
    }

    @Test func versions() throws {
        var v1 = json(fullDoc())
        v1["schemaVersion"] = 1
        v1["grid"] = ["width": 53, "height": 40]
        #expect(try migrateDocument(v1) == fullDoc())
        var v1NoGrid = v1
        v1NoGrid["grid"] = NSNull()
        var expected = fullDoc()
        expected.grid = nil
        #expect(try migrateDocument(v1NoGrid) == expected)
        expectInvalid(json(fullDoc()) { $0["schemaVersion"] = 1; $0["grid"] = ["width": 0, "height": 40] })
        for version: Any in [3, "2", NSNull()] {
            var raw = json(fullDoc())
            raw["schemaVersion"] = version
            #expect(throws: DocumentError.self) { try migrateDocument(raw) }
            do { _ = try migrateDocument(raw) } catch DocumentError.unsupportedVersion { } catch { Issue.record("expected UNSUPPORTED_VERSION for \(version): \(error)") }
        }
        var missing = json(fullDoc())
        missing.removeValue(forKey: "schemaVersion")
        do { _ = try migrateDocument(missing) } catch DocumentError.unsupportedVersion { } catch { Issue.record("legacy drafts are not the app's business: \(error)") }
    }

    @Test func storedGrid() throws {
        let grid = try decodeStoredGrid(gridDoc().grid)
        #expect(grid?.rows[0] == [Die(face: 1, color: .white), Die(face: 6, color: .black, rotate90: true)])
        #expect(grid?.rows[2] == [Die(face: 5, color: .white), Die(face: 6, color: .white)])
        #expect(try decodeStoredGrid(fullDoc().grid) == nil && (try decodeStoredGrid(nil)) == nil)
    }

    @Test func stats() {
        #expect(fullDoc().stats == (2120, 166))
        #expect(documentStats(grid: GridSize(width: 10, height: 2), buildProgress: GridPos(x: 5, y: 7)) == (20, 20))
        #expect(documentStats(grid: nil, buildProgress: GridPos(x: 5, y: 7)) == (0, 0))
    }

    @Test func equality() throws {
        var jittered = crop; jittered.x += 0.009
        #expect(cropParamsEqual(crop, jittered))
        jittered.x = crop.x + 0.011
        #expect(!cropParamsEqual(crop, jittered))
        var flat = crop; flat.rotation = 0
        #expect(!cropParamsEqual(crop, flat))
        var half = crop; half.x += 0.5
        #expect(cropParamsEqual(crop, half, tolerance: 1))
        #expect(cropParamsEqual(nil, nil) && !cropParamsEqual(crop, nil))
        let inputs = GridInputs(crop: crop, dice: .default)
        #expect(gridInputsEqual(inputs, GridInputs(crop: jittered, dice: .default)) == false)
        #expect(progressApplies(inputs, baseline: GridInputs(crop: half, dice: .default)) == false)
        #expect(progressApplies(inputs, baseline: inputs) && !progressApplies(inputs, baseline: nil))
        // Deterministic JSON (sorted keys) so two encodings of the same document are byte-equal
        #expect(try fullDoc().jsonData() == fullDoc().jsonData())
    }

    @Test func cropHelpers() {
        #expect(nearestAspectRatio(width: 100, height: 100) == .square && nearestAspectRatio(width: 300, height: 400) == .threeFour)
        #expect(nearestAspectRatio(width: 400, height: 300) == .fourThree && nearestAspectRatio(width: 200, height: 300) == .twoThree)
        #expect(nearestAspectRatio(width: 1920, height: 1080) == .sixteenNine && nearestAspectRatio(width: 1900, height: 1080) == .sixteenNine)
        #expect(nearestAspectRatio(width: 700, height: 1000) == .twoThree && nearestAspectRatio(width: 100, height: 0) == .square && nearestAspectRatio(width: .nan, height: 1) == .square)

        let landscape = (width: 4000.0, height: 3000.0)
        let square = { (x: Double, y: Double, size: Double) in CropParams(x: x, y: y, width: size, height: size, rotation: 0, aspectRatio: .square) }
        let wide = reframeCrop(square(500, 0, 3000), aspectRatio: .sixteenNine, bounds: landscape)
        #expect(wide == CropParams(x: 0, y: 375, width: 4000, height: 2250, rotation: 0, aspectRatio: .sixteenNine))
        #expect(reframeCrop(wide, aspectRatio: .square, bounds: landscape) == square(500, 0, 3000))
        let portrait = (width: 3000.0, height: 4000.0)
        let flat = reframeCrop(square(0, 500, 3000), aspectRatio: .sixteenNine, bounds: portrait)
        #expect(flat.x == 0 && flat.width == 3000 && flat.height == 1687.5)
        #expect(reframeCrop(flat, aspectRatio: .square, bounds: portrait) == square(0, 500, 3000))
        #expect(reframeCrop(square(1250, 750, 1500), aspectRatio: .sixteenNine, bounds: landscape) == CropParams(x: 1000, y: 937.5, width: 2000, height: 1125, rotation: 0, aspectRatio: .sixteenNine))
        var corner = square(0, 0, 1500); corner.rotation = 90
        #expect(reframeCrop(corner, aspectRatio: .sixteenNine, bounds: landscape) == CropParams(x: 0, y: 187.5, width: 2000, height: 1125, rotation: 90, aspectRatio: .sixteenNine))
        #expect(scaleCrop(crop, factor: 0.5) == CropParams(x: 5, y: 10, width: 200, height: 150, rotation: 90, aspectRatio: .fourThree))
    }
}
