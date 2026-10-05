# Diceify for iOS

Native SwiftUI app plus the `DiceCore` Swift package. Plan and decisions: `plans/ios/ios-app-plan.md`; one doc per
step in `plans/ios/ios-step-<N>.md`.

```
ios/
  DiceCore/        Swift package: port of ../core — Sources/DiceCore/{JSMath, Dice/*, Billing/*, Share/*}
                   tests read ../../core/dice/__fixtures__ by path — `cd ios/DiceCore && swift test` (see Requirements)
                   module map: plans/ios/ios-step-2.md
  Diceify/         the app (SwiftUI, iOS 18+): App/, Theme/, Services/ (Supabase, session, images, dice renderer,
                   share, edge functions, Analytics = the only PostHog importer, ErrorReporting = the only Sentry importer),
                   Persistence/, Models/, Features/{Start,Account,Share,Editor/{Crop,Tune,Build}}, Resources/, Config/
  DiceifyTests/    app unit + local-stack integration tests
  project.yml      XcodeGen spec → `xcodegen` writes Diceify.xcodeproj (ignored)
```

## Build, run, test from the terminal

```
cd ios && xcodegen                                    # after adding/removing files
xcodebuild -scheme Diceify -destination 'platform=iOS Simulator,name=iPhone 17' build
xcodebuild -scheme Diceify -destination 'platform=iOS Simulator,name=iPhone 17' test   # needs npm run db:start
xcrun simctl launch booted art.diceify.app --ui-signin          # DEBUG launch args: --ui-signin,
                                                                # --ui-import <file in Documents>, --ui-open <uuid>,
                                                                # --ui-step <crop|tune|build> (with --ui-open),
                                                                # --ui-share (with --ui-open, signed in), --ui-account,
                                                                # --ui-login <email> <password> (local password user),
                                                                # --ui-paywall (with --ui-account), --ui-fake-store
                                                                # (paywall without RevenueCat), --ui-buy <studio_monthly|
                                                                # studio_yearly> (with --ui-paywall)
```

Debug builds talk to the LOCAL Supabase stack (`Diceify/Config/Debug.xcconfig`) and send no analytics or error
reports; Release to the hosted project (`Release.xcconfig`: anon key to fill, PostHog key, optional Sentry DSN —
`docs/DEPLOY.md`). In Xcode: open `Diceify.xcodeproj`, pick the Diceify scheme, run.

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
