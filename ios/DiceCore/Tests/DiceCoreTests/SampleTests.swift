import Foundation
import Testing
@testable import DiceCore

private func grayPixels(_ width: Int, _ height: Int, alpha: UInt8 = 255, gray: (Int, Int) -> UInt8) -> Pixels {
    var data = [UInt8](repeating: 0, count: width * height * 4)
    for y in 0..<height {
        for x in 0..<width {
            let p = (y * width + x) * 4
            let g = gray(x, y)
            data[p] = g; data[p + 1] = g; data[p + 2] = g; data[p + 3] = alpha
        }
    }
    return Pixels(data: data, width: width, height: height)
}

private func close(_ a: Double, _ b: Double, _ digits: Int = 4) -> Bool { abs(a - b) < pow(10, -Double(digits)) / 2 }

@Suite struct SampleTests {
    @Test func toGrayImageKeepsLayoutAndIgnoresAlpha() {
        let px = grayPixels(2, 2, alpha: 0) { x, y in UInt8((y * 2 + x) * 50) }
        #expect(toGrayImage(px) == [0, 50, 100, 150])
        let red = Pixels(data: [255, 0, 0, 255], width: 1, height: 1)
        #expect(close(Double(toGrayImage(red)[0]), 76.245))
    }

    @Test func axisWeightsSumToSizeOverN() {
        for (size, n) in [(6, 3), (10, 3), (7, 5), (2, 3), (256, 30)] {
            let cells = axisWeights(size: size, n: n)
            #expect(cells.count == n)
            for cell in cells {
                #expect(cell.first >= 0 && cell.first + cell.weights.count <= size)
                #expect(cell.weights.allSatisfy { $0 > 0 && $0 <= 1 })
                #expect(close(cell.weights.reduce(0, +), Double(size) / Double(n), 12))
            }
            for i in 1..<n {
                let prevEnd = cells[i - 1].first + cells[i - 1].weights.count
                #expect(cells[i].first == prevEnd || cells[i].first == prevEnd - 1)
            }
        }
    }

    @Test func axisWeightsAnalytic() {
        #expect(axisWeights(size: 3, n: 2) == [AxisCoverage(first: 0, weights: [1, 0.5]), AxisCoverage(first: 1, weights: [0.5, 1])])
        let up = axisWeights(size: 2, n: 3)
        #expect(up[0].first == 0 && close(up[0].weights[0], 2.0 / 3, 12))
        #expect(up[1].weights.count == 2 && close(up[1].weights[0], 1.0 / 3, 12) && close(up[1].weights[1], 1.0 / 3, 12))
        #expect(up[2].first == 1 && up[2].weights.count == 1 && close(up[2].weights[0], 2.0 / 3, 12))
    }

    @Test func downsample() {
        let constant = [Float](repeating: 77.5, count: 7 * 5)
        let out = DiceCore.downsample(constant, width: 7, height: 5, cols: 3, rows: 2)
        #expect(out.count == 6 && out.allSatisfy { close(Double($0), 77.5) })
        #expect(DiceCore.downsample([0, 200, 200, 0], width: 2, height: 2, cols: 1, rows: 1)[0] == 100)
        let blocks = (0..<16).map { Float(10 * ($0 / 4) + ($0 % 4)) }
        #expect(DiceCore.downsample(blocks, width: 4, height: 4, cols: 2, rows: 2) == [5.5, 7.5, 25.5, 27.5])
        let partial = DiceCore.downsample([0, 100, 200], width: 3, height: 1, cols: 2, rows: 1)
        #expect(close(Double(partial[0]), 100.0 / 3) && close(Double(partial[1]), 500.0 / 3))
    }

    @Test func sharpenRules() {
        let w = 5, h = 4
        let img = (0..<(w * h)).map { Float(($0 * 37) % 256) }
        #expect(sharpen(img, width: w, height: h, strength: 0) == img)
        let out = sharpen(img, width: w, height: h, strength: 100)
        for y in 0..<h {
            for x in 0..<w where x == 0 || y == 0 || x == w - 1 || y == h - 1 {
                #expect(out[y * w + x] == img[y * w + x])
            }
        }
        let gray: [Float] = [255, 10, 255, 20, 100, 30, 255, 40, 255]
        let f = 0.5
        #expect(close(Double(sharpen(gray, width: 3, height: 3, strength: 50)[4]), 100 * (4 * f + 1) - f * (10 + 20 + 30 + 40)))
        #expect(sharpen([0, 0, 0, 0, 250, 0, 0, 0, 0], width: 3, height: 3, strength: 100)[4] == 255)
        #expect(sharpen([255, 255, 255, 255, 5, 255, 255, 255, 255], width: 3, height: 3, strength: 100)[4] == 0)
    }
}
