import Testing
@testable import DiceCore

private func b(_ face: Int, _ rotated: Bool = false) -> Die { Die(face: face, color: .black, rotate90: rotated) }
private func w(_ face: Int) -> Die { Die(face: face, color: .white) }
// x:  0     1     2        3     4     5     6
private let row: [Die] = [b(1), b(1), b(1, true), w(1), b(1), b(1), w(6)]

@Suite struct BuildTests {
    @Test func order() {
        for i in 0..<12 { #expect(buildIndex(positionFromIndex(i, width: 4), width: 4) == i) }
        #expect(buildIndex(GridPos(x: 2, y: 3), width: 4) == 14 && positionFromIndex(14, width: 4) == GridPos(x: 2, y: 3))
        #expect(countCompleted(.origin, width: 10) == 0 && countCompleted(GridPos(x: 3, y: 2), width: 10) == 23)
        let progress = GridPos(x: 3, y: 2)
        #expect(isCompleted(GridPos(x: 9, y: 1), progress: progress) && isCompleted(GridPos(x: 2, y: 2), progress: progress))
        #expect(!isCompleted(GridPos(x: 3, y: 2), progress: progress) && !isCompleted(GridPos(x: 4, y: 2), progress: progress) && !isCompleted(GridPos(x: 0, y: 3), progress: progress))
        for i in 0..<20 {
            let p = positionFromIndex(i, width: 5)
            var n = 0
            for y in 0..<4 { for x in 0..<5 where isCompleted(GridPos(x: x, y: y), progress: p) { n += 1 } }
            #expect(n == countCompleted(p, width: 5))
        }
    }

    @Test func runsAndDiffs() {
        #expect(sameDie(b(1), b(1, true)) && !sameDie(b(1), w(1)) && !sameDie(b(1), b(2)))
        #expect(findRun(row, x: 0) == (0, 2) && findRun(row, x: 2) == (0, 2) && findRun(row, x: 3) == (3, 3) && findRun(row, x: 5) == (4, 5) && findRun(row, x: 6) == (6, 6))
        #expect(findNextDiff(row, x: 0) == 3 && findNextDiff(row, x: 3) == 4 && findNextDiff(row, x: 4) == 6 && findNextDiff(row, x: 6) == nil)
        #expect(findNextDiff([b(2), b(2), b(2)], x: 0) == nil)
        #expect(findPrevDiff(row, x: 6) == 5 && findPrevDiff(row, x: 4) == 3 && findPrevDiff(row, x: 3) == 2 && findPrevDiff(row, x: 2) == nil && findPrevDiff(row, x: 0) == nil)
    }

    @Test func stepping() {
        #expect(nextPosition(.origin, width: 3, height: 2) == GridPos(x: 1, y: 0))
        #expect(nextPosition(GridPos(x: 2, y: 0), width: 3, height: 2) == GridPos(x: 0, y: 1))
        #expect(nextPosition(GridPos(x: 2, y: 1), width: 3, height: 2) == nil)
        #expect(prevPosition(GridPos(x: 1, y: 1), width: 3) == GridPos(x: 0, y: 1) && prevPosition(GridPos(x: 0, y: 1), width: 3) == GridPos(x: 2, y: 0) && prevPosition(.origin, width: 3) == nil)
        #expect(rowLimitAllows(GridPos(x: 0, y: 999), rowLimit: nil) && rowLimitAllows(GridPos(x: 9, y: 4), rowLimit: 5))
        #expect(!rowLimitAllows(GridPos(x: 0, y: 5), rowLimit: 5) && !rowLimitAllows(.origin, rowLimit: 0))
        #expect(buildMilestonesCrossed(from: 0, to: 24, total: 100) == [] && buildMilestonesCrossed(from: 24, to: 25, total: 100) == [25])
        #expect(buildMilestonesCrossed(from: 25, to: 26, total: 100) == [] && buildMilestonesCrossed(from: 10, to: 80, total: 100) == [25, 50, 75])
        #expect(buildMilestonesCrossed(from: 98, to: 99, total: 100) == [100] && buildMilestonesCrossed(from: 0, to: 99, total: 100) == [25, 50, 75, 100])
        #expect(buildMilestonesCrossed(from: 80, to: 10, total: 100) == [] && buildMilestonesCrossed(from: 50, to: 50, total: 100) == [])
        #expect(buildMilestonesCrossed(from: 0, to: 1, total: 0) == [] && buildMilestonesCrossed(from: 0, to: 0, total: 1) == [])
    }

    @Test func svgRows() {
        #expect(svgRow(0, height: 30) == 29 && svgRow(29, height: 30) == 0 && gridRowFromSvg(svgRow(7, height: 30), height: 30) == 7)
    }

    private func expectView(_ actual: ViewBox, _ x: Double, _ y: Double, _ w: Double, _ h: Double, _ note: String = "") {
        #expect(abs(actual.x - x) < 1e-9 && abs(actual.y - y) < 1e-9 && abs(actual.w - w) < 1e-9 && abs(actual.h - h) < 1e-9, "\(note) got \(actual)")
    }

    @Test func viewBox() {
        var base = ViewBoxInput(current: .origin, cols: 30, rows: 30, zoomLevel: 8, aspect: 2, lastViewX: nil)
        let first = computeViewBox(base)
        expectView(first.viewBox, -0.1, 26.1, 8, 4, "origin")
        #expect(abs(first.lastViewX + 0.1) < 1e-9)
        base.current = GridPos(x: 10, y: 5)
        let mid = computeViewBox(base)
        expectView(mid.viewBox, 8.8, 21.6, 8, 4, "mid")
        #expect(abs((10 - mid.viewBox.x) / mid.viewBox.w - 0.15) < 1e-9)
        base.current = GridPos(x: 15, y: 5); base.lastViewX = 8.8
        let kept = computeViewBox(base)
        #expect(abs(kept.viewBox.x - 8.8) < 1e-9 && abs(kept.lastViewX - 8.8) < 1e-9)
        base.current = GridPos(x: 16, y: 5)
        #expect(abs(computeViewBox(base).viewBox.x - 14.8) < 1e-9)
        base.current = GridPos(x: 8, y: 5)
        #expect(abs(computeViewBox(base).viewBox.x - 6.8) < 1e-9)
        base.lastViewX = nil
        base.current = GridPos(x: 29, y: 29)
        expectView(computeViewBox(base).viewBox, 22.1, -0.1, 8, 4, "corner")
        var small = ViewBoxInput(current: .origin, cols: 3, rows: 3, zoomLevel: 8, aspect: 2, lastViewX: nil)
        expectView(computeViewBox(small).viewBox, -1.5, 0.1, 6, 3, "small")
        small = ViewBoxInput(current: .origin, cols: 5, rows: 4, zoomLevel: 8, aspect: 1, lastViewX: nil)
        expectView(computeViewBox(small).viewBox, -0.1, -0.5, 5, 5, "short")
        let tiny = computeViewBox(ViewBoxInput(current: .origin, cols: 30, rows: 30, zoomLevel: 1, aspect: 1, lastViewX: nil))
        #expect(tiny.viewBox.w == 3 && tiny.viewBox.h == 3)
    }

    @Test func windows() {
        let view = ViewBox(x: 8.8, y: 21.6, w: 8, h: 4)
        #expect(visibleWindow(view, cols: 30, rows: 30) == CellWindow(x0: 7, x1: 18, y0: 20, y1: 27))
        #expect(visibleWindow(ViewBox(x: -0.1, y: 26.1, w: 8, h: 4), cols: 30, rows: 30) == CellWindow(x0: 0, x1: 9, y0: 25, y1: 29))
        let outer = bufferedWindow(view, cols: 30, rows: 30)
        #expect(outer == CellWindow(x0: 0, x1: 25, y0: 17, y1: 29))
        #expect(windowContains(outer, visibleWindow(view, cols: 30, rows: 30)) && windowContains(outer, outer))
        var wider = outer; wider.x1 += 1
        #expect(!windowContains(outer, wider))
    }
}
