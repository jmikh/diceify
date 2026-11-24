// The design paywall (core/billing/design.ts): dice settings a plan does not include. Any design can be tuned,
// previewed and built; one that uses a locked setting is watermarked in the previews until the user upgrades. (The
// blueprint is Pro on its own: `hasSvgExport`.)

/// A setting of the design that the plan does not include.
public enum DesignLock: String, Sendable, CaseIterable {
    case mixedDice = "mixed_dice"
    case rows
}

/// The design's locked settings, in display order; empty = the plan covers the whole design (no watermark).
public func designLocks(hasMixedDice: Bool, designRowLimit: Int?, colorMode: ColorMode, numRows: Int) -> [DesignLock] {
    var locks: [DesignLock] = []
    if colorMode == .both && !hasMixedDice { locks.append(.mixedDice) }
    if let limit = designRowLimit, numRows > limit { locks.append(.rows) }
    return locks
}

public func designLocks(_ ent: Entitlements, _ dice: DiceParams) -> [DesignLock] {
    designLocks(hasMixedDice: ent.hasMixedDice, designRowLimit: ent.designRowLimit, colorMode: dice.colorMode, numRows: dice.numRows)
}
