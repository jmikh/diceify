# iOS step 5 — Share, account, analytics, errors (+ build viewer polish)

Plan: `plans/ios/ios-app-plan.md` § 9 step 5. Done 2026-10-03 (uncommitted), except the TestFlight upload, which needs
the user's Apple ID in Xcode (below).

## What exists (`ios/Diceify`)

- **Share** (`Services/ShareService.swift`, `Features/Share/ShareSheet.swift`): `ShareCardRenderer` draws the 1200 × 630
  social card with UIKit from DiceCore's `shareCardLayout` — near-black background, pink/purple glows, the art flush
  left (the same die geometry as the web's SVG), the logo asset, the dice count in Syne shrunk to fit, grid size, call
  to action, `diceify.art` — and encodes a JPEG. `ShareService.create` = the `shares` row first, then
  `share-images/<id>.jpg` (cache-control one year, no upsert), like `lib/supabase/shares.ts`. `ShareFlow` keeps one
  prepared share per grid (reopening the sheet reuses the link; a failure is not cached). `ShareSheet`: the card, the
  link + Copy link (`utm_source=copy_link`), More options = the system share sheet with the post text and the link
  (`share_sheet`). The header's share button (tune/build) is gated on sign-in (`GatedFeature.share`). Events
  `share_create`, `share`. No X/Facebook buttons: the system share sheet covers them on iOS.
- **Account** (`Features/Account/AccountScreen.swift`, pushed from the Start screen's person icon): signed-in email,
  plan card (`PlanCopy.displayName` / `statusLine` — Apple plans point at Settings → Subscriptions, web-bought plans
  say so without a link: App Store 3.1.1), refresh (refetches the profile), "See plans" for Explorer (opens the
  `UpgradeSheet` placeholder; step 6 makes it the paywall), sign out (clears the cloud cache), delete account
  (confirmation alert → `account/delete` → sign out → cache cleared → back to Start).
- **Edge functions** (`Services/Functions.swift`): `EdgeFunctions.invoke(fn, route)` + `FunctionError` from the
  `{ error: { code, message } }` envelope (`lib/supabase/functions.ts`); `AccountService.deleteAccount()`. Step 6's
  `billing/apple-sync` call goes through the same helper.
- **Analytics** (`Services/Analytics.swift`, posthog-ios 3.89): the one PostHog importer. `AnalyticsEvent` mirrors the
  web catalog (`editor_opened`, `photo_uploaded`, `crop_completed`, `tune_completed`, `build_started`,
  `build_progress`, `blueprint_downloaded`, `paywall_shown`, `click_upgrade`, `share_create`, `share`), every event
  registered with `platform: "ios"` + `app_version`; screens `start`, `editor`, `account`, `share` via `$screen`;
  `identify(user id, plan)` on sign-in, `reset()` on sign-out; autocapture, screen autocapture and session replay off;
  `personProfiles = identifiedOnly`. The model fires the step/build events where the web does
  (`features/editor/analytics.ts`); `AppSession.gate` reports `paywall_shown`. Without a key nothing is sent.
- **Errors** (`Services/ErrorReporting.swift`, sentry-cocoa 9.30): `reportError(_:where:)` = Sentry capture with a
  `where` tag when a DSN is set, always the unified log; `setUser(id)` on sign-in/out; no automatic PII.
- **Config**: `POSTHOG_KEY` / `POSTHOG_HOST` / `SENTRY_DSN` in `Config/*.xcconfig` → Info.plist → `AppConfig`. Debug
  leaves them empty (the simulator sends nothing); Release has the web's PostHog key and an empty DSN
  (`docs/DEPLOY.md` "iOS app build configuration").
- **Build viewer polish** (user requests during this step): moves glide — the viewBox, selector and run box are one
  `ViewerFrame` (`VectorArithmetic`) animated with the web's `cubic-bezier(0.4, 0, 0.2, 1)` over 0.5 s, so boxes and
  dice stay aligned while sliding; die border/corner geometry now matches the web's SVG (stroke centred on the die edge
  and clipped by the die, so the visible border is half the stroke).
- **Editor layout polish** (user request): step back/next moved up beside the Crop · Tune · Build tabs (hidden on
  the first/last step); the control rows under the stage lost their glass surfaces (slider and progress bar sit on
  the page), the tune tools are icon tiles with the label beneath, like the web's mobile toolbar, and the undo/redo
  toolbar buttons are gone (the model keeps its history; nothing in the UI drives it for now).
- **Crop toolbar parity** (user request, both platforms): the ratio chips show the ratio's outline above the label
  (the web's `AspectRatioChips` icons), and Rotate 90° moved onto the crop canvas (bottom-right, like the build zoom
  buttons) on iOS and in the web's mobile editor (`MobileEditor` `CropRotateButton`; `MobileCropControls` keeps only
  the chips). Web gates rerun green.
- DEBUG launch arguments: `--ui-share` (open the share sheet once signed in), `--ui-account`.

## Verification

- `xcodebuild test`: 30 tests in 13 suites — new: `AnalyticsEventTests` (names/keys/null handling, MIME sniffing),
  `FunctionErrorTests`, `PlanCopyTests` (status lines incl. Apple wording, dates), `ShareCardTests` (1200 × 630,
  art placement and orientation, text column lit), `ShareServiceTests` (local stack: row → `get_share` → public image
  bytes; signed-out refused), `ViewerFrameTests` (interpolation).
- Simulator screenshots: build step with the share button and the web-matched die borders; the share sheet with a real
  share created on the local stack (card, `/s/<id>` link); the account screen (Explorer).
- Web gates after the unrelated lint fix in `Hero.tsx`: typecheck, vitest, lint, scratch-copy build; DiceCore 52 tests.
- `xcodebuild archive` (Release, generic iOS device, `CODE_SIGNING_ALLOWED=NO`) succeeds, so the TestFlight archive
  only needs signing. It caught a debug-only call outside `#if DEBUG`.
- Not testable by Claude: the glide (a still cannot show it), the system share sheet's targets, delete account on a
  real account (the local `account` function needs Stripe env; the web covers it), PostHog/Sentry delivery (Debug
  sends nothing by design) — **user to try on the TestFlight build**.

## TestFlight — user items

1. `ios/Diceify/Config/Release.xcconfig`: fill `SUPABASE_ANON_KEY` (hosted project) and, optionally, `SENTRY_DSN` from a
   new Sentry project of platform Apple iOS.
2. Xcode → Settings → Accounts: add the Apple ID of the developer account (team VF6ZCD74B9).
3. Open `ios/Diceify.xcodeproj` (run `xcodegen` in `ios/` first if it is missing), scheme Diceify, destination
   "Any iOS Device (arm64)", Product → Archive → Distribute App → TestFlight & App Store → Upload.
4. App Store Connect → TestFlight → Internal Testing → add yourself; install from the TestFlight app.

## Findings

- `UIGraphicsImageRenderer` contexts are y-down: `DiceRenderer.drawGrid` (y-up, row 0 at the bottom) needs a flip there.
- A SwiftUI `View` conforming to `Animatable` under Swift 6 needs `@preconcurrency Animatable` (main-actor isolation).
- `nil` in a `[String: Any]` event property must be `NSNull()` to reach PostHog as JSON null.
- A programmatic push from the root view's `onAppear` on the first frame is dropped; the debug argument waits 400 ms.
- A pending alert blocks a sheet: the debug `--ui-step` jump no longer re-enters a step the project is already on.
- `log` is a zsh builtin: use `/usr/bin/log show`.
