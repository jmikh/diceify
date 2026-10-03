import Testing
@testable import DiceCore

// 3×2 grid covering every face, one rotated die per colour. rows[0] is the bottom row (core/dice/svg.test.ts).
private let grid = DiceGrid(width: 3, height: 2, rows: [
    [Die(face: 1, color: .black), Die(face: 2, color: .white, rotate90: true), Die(face: 3, color: .black)],
    [Die(face: 4, color: .white), Die(face: 5, color: .black, rotate90: true), Die(face: 6, color: .white)],
])

@Suite struct EncodingTests {
    @Test func roundTrip() throws {
        for color in DiceColor.allCases {
            for face in 1...6 {
                for rotated in [false, true] {
                    let die = Die(face: face, color: color, rotate90: rotated)
                    #expect(try decodeDie(encodeDie(die)) == die)
                }
            }
        }
        #expect(encodeDie(Die(face: 6, color: .black, rotate90: true)) == "b6r" && encodeDie(Die(face: 3, color: .white)) == "w3")
        for bad in ["", "w", "w7", "w0", "x3", "w3rr", "W3", "w3 ", "b6R"] {
            #expect(throws: GridEncodingError.self, "\(bad)") { try decodeDie(bad) }
        }
    }

    @Test func rows() throws {
        let rows = encodeGrid(grid)
        #expect(rows == ["b1 w2r b3", "w4 b5r w6"])
        #expect(try decodeGrid(rows, width: 3, height: 2) == grid)
        #expect(gridRowsProblem(rows, width: 3, height: 2) == nil)
        #expect(gridRowsProblem(["b1 w2r b3"], width: 3, height: 2) == "expected 2 rows, got 1")
        #expect(gridRowsProblem(["b1 w2r", "w4 b5r w6"], width: 3, height: 2) == "row 0: expected 3 dice, got 2")
        #expect(gridRowsProblem(["b1 w2r b3", "w4 b9 w6"], width: 3, height: 2) == "row 1: invalid die \"b9\"")
        #expect(throws: GridEncodingError.self) { try decodeGrid(["w3"], width: 1, height: 2) }
    }
}

@Suite struct SvgTests {
    @Test func jsNumbers() {
        #expect(jsNumber(50) == "50" && jsNumber(22.5) == "22.5" && jsNumber(0.15) == "0.15" && jsNumber(77.5) == "77.5" && jsNumber(1.5) == "1.5" && jsNumber(12) == "12")
    }

    @Test func frozenSnapshot() throws {
        let expected = try Fixtures.text("svg-3x2.svg")
        #expect(renderGridSvg(grid) == expected)
    }

    @Test func header() {
        let svg = renderGridSvg(grid, size: SvgSize(width: 300, height: 200))
        #expect(svg.hasPrefix("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 3 2\" preserveAspectRatio=\"xMidYMid meet\" width=\"300\" height=\"200\">"))
        #expect(!svg.contains("style=") && svg.contains("<rect width=\"3\" height=\"2\" fill=\"#000000\" />"))
        #expect(renderGridSvg(grid, background: "#ffffff").contains("fill=\"#ffffff\""))
    }

    @Test func symbols() {
        for face in 1...6 {
            #expect(renderDieSymbolBody(face: face, color: .white).components(separatedBy: "<circle ").count - 1 == face)
        }
        #expect(renderDieSymbolBody(face: 6, color: .black, rotate90: true).hasPrefix("<g transform='rotate(90 50 50)'>"))
        #expect(renderDieSymbolBody(face: 6, color: .black).hasPrefix("<g>"))
        let defs = renderDefs()
        #expect(defs.hasPrefix("<defs>") && defs.hasSuffix("</defs>"))
        for color in ["black", "white"] { for face in 1...6 { #expect(defs.contains("<symbol id='dice-\(color)-\(face)' viewBox='0 0 100 100'>")) } }
    }

    @Test func window() {
        let svg = renderWindowSvg(grid, window: CellWindow(x0: -5, x1: 0, y0: 0, y1: 99))
        #expect(svg.hasPrefix("<defs>"))
        #expect(svg.hasSuffix("<use href='#dice-white-4' x='0' y='0' width='1' height='1'/><use href='#dice-black-1' x='0' y='1' width='1' height='1'/>"))
        let rotated = renderWindowSvg(grid, window: CellWindow(x0: 1, x1: 1, y0: 0, y1: 1))
        #expect(rotated.contains("<use href='#dice-black-5' x='1' y='0' width='1' height='1' transform='rotate(90 1.5 0.5)'/>"))
        #expect(rotated.contains("<use href='#dice-white-2' x='1' y='1' width='1' height='1' transform='rotate(90 1.5 1.5)'/>"))
    }

    @Test func progress() {
        let dieCount = { (svg: String) in svg.components(separatedBy: "<svg x='").count - 1 }
        let ghostCount = { (svg: String) in svg.components(separatedBy: "<g opacity='0.15'>").count - 1 }
        for y in 0..<2 {
            for x in 0..<3 {
                let p = GridPos(x: x, y: y)
                let svg = renderProgressSvg(grid, progress: p)
                #expect(dieCount(svg) == 6 && ghostCount(svg) == 6 - countCompleted(p, width: 3))
                #expect(placedDiceCount(grid, progress: p) == countCompleted(p, width: 3))
            }
        }
        let all = renderProgressSvg(grid, progress: .origin, showAll: true)
        #expect(dieCount(all) == 6 && ghostCount(all) == 0 && all.contains("<rect width=\"3\" height=\"2\" fill=\"#eae3d2\" />"))
        let first = renderProgressSvg(grid, progress: GridPos(x: 1, y: 0), background: "#fff")
        #expect(first.contains("\n<svg x='0' y='1' width='1' height='1'") && first.contains("<g opacity='0.15'><svg x='1' y='1' width='1' height='1'"))
        #expect(placedDiceCount(grid, progress: GridPos(x: 0, y: 2)) == 6)
    }

    @Test func raster() {
        #expect(rasterSize(cols: 40, rows: 30, longSide: 1080) == SvgSize(width: 1080, height: 810))
        #expect(rasterSize(cols: 30, rows: 40, longSide: 1080) == SvgSize(width: 810, height: 1080))
        #expect(rasterSize(cols: 30, rows: 30, longSide: 1080) == SvgSize(width: 1080, height: 1080))
        #expect(rasterSize(cols: 41, rows: 30, longSide: 1080) == SvgSize(width: 1080, height: 790))
    }
}
