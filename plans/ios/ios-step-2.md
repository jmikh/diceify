# iOS step 2 — `DiceCore` Swift package

Plan: `plans/ios/ios-app-plan.md` § 9 step 2. Done 2026-10-03. The web's `core/` ported to Swift, pinned to the same
golden fixtures and the same frozen SVG snapshot, so a grid, a blueprint or a document produced on the phone equals the
web's.

## Layout (`ios/DiceCore`, SwiftPM, tools 6.0, Foundation only)

| Swift | Port of | Notes |
|---|---|---|
| `JSMath.swift` | — | `jsRound` (JS `Math.round`), `jsNumber` (JS number → string for SVG), `parseISODate` / `isoString` (`Date.parse` / `toISOString`). |
| `Dice/Types.swift` | `types.ts` | `Die.rotate90` is a plain `Bool` (the TS key is absent when false; the encoder emits `r` only when true). |
| `Dice/Geometry.swift` | `geometry.ts` | `DiceRendering` constants + `dotPositions`, shared with the app's Core Graphics die images. |
| `Dice/Mapping.swift` | `mapping.ts` | gamma (`Foundation.pow`), contrast, `THRESHOLDS`, `mapGrayToDie`. |
| `Dice/Sample.swift` | `sample.ts` | gray stages as `[Float]`, arithmetic in `Double`, kernel order as the spec. |
| `Dice/Generate.swift`, `Stats.swift` | `generate.ts`, `stats.ts` | aspect ratio first, then `jsRound`. |
| `Dice/Build.swift` | `build.ts` | build order, runs, stepping, milestones, `computeViewBox`, windows. |
| `Dice/Encoding.swift` | `encoding.ts` | fixture/document row format, same error messages. |
| `Dice/SVG.swift` | `svg.ts` | byte-identical output (`svg-3x2.svg` pins it): blueprint export and progress preview. |
| `Dice/Document.swift` | `document.ts` + `document.schema.ts` | v2 `ProjectDocument`; strict parse over `JSONSerialization` (unknown keys, ranges, integer-ness, real booleans); v1 → v2 migration; unsupported versions refused; `jsonObject`/`jsonData` (sorted keys); `decodeStoredGrid`, `documentStats`, `cropParamsEqual`, `gridInputsEqual`/`progressApplies`, `nearestAspectRatio`, `reframeCrop`, `scaleCrop`. No legacy-draft path (the app only reads rows with a `schemaVersion`). |
| `Billing/Plans.swift`, `Entitlements.swift` | `plans.ts`, `entitlements.ts` | incl. the Apple source and `source` (step 1). |
| `Share/Ids.swift`, `Urls.swift`, `Copy.swift`, `Card.swift` | `core/share` | `encodeURIComponent` semantics, `en-US` dice count. `meta.ts` is Worker-only, not ported. |

Tests (`Tests/DiceCoreTests`, Swift Testing, 52 tests): every `core/dice/__fixtures__/*.json` exact (`GenerateTests`),
`svg-3x2.svg` exact, and ports of the TS unit tests (sample, mapping, geometry/stats, build incl. the viewBox cases,
encoding, document validation/migration/helpers, the exhaustive entitlement table + Apple cases, share).

Run: `cd ios/DiceCore && DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer swift test` (or plain `swift test`
once `xcode-select` points at Xcode).

## Findings while porting
- JSON booleans vs numbers: Foundation bridges `NSNumber(1)` to `Bool`, so strictness needs the `CFBoolean` type id
  check (`isBoolean` in Document.swift); without it `gamma: 1` was rejected.
- `#expect` comments must be literals/interpolations (`Comment(rawValue:)` for a variable).
- The two `tuned` fixtures (gamma 1.3, contrast 40, sharpening 60) pass, so `Foundation.pow` agrees with V8's for the
  values that matter; keep both fixtures when regenerating.

## Verification
- `swift build` clean, `swift test` 52/52 green. Web gates unaffected (no web files changed in this step).
