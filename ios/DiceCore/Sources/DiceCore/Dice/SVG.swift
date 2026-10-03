// SVG string rendering of dice grids (core/dice/svg.ts). Pure string building; 1 viewBox unit = 1 die, rows
// top-down (`svgRow`). The output is byte-identical to the web renderer (the frozen `svg-3x2.svg` fixture pins it), so
// a blueprint downloaded from the phone equals one downloaded from the browser.

/// Symbol/side length every die is drawn in; the outer element scales it to 1 unit.
private let DIE_SIZE = 100.0

/// Progress preview: cream background, unbuilt dice drawn as faint ghosts of the final art.
public enum ProgressStyle {
    public static let background = "#eae3d2"
    public static let unbuiltOpacity = 0.15
}

private let SVG_XMLNS = "http://www.w3.org/2000/svg"

public func symbolId(color: DiceColor, face: DiceFace) -> String {
    "dice-\(color.rawValue)-\(face)"
}

/// Inner markup of one die in a 0 0 100 100 viewBox (background, border and dots).
public func renderDieSymbolBody(face: DiceFace, color: DiceColor, rotate90: Bool = false) -> String {
    let colors = DiceRendering.colors(color)
    let radius = jsNumber(DIE_SIZE * DiceRendering.dotRadiusFactor)
    let strokeWidth = jsNumber(DIE_SIZE * DiceRendering.borderWidthFactor)
    let cornerRadius = jsNumber(DIE_SIZE * DiceRendering.cornerRadiusFactor)

    let open = rotate90 ? "<g transform='rotate(90 \(jsNumber(DIE_SIZE / 2)) \(jsNumber(DIE_SIZE / 2)))'>" : "<g>"
    let rect = "<rect width='100%' height='100%' fill='\(colors.background)' stroke-width='\(strokeWidth)%' rx='\(cornerRadius)%' stroke='\(DiceRendering.stroke)' />"
    let dots = dotPositions(face: face, size: DIE_SIZE)
        .map { "<circle cx='\(jsNumber($0.x))%' cy='\(jsNumber($0.y))%' r='\(radius)%' fill='\(colors.dot)' />" }
        .joined()
    return "\(open)\(rect)\(dots)</g>"
}

/// `<defs>` with one `<symbol id='dice-{color}-{face}'>` per die; `renderWindowSvg` references them via `<use>`.
public func renderDefs() -> String {
    var symbols: [String] = []
    for color in [DiceColor.black, .white] {
        for face in 1...6 {
            symbols.append("<symbol id='\(symbolId(color: color, face: face))' viewBox='0 0 \(jsNumber(DIE_SIZE)) \(jsNumber(DIE_SIZE))'>\(renderDieSymbolBody(face: face, color: color))</symbol>")
        }
    }
    return "<defs>\(symbols.joined())</defs>"
}

/// One die as a nested `<svg>` at cell (x, svgY).
private func renderDieElement(_ grid: DiceGrid, x: Int, y: Int) -> String {
    let die = grid.rows[y][x]
    let body = renderDieSymbolBody(face: die.face, color: die.color, rotate90: die.rotate90)
    return "<svg x='\(x)' y='\(svgRow(y, height: grid.height))' width='1' height='1' viewBox='0 0 \(jsNumber(DIE_SIZE)) \(jsNumber(DIE_SIZE))'>\(body)</svg>"
}

/// Dice inside `win` (inclusive, clamped to the grid; rows are SVG rows) as `<use>` references, preceded by
/// `renderDefs()`. Meant to be injected inside the viewer's own `<svg>`.
public func renderWindowSvg(_ grid: DiceGrid, window win: CellWindow) -> String {
    let x0 = max(0, win.x0)
    let x1 = min(grid.width - 1, win.x1)
    let y0 = max(0, win.y0)
    let y1 = min(grid.height - 1, win.y1)
    var uses: [String] = []
    if x0 <= x1 && y0 <= y1 {
        for x in x0...x1 {
            for svgY in y0...y1 {
                let die = grid.rows[svgRow(svgY, height: grid.height)][x]
                let rotation = die.rotate90 ? " transform='rotate(90 \(jsNumber(Double(x) + 0.5)) \(jsNumber(Double(svgY) + 0.5)))'" : ""
                uses.append("<use href='#\(symbolId(color: die.color, face: die.face))' x='\(x)' y='\(svgY)' width='1' height='1'\(rotation)/>")
            }
        }
    }
    return "\(renderDefs())\(uses.joined())"
}

public struct SvgSize: Equatable, Sendable {
    public var width: Int
    public var height: Int

    public init(width: Int, height: Int) {
        self.width = width
        self.height = height
    }
}

/// Standalone `<svg>` wrapper. With a size the header carries width/height (rasterizing); otherwise it fills its box.
private func wrapSvg(cols: Int, rows: Int, background: String, size: SvgSize?, body: String) -> String {
    let sizing = size.map { "width=\"\($0.width)\" height=\"\($0.height)\"" }
        ?? "style=\"width: 100%; height: 100%; image-rendering: crisp-edges; background-color: \(background);\""
    return "<svg xmlns=\"\(SVG_XMLNS)\" viewBox=\"0 0 \(cols) \(rows)\" preserveAspectRatio=\"xMidYMid meet\" \(sizing)>\n<rect width=\"\(cols)\" height=\"\(rows)\" fill=\"\(background)\" />\n\(body)\n</svg>"
}

/// The whole grid as a standalone SVG document (blueprint download, raster preview).
public func renderGridSvg(_ grid: DiceGrid, size: SvgSize? = nil, background: String = "#000000") -> String {
    var elements: [String] = []
    elements.reserveCapacity(grid.width * grid.height)
    for x in 0..<grid.width {
        for y in 0..<grid.height {
            elements.append(renderDieElement(grid, x: x, y: y))
        }
    }
    return wrapSvg(cols: grid.width, rows: grid.height, background: background, size: size, body: elements.joined(separator: "\n"))
}

/// The grid with the dice placed before `progress` drawn normally; the rest at `ProgressStyle.unbuiltOpacity`.
public func renderProgressSvg(_ grid: DiceGrid, progress: GridPos, size: SvgSize? = nil, background: String = ProgressStyle.background, showAll: Bool = false) -> String {
    var elements: [String] = []
    for x in 0..<grid.width {
        for y in 0..<grid.height {
            let die = renderDieElement(grid, x: x, y: y)
            elements.append(showAll || isCompleted(GridPos(x: x, y: y), progress: progress) ? die : "<g opacity='\(jsNumber(ProgressStyle.unbuiltOpacity))'>\(die)</g>")
        }
    }
    return wrapSvg(cols: grid.width, rows: grid.height, background: background, size: size, body: elements.joined(separator: "\n"))
}

/// Number of dice `renderProgressSvg` draws for `progress`.
public func placedDiceCount(_ grid: DiceGrid, progress: GridPos) -> Int {
    min(grid.width * grid.height, countCompleted(progress, width: grid.width))
}

/// Raster dimensions with `longSide` pixels on the longer axis, preserving the grid's aspect ratio.
public func rasterSize(cols: Int, rows: Int, longSide: Int) -> SvgSize {
    if cols >= rows {
        return SvgSize(width: longSide, height: jsRoundInt(Double(longSide) * (Double(rows) / Double(cols))))
    }
    return SvgSize(width: jsRoundInt(Double(longSide) * (Double(cols) / Double(rows))), height: longSide)
}
