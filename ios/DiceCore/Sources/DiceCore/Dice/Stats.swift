// core/dice/stats.ts

public func computeStats(_ grid: DiceGrid) -> DiceStats {
    var black = 0
    var white = 0
    for row in grid.rows {
        for die in row {
            if die.color == .black { black += 1 } else { white += 1 }
        }
    }
    return DiceStats(blackCount: black, whiteCount: white, totalCount: black + white)
}
