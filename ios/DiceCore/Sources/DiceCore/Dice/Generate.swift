// Pixels → DiceGrid (core/dice/generate.ts): the orchestration of Sample.swift and Mapping.swift.

/// Rows are fixed by `numRows`; columns follow the image aspect ratio (at least 1). The aspect ratio is computed
/// first, then multiplied — the order the fixtures pin.
public func computeGridSize(imageWidth: Int, imageHeight: Int, numRows: Int) -> (cols: Int, rows: Int) {
    let aspectRatio = Double(imageWidth) / Double(imageHeight)
    return (max(1, jsRoundInt(Double(numRows) * aspectRatio)), numRows)
}

public func generateDiceGrid(_ px: Pixels, params: DiceParams) -> DiceGrid {
    let (cols, rows) = computeGridSize(imageWidth: px.width, imageHeight: px.height, numRows: params.numRows)
    var small = downsample(toGrayImage(px), width: px.width, height: px.height, cols: cols, rows: rows)
    if params.edgeSharpening > 0 { small = sharpen(small, width: cols, height: rows, strength: params.edgeSharpening) }

    var grid = [[Die]](repeating: [], count: rows)
    for r in 0..<rows {
        var row: [Die] = []
        row.reserveCapacity(cols)
        for x in 0..<cols { row.append(mapGrayToDie(Double(small[r * cols + x]), params: params)) }
        grid[rows - 1 - r] = row // pixel row 0 is the top of the image; grid row 0 is the bottom
    }
    return DiceGrid(width: cols, height: rows, rows: grid)
}
