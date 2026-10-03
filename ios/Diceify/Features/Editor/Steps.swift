import DiceCore

/// The editor's step machine (features/editor/steps.ts): pure rules; `EditorModel` applies them.
/// Uploading is not a step: a photo starts a project (Start screen), which then goes crop → tune → build.
enum Steps {
    static let all: [DocumentStep] = [.crop, .tune, .build]

    static func label(_ step: DocumentStep) -> String {
        switch step {
        case .crop: "Crop"
        case .tune: "Tune"
        case .build: "Build"
        }
    }

    static func index(_ step: DocumentStep) -> Int { all.firstIndex(of: step)! }

    static func next(_ step: DocumentStep) -> DocumentStep? {
        let i = index(step) + 1
        return i < all.count ? all[i] : nil
    }

    static func prev(_ step: DocumentStep) -> DocumentStep? {
        let i = index(step) - 1
        return i >= 0 ? all[i] : nil
    }

    /// May the user leave `step` forwards? (crop needs a crop; tune always; build has no next.)
    static func canAdvance(_ step: DocumentStep, hasCrop: Bool) -> Bool {
        switch step {
        case .crop: hasCrop
        case .tune: true
        case .build: false
        }
    }

    /// May the user jump straight to `step`? Crop always; tune and build once a crop exists.
    static func canEnter(_ step: DocumentStep, hasCrop: Bool) -> Bool {
        step == .crop || hasCrop
    }

    /// Leaving the build step with progress needs a confirmation (the progress may be reset by a parameter change).
    static func needsResetConfirm(from: DocumentStep, to: DocumentStep, progress: GridPos) -> Bool {
        from == .build && to != .build && (progress.x != 0 || progress.y != 0)
    }
}
