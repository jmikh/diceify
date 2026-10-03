// Brightness → die mapping (core/dice/mapping.ts). Formulas and tables: core/README.md.

import Foundation

@inlinable
public func toGray(_ r: Double, _ g: Double, _ b: Double) -> Double {
    0.299 * r + 0.587 * g + 0.114 * b
}

public func applyGamma(_ gray: Double, gamma: Double) -> Double {
    gamma == 1 ? gray : 255 * pow(gray / 255, 1 / gamma)
}

public func applyContrast(_ gray: Double, contrast: Double) -> Double {
    if contrast <= 0 { return gray }
    let adjusted = 128 + (gray - 128) * (1 + contrast / 100)
    return max(0, min(255, adjusted))
}

public struct ThresholdStep: Sendable, Equatable {
    /// Inclusive lower bound of the brightness range that maps to this die.
    public let min: Double
    public let face: DiceFace
    public let color: DiceColor
}

/// Per mode, steps in descending `min` order; the last step is the catch-all (min 0).
/// Values are the ones the app has always shipped — change only together with the fixtures.
public let THRESHOLDS: [ColorMode: [ThresholdStep]] = [
    .both: [
        ThresholdStep(min: 217, face: 1, color: .white),
        ThresholdStep(min: 192, face: 2, color: .white),
        ThresholdStep(min: 166, face: 3, color: .white),
        ThresholdStep(min: 141, face: 4, color: .white),
        ThresholdStep(min: 115, face: 5, color: .white),
        ThresholdStep(min: 90, face: 6, color: .white),
        ThresholdStep(min: 64, face: 6, color: .black),
        ThresholdStep(min: 51, face: 5, color: .black),
        ThresholdStep(min: 39, face: 4, color: .black),
        ThresholdStep(min: 26, face: 3, color: .black),
        ThresholdStep(min: 13, face: 2, color: .black),
        ThresholdStep(min: 0, face: 1, color: .black),
    ],
    .black: [
        ThresholdStep(min: 141, face: 6, color: .black),
        ThresholdStep(min: 115, face: 5, color: .black),
        ThresholdStep(min: 90, face: 4, color: .black),
        ThresholdStep(min: 64, face: 3, color: .black),
        ThresholdStep(min: 39, face: 2, color: .black),
        ThresholdStep(min: 0, face: 1, color: .black),
    ],
    .white: [
        ThresholdStep(min: 255.0 * 5 / 6, face: 1, color: .white), // 212.5
        ThresholdStep(min: 255.0 * 4 / 6, face: 2, color: .white), // 170
        ThresholdStep(min: 255.0 * 3 / 6, face: 3, color: .white), // 127.5
        ThresholdStep(min: 255.0 * 2 / 6, face: 4, color: .white), // 85
        ThresholdStep(min: 255.0 * 1 / 6, face: 5, color: .white), // 42.5
        ThresholdStep(min: 0, face: 6, color: .white),
    ],
]

public func mapBrightnessToDie(_ brightness: Double, mode: ColorMode) -> (face: DiceFace, color: DiceColor) {
    let steps = THRESHOLDS[mode]!
    for step in steps.dropLast() where brightness >= step.min {
        return (step.face, step.color)
    }
    let last = steps[steps.count - 1]
    return (last.face, last.color)
}

public func shouldRotate(face: DiceFace, params: DiceParams) -> Bool {
    (params.rotate6 && face == 6) || (params.rotate3 && face == 3) || (params.rotate2 && face == 2)
}

/// The per-cell pipeline: gamma → contrast → threshold → rotation flag.
public func mapGrayToDie(_ gray: Double, params: DiceParams) -> Die {
    let brightness = applyContrast(applyGamma(gray, gamma: params.gamma), contrast: params.contrast)
    let (face, color) = mapBrightnessToDie(brightness, mode: params.colorMode)
    return Die(face: face, color: color, rotate90: shouldRotate(face: face, params: params))
}
