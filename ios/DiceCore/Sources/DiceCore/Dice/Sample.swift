// Image sampling (core/dice/sample.ts): grayscale conversion, exact area-average downsampling, sharpening.
// Every stage returns a new `[Float]` (Float32Array: row-major, top row first); arithmetic happens in Double and each
// stage's result is stored as Float, exactly like the web engine.

/// Luminance per pixel. Alpha is ignored.
public func toGrayImage(_ px: Pixels) -> [Float] {
    var out = [Float](repeating: 0, count: px.width * px.height)
    px.data.withUnsafeBufferPointer { data in
        var p = 0
        for i in 0..<out.count {
            out[i] = Float(toGray(Double(data[p]), Double(data[p + 1]), Double(data[p + 2])))
            p += 4
        }
    }
    return out
}

public struct AxisCoverage: Equatable, Sendable {
    /// Index of the first source pixel the cell touches.
    public let first: Int
    /// Coverage of each consecutive source pixel from `first`, in [0, 1]; sums to `size / n`.
    public let weights: [Double]
}

/// Cell `i` of `n` along an axis of `size` pixels covers `[i * size / n, (i + 1) * size / n)`.
public func axisWeights(size: Int, n: Int) -> [AxisCoverage] {
    var cells: [AxisCoverage] = []
    cells.reserveCapacity(n)
    for i in 0..<n {
        let start = Double(i * size) / Double(n)
        let end = Double((i + 1) * size) / Double(n)
        let first = Int(start.rounded(.down))
        var weights: [Double] = []
        var p = first
        while Double(p) < end && p < size {
            weights.append(min(Double(p + 1), end) - max(Double(p), start))
            p += 1
        }
        cells.append(AxisCoverage(first: first, weights: weights))
    }
    return cells
}

/// Exact area average of `gray` (width × height) into cols × rows cells. Per cell: rows are summed top→bottom, each
/// row's pixels left→right (`rowSum += g * wx`), `total += rowSum * wy`; result = total / ((width / cols) * (height / rows)).
public func downsample(_ gray: [Float], width: Int, height: Int, cols: Int, rows: Int) -> [Float] {
    let xs = axisWeights(size: width, n: cols)
    let ys = axisWeights(size: height, n: rows)
    let cellArea = (Double(width) / Double(cols)) * (Double(height) / Double(rows))
    var out = [Float](repeating: 0, count: cols * rows)
    gray.withUnsafeBufferPointer { g in
        for cy in 0..<rows {
            let y0 = ys[cy].first
            let wy = ys[cy].weights
            for cx in 0..<cols {
                let x0 = xs[cx].first
                let wx = xs[cx].weights
                var total = 0.0
                for j in 0..<wy.count {
                    let rowOffset = (y0 + j) * width + x0
                    var rowSum = 0.0
                    for i in 0..<wx.count {
                        rowSum += Double(g[rowOffset + i]) * wx[i]
                    }
                    total += rowSum * wy[j]
                }
                out[cy * cols + cx] = Float(total / cellArea)
            }
        }
    }
    return out
}

/// 3×3 sharpening: kernel [0,-f,0; -f,4f+1,-f; 0,-f,0] with f = strength / 100, summed in kernel order (row by row,
/// left to right, including the zero corners). The 1-pixel border is copied unchanged. Output clamped to 0...255.
public func sharpen(_ gray: [Float], width: Int, height: Int, strength: Double) -> [Float] {
    var out = gray
    let f = strength / 100
    let kernel: [[Double]] = [
        [0, -f, 0],
        [-f, 4 * f + 1, -f],
        [0, -f, 0],
    ]
    guard width > 2, height > 2 else { return out }
    gray.withUnsafeBufferPointer { g in
        for y in 1..<(height - 1) {
            for x in 1..<(width - 1) {
                var sum = 0.0
                for ky in -1...1 {
                    for kx in -1...1 {
                        sum += Double(g[(y + ky) * width + (x + kx)]) * kernel[ky + 1][kx + 1]
                    }
                }
                out[y * width + x] = Float(max(0, min(255, sum)))
            }
        }
    }
    return out
}
