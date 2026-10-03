import Testing
@testable import DiceCore

/// The port passes when every golden fixture reproduces exactly (core/README.md → Fixtures).
@Suite struct GenerateTests {
    @Test func gridSize() {
        let cases: [(Int, Int, Int, Int, Int)] = [(120, 90, 30, 40, 30), (64, 64, 30, 30, 30), (256, 16, 16, 256, 16), (32, 32, 30, 30, 30), (1000, 10, 1, 100, 1), (10, 1000, 30, 1, 30)]
        for (w, h, numRows, cols, rows) in cases {
            let size = computeGridSize(imageWidth: w, imageHeight: h, numRows: numRows)
            #expect(size.cols == cols && size.rows == rows, "\(w)x\(h) with \(numRows) rows")
        }
    }

    @Test func topImageRowIsTheHighestGridRow() {
        let px = Pixels(data: [0, 0, 0, 255, 255, 255, 255, 255], width: 1, height: 2)
        var params = DiceParams.default
        params.numRows = 2
        let grid = generateDiceGrid(px, params: params)
        #expect(grid.width == 1 && grid.height == 2)
        #expect(grid.rows[0] == [Die(face: 1, color: .white)])
        #expect(grid.rows[1] == [Die(face: 1, color: .black)])
    }

    @Test func sharpeningSkippedAtZeroAppliedAbove() {
        var data = [UInt8](repeating: 255, count: 9 * 4)
        data.replaceSubrange((4 * 4)..<(4 * 4 + 4), with: [64, 64, 64, 255])
        let px = Pixels(data: data, width: 3, height: 3)
        var base = DiceParams.default
        base.numRows = 3
        base.contrast = 0
        var plainParams = base
        plainParams.edgeSharpening = 0
        var sharpParams = base
        sharpParams.edgeSharpening = 100
        let plain = generateDiceGrid(px, params: plainParams)
        let sharp = generateDiceGrid(px, params: sharpParams)
        #expect(plain.rows[1][1] == Die(face: 6, color: .black))
        #expect(sharp.rows[1][1] == Die(face: 1, color: .black))
        #expect(sharp.rows[0] == plain.rows[0])
    }

    @Test func everyFixtureReproducesExactly() throws {
        let fixtures = try Fixtures.load()
        #expect(fixtures.count >= 8)
        for fixture in fixtures {
            let px = try fixture.pixels
            let size = computeGridSize(imageWidth: px.width, imageHeight: px.height, numRows: fixture.params.numRows)
            #expect(size.cols == fixture.expected.width && size.rows == fixture.expected.height, Comment(rawValue: fixture.name))
            let grid = generateDiceGrid(px, params: fixture.params.diceParams)
            #expect(grid.width == size.cols && grid.height == size.rows, Comment(rawValue: fixture.name))
            let rows = encodeGrid(grid)
            #expect(rows == fixture.expected.rows, "\(fixture.name): \(rows.enumerated().filter { $0.element != fixture.expected.rows[$0.offset] }.map { "row \($0.offset)" })")
        }
    }
}
