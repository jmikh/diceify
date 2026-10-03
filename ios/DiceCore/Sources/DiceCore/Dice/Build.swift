// Build-step math (core/dice/build.ts): build order, run scanning, navigation, and the viewer's viewBox/window
// arithmetic. Pure functions over `DiceGrid` (`rows[y][x]`, y = 0 = bottom row). SVG rows are top-down: `svgRow`.

// MARK: Build order: row by row from the bottom (y = 0), left to right.

/// Linear build index of a cell.
public func buildIndex(_ pos: GridPos, width: Int) -> Int {
    pos.y * width + pos.x
}

public func positionFromIndex(_ index: Int, width: Int) -> GridPos {
    GridPos(x: index % width, y: index / width)
}

/// Dice placed so far; `progress` is the die currently being placed, which is NOT counted.
public func countCompleted(_ progress: GridPos, width: Int) -> Int {
    buildIndex(progress, width: width)
}

/// Whether `cell` comes strictly before `progress` in build order.
public func isCompleted(_ cell: GridPos, progress: GridPos) -> Bool {
    cell.y < progress.y || (cell.y == progress.y && cell.x < progress.x)
}

// MARK: Runs of identical dice on a row (face and colour; rotation is a rendering detail).

public func sameDie(_ a: Die, _ b: Die) -> Bool {
    a.face == b.face && a.color == b.color
}

/// Inclusive extent of the run of dice identical to `row[x]` that contains x.
public func findRun(_ row: [Die], x: Int) -> (start: Int, end: Int) {
    let die = row[x]
    var start = x
    while start > 0 && sameDie(row[start - 1], die) { start -= 1 }
    var end = x
    while end < row.count - 1 && sameDie(row[end + 1], die) { end += 1 }
    return (start, end)
}

/// Column of the first die after x that differs from `row[x]`, or nil if the rest of the row is identical.
public func findNextDiff(_ row: [Die], x: Int) -> Int? {
    let die = row[x]
    var i = x + 1
    while i < row.count {
        if !sameDie(row[i], die) { return i }
        i += 1
    }
    return nil
}

/// Column of the last die before x that differs from `row[x]`, or nil if the row start is identical.
public func findPrevDiff(_ row: [Die], x: Int) -> Int? {
    let die = row[x]
    var i = x - 1
    while i >= 0 {
        if !sameDie(row[i], die) { return i }
        i -= 1
    }
    return nil
}

// MARK: Stepping through the build order.

/// Next die in build order, or nil at the last die.
public func nextPosition(_ pos: GridPos, width: Int, height: Int) -> GridPos? {
    if pos.x < width - 1 { return GridPos(x: pos.x + 1, y: pos.y) }
    if pos.y < height - 1 { return GridPos(x: 0, y: pos.y + 1) }
    return nil
}

/// Previous die in build order, or nil at the first die.
public func prevPosition(_ pos: GridPos, width: Int) -> GridPos? {
    if pos.x > 0 { return GridPos(x: pos.x - 1, y: pos.y) }
    if pos.y > 0 { return GridPos(x: width - 1, y: pos.y - 1) }
    return nil
}

/// Free-plan rule: rows `0 ..< rowLimit` may be built; nil = unlimited. Backward moves are the caller's call.
public func rowLimitAllows(_ target: GridPos, rowLimit: Int?) -> Bool {
    guard let rowLimit else { return true }
    return target.y < rowLimit
}

/// Build-progress percentages reported to analytics when first passed (100 = the last die is reached).
public let BUILD_MILESTONES: [Int] = [25, 50, 75, 100]

/// Percent of the build done at build index `index`; the last die counts as 100.
private func reachedPercent(_ index: Int, total: Int) -> Double {
    index >= total - 1 ? 100 : (Double(index) / Double(total)) * 100
}

/// Milestones passed by a forward move from build index `from` to `to` on a grid of `total` dice.
public func buildMilestonesCrossed(from: Int, to: Int, total: Int) -> [Int] {
    if total <= 0 || to <= from { return [] }
    let before = reachedPercent(from, total: total)
    let after = reachedPercent(to, total: total)
    return BUILD_MILESTONES.filter { before < Double($0) && after >= Double($0) }
}

// MARK: Viewer geometry. 1 viewBox unit = 1 die; SVG rows count from the top.

public func svgRow(_ y: Int, height: Int) -> Int {
    height - 1 - y
}

public func gridRowFromSvg(_ svgY: Int, height: Int) -> Int {
    height - 1 - svgY
}

public struct ViewBox: Equatable, Sendable {
    public var x: Double
    public var y: Double
    public var w: Double
    public var h: Double

    public init(x: Double, y: Double, w: Double, h: Double) {
        self.x = x
        self.y = y
        self.w = w
        self.h = h
    }
}

/// Inclusive cell window in SVG coordinates (columns = grid x, rows = SVG rows).
public struct CellWindow: Equatable, Sendable {
    public var x0: Int
    public var x1: Int
    public var y0: Int
    public var y1: Int

    public init(x0: Int, x1: Int, y0: Int, y1: Int) {
        self.x0 = x0
        self.x1 = x1
        self.y0 = y0
        self.y1 = y1
    }
}

// Where the selector snaps to after a pan (fraction of the view width) and where it triggers one.
private let SELECTOR_RESET_POSITION = 0.15
private let SELECTOR_PAN_THRESHOLD = 0.85
// Extra space so highlights aren't cut off at the grid edge.
private let EDGE_PADDING = 0.1
// Keep the selected die at least this far from the view edge.
private let PADDING = 0.5

public struct ViewBoxInput: Sendable {
    public var current: GridPos
    public var cols: Int
    public var rows: Int
    /// Number of dice shown horizontally.
    public var zoomLevel: Double
    /// Container width / height; the view matches it so the drawing fills the container exactly.
    public var aspect: Double
    /// Where the view settled last time (nil on the first layout).
    public var lastViewX: Double?

    public init(current: GridPos, cols: Int, rows: Int, zoomLevel: Double, aspect: Double, lastViewX: Double?) {
        self.current = current
        self.cols = cols
        self.rows = rows
        self.zoomLevel = zoomLevel
        self.aspect = aspect
        self.lastViewX = lastViewX
    }
}

/// The viewBox that shows `current`. The view only pans horizontally when the selector crosses the pan threshold or
/// leaves the view on the left; otherwise the grid stays put. Per axis, a grid that fits is centred, otherwise the
/// view is clamped to the grid and nudged to keep the selected die visible.
public func computeViewBox(_ input: ViewBoxInput) -> (viewBox: ViewBox, lastViewX: Double) {
    let cols = Double(input.cols)
    let rows = Double(input.rows)
    var viewWidth = max(3, min(input.zoomLevel, cols))
    var viewHeight = viewWidth / input.aspect
    if viewHeight < 3 {
        viewHeight = 3
        viewWidth = viewHeight * input.aspect
    }

    let currentX = Double(input.current.x)
    let svgY = Double(svgRow(input.current.y, height: input.rows))

    var viewX: Double
    if let lastViewX = input.lastViewX {
        let relativeX = (currentX - lastViewX) / viewWidth
        viewX = relativeX >= SELECTOR_PAN_THRESHOLD || relativeX < 0 ? currentX - viewWidth * SELECTOR_RESET_POSITION : lastViewX
    } else {
        viewX = currentX - viewWidth * SELECTOR_RESET_POSITION
    }

    var viewY = svgY - viewHeight * 0.6

    if viewWidth >= cols + 2 * EDGE_PADDING {
        viewX = (cols - viewWidth) / 2
    } else {
        viewX = min(max(viewX, -EDGE_PADDING), cols + EDGE_PADDING - viewWidth)
        if currentX < viewX + PADDING { viewX = max(-EDGE_PADDING, currentX - PADDING) }
        if currentX >= viewX + viewWidth - PADDING {
            viewX = min(cols + EDGE_PADDING - viewWidth, currentX - viewWidth + 1 + PADDING)
        }
    }

    if viewHeight >= rows + 2 * EDGE_PADDING {
        viewY = (rows - viewHeight) / 2
    } else {
        viewY = min(max(viewY, -EDGE_PADDING), rows + EDGE_PADDING - viewHeight)
        if svgY < viewY + PADDING { viewY = max(-EDGE_PADDING, svgY - PADDING) }
        if svgY >= viewY + viewHeight - PADDING {
            viewY = min(rows + EDGE_PADDING - viewHeight, svgY - viewHeight + 1 + PADDING)
        }
    }

    return (ViewBox(x: viewX, y: viewY, w: viewWidth, h: viewHeight), viewX)
}

private func clampWindow(_ view: ViewBox, cols: Int, rows: Int, padX: Int, padY: Int) -> CellWindow {
    CellWindow(
        x0: max(0, Int(view.x.rounded(.down)) - padX),
        x1: min(cols - 1, Int((view.x + view.w).rounded(.up)) + padX),
        y0: max(0, Int(view.y.rounded(.down)) - padY),
        y1: min(rows - 1, Int((view.y + view.h).rounded(.up)) + padY)
    )
}

/// Cells that must be drawn for `view`: the view rect plus `margin` dice on each side.
public func visibleWindow(_ view: ViewBox, cols: Int, rows: Int, margin: Int = 1) -> CellWindow {
    clampWindow(view, cols: cols, rows: rows, padX: margin, padY: margin)
}

/// Cells to render when the visible window is not covered: one full viewport of buffer on each side.
public func bufferedWindow(_ view: ViewBox, cols: Int, rows: Int) -> CellWindow {
    clampWindow(view, cols: cols, rows: rows, padX: Int(view.w.rounded(.up)), padY: Int(view.h.rounded(.up)))
}

public func windowContains(_ outer: CellWindow, _ inner: CellWindow) -> Bool {
    inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1
}
