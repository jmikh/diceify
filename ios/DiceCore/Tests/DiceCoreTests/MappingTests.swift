import Foundation
import Testing
@testable import DiceCore

private func close(_ a: Double, _ b: Double, _ digits: Int = 10) -> Bool { abs(a - b) < pow(10, -Double(digits)) / 2 }

@Suite struct MappingTests {
    @Test func grayWeights() {
        #expect(close(toGray(255, 255, 255), 255))
        #expect(toGray(0, 0, 0) == 0)
        #expect(close(toGray(255, 0, 0), 76.245) && close(toGray(0, 255, 0), 149.685) && close(toGray(0, 0, 255), 29.07))
    }

    @Test func gamma() {
        #expect(applyGamma(100.123, gamma: 1) == 100.123)
        #expect(applyGamma(0, gamma: 1.3) == 0 && applyGamma(255, gamma: 1.3) == 255)
        #expect(close(applyGamma(64, gamma: 2), 255 * (64.0 / 255).squareRoot()))
        #expect(applyGamma(64, gamma: 2) > 64)
    }

    @Test func contrast() {
        #expect(applyContrast(200.5, contrast: 0) == 200.5 && applyContrast(200.5, contrast: -50) == 200.5)
        #expect(applyContrast(128, contrast: 40) == 128)
        #expect(close(applyContrast(200, contrast: 40), 128 + 72 * 1.4) && close(applyContrast(78, contrast: 40), 128 - 50 * 1.4))
        #expect(applyContrast(250, contrast: 100) == 255 && applyContrast(5, contrast: 100) == 0)
    }

    @Test func thresholdTables() {
        #expect(THRESHOLDS[.both]!.map(\.min) == [217, 192, 166, 141, 115, 90, 64, 51, 39, 26, 13, 0])
        #expect(THRESHOLDS[.both]!.map { "\($0.color == .black ? "b" : "w")\($0.face)" } == ["w1", "w2", "w3", "w4", "w5", "w6", "b6", "b5", "b4", "b3", "b2", "b1"])
        #expect(THRESHOLDS[.black]!.map(\.min) == [141, 115, 90, 64, 39, 0] && THRESHOLDS[.black]!.map(\.face) == [6, 5, 4, 3, 2, 1])
        #expect(THRESHOLDS[.white]!.map(\.min) == [212.5, 170, 127.5, 85, 42.5, 0] && THRESHOLDS[.white]!.map(\.face) == [1, 2, 3, 4, 5, 6])
    }

    @Test func boundaries() {
        for mode in ColorMode.allCases {
            let steps = THRESHOLDS[mode]!
            for i in 0..<(steps.count - 1) {
                let upper = steps[i], lower = steps[i + 1]
                let at = mapBrightnessToDie(upper.min, mode: mode)
                let above = mapBrightnessToDie(upper.min + 1, mode: mode)
                let below = mapBrightnessToDie(upper.min - 1, mode: mode)
                #expect(at.face == upper.face && at.color == upper.color, "\(mode) \(upper.min)")
                #expect(above.face == upper.face && above.color == upper.color)
                #expect(below.face == lower.face && below.color == lower.color)
            }
            #expect(mapBrightnessToDie(255, mode: mode).face == steps[0].face)
            #expect(mapBrightnessToDie(0, mode: mode).face == steps.last!.face)
        }
        #expect(mapBrightnessToDie(128, mode: .both) == (5, .white))
        #expect(mapBrightnessToDie(89.9, mode: .both) == (6, .black))
        #expect(mapBrightnessToDie(140, mode: .black) == (5, .black))
        #expect(mapBrightnessToDie(212.4, mode: .white) == (2, .white))
        #expect(mapBrightnessToDie(42.5, mode: .white) == (5, .white))
    }

    @Test func rotation() {
        for face in 1...6 { #expect(!shouldRotate(face: face, params: .default)) }
        for (flag, target) in [("rotate6", 6), ("rotate3", 3), ("rotate2", 2)] {
            var params = DiceParams.default
            switch flag {
            case "rotate6": params.rotate6 = true
            case "rotate3": params.rotate3 = true
            default: params.rotate2 = true
            }
            for face in 1...6 { #expect(shouldRotate(face: face, params: params) == (face == target)) }
        }
    }

    @Test func grayToDie() {
        var params = DiceParams.default
        params.gamma = 2
        params.contrast = 40
        #expect(mapGrayToDie(100, params: params) == Die(face: 3, color: .white)) // 100 → 159.69 → 172.37 → white 3
        var rot = DiceParams.default
        rot.contrast = 0
        rot.rotate6 = true
        #expect(mapGrayToDie(70, params: rot) == Die(face: 6, color: .black, rotate90: true))
        #expect(mapGrayToDie(30, params: rot) == Die(face: 3, color: .black))
    }
}

@Suite struct GeometryAndStatsTests {
    @Test func dots() {
        for face in 1...6 {
            let dots = dotPositions(face: face, size: 100)
            #expect(dots.count == face)
            #expect(dots.allSatisfy { $0.x >= 0 && $0.x <= 100 && $0.y >= 0 && $0.y <= 100 })
        }
        let small = dotPositions(face: 6, size: 10), large = dotPositions(face: 6, size: 100)
        for (s, l) in zip(small, large) { #expect(abs(l.x - s.x * 10) < 1e-9 && abs(l.y - s.y * 10) < 1e-9) }
    }

    @Test func stats() {
        let grid = DiceGrid(width: 3, height: 2, rows: [
            [Die(face: 1, color: .black), Die(face: 6, color: .white, rotate90: true), Die(face: 3, color: .white)],
            [Die(face: 2, color: .black), Die(face: 2, color: .black), Die(face: 5, color: .white)],
        ])
        #expect(computeStats(grid) == DiceStats(blackCount: 3, whiteCount: 3, totalCount: 6))
        #expect(computeStats(DiceGrid(width: 0, height: 0, rows: [])) == .empty)
    }
}
