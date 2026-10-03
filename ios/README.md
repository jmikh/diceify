# Diceify for iOS

Native SwiftUI app plus the `DiceCore` Swift package. Plan and decisions: `plans/ios/ios-app-plan.md`; one doc per
step in `plans/ios/ios-step-<N>.md`.

```
ios/
  DiceCore/        Swift package: port of ../core — Sources/DiceCore/{JSMath, Dice/*, Billing/*, Share/*}
                   tests read ../../core/dice/__fixtures__ by path — `cd ios/DiceCore && swift test` (see Requirements)
                   module map: plans/ios/ios-step-2.md
  Diceify/         (step 3) the app
```

## Requirements

- Xcode 26.6 (installed). Point the command line at it once:
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer && sudo xcodebuild -license accept`,
  then Xcode → Settings → Components → install the iOS platform (simulators).
- The Command Line Tools toolchain has neither XCTest nor Swift Testing, so `swift test` needs Xcode's toolchain:
  either `xcode-select` as above, or per command `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer swift test`
  (no sudo needed). DiceCore tests use Swift Testing (`import Testing`).

## Rules

- `DiceCore` imports nothing but Foundation; the spec is `core/README.md` and the TypeScript side owns it. A change to
  the algorithm = regenerate the fixtures on the web side (`npm run gen-fixtures`) = port the change here; the Swift
  tests fail until both agree.
- Rounding goes through `jsRound` (JavaScript's `Math.round`), gray stages are stored as `Float` and computed in
  `Double`, grid rows are `rows[y][x]` with y = 0 the bottom row.
- The web ships a document schema version before any iOS build writes it.
