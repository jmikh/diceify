# iOS step 3 — app skeleton, theme, sign-in, projects

Plan: `plans/ios/ios-app-plan.md` § 9 step 3. Done 2026-10-03 (uncommitted). The app exists, builds and runs on the
simulator from the terminal; the editor itself is step 4.

## What exists (`ios/`)

- `project.yml` (XcodeGen; `xcodegen` regenerates the ignored `Diceify.xcodeproj`): app target `art.diceify.app`,
  iOS 18+, iPhone only, dark, team `VF6ZCD74B9`, Sign in with Apple entitlement, packages `DiceCore` (local),
  `supabase-swift` 2.55, `GoogleSignIn-iOS` 9; unit-test target `DiceifyTests` (scheme env
  `DICEIFY_SUPABASE_TEST=1` turns the repository integration test on).
- `Diceify/Config/*.xcconfig`: Debug = local stack (`http://127.0.0.1:54331`, demo anon key, reachable from the
  simulator), Release = hosted project (**anon key placeholder to fill**), `Google.xcconfig` = the iOS OAuth client id
  + reversed id (URL scheme). Info.plist keys come from these (`AppConfig`).
- Theme (`Theme/Theme.swift`): asset-catalog colours from `styles/base.css`, `glassPanel()` (iOS 26 glass, material
  below), `.primary`/`.secondary` button styles, Syne for display text (bundled Outfit/Syne TTFs, PostScript names
  `Outfit-*`, `Syne-Bold`), `OrbsBackground`. App icon: the favicon diamond on the brand gradient, 1024 px, opaque.
- `AppSession` (@Observable, MainActor): auth state from `authStateChanges`, profile row → `deriveEntitlements`
  (DiceCore), Sign in with Apple (nonce + `signInWithIdToken`), Google (native SDK → `signInWithIdToken`), sign-out,
  `handle(openURL:)`. `SignInSheet`: Apple first, then Google (App Store 4.8).
- Projects: `LocalStore` (Documents/Projects/<id>/{original.jpg, document.json, preview.jpg, meta.json}; millisecond
  ISO dates), `ImageKit` (CGImageSource thumbnail decode ≤ 2048, EXIF applied and dropped, JPEG 0.85; 192 px preview),
  `ProjectRepository` (list/get/create(upload→insert)/CAS save/rename/delete/previews via supabase-swift),
  `ProjectsStore` (local ∪ cloud list, create from photo, signed-out single draft, draft promotion on sign-in, rename,
  delete, cache a cloud project locally, clear the cache on sign-out).
- `StartScreen`: hero card with `PhotosPicker` + camera (devices), draft notice, 2-column project grid with context menu
  rename/delete; `EditorScreen` placeholder (photo + step) that loads/caches the project.
- DEBUG launch arguments for terminal-driven checks: `--ui-signin`, `--ui-import <file in Documents>`,
  `--ui-open <uuid>`, `--ui-login <email> <password>` (password user on the local stack).

## Verification
- `xcodebuild test` (scheme Diceify, iPhone 17 simulator): `LocalStoreTests`, `ImageKitTests` (downscale, no
  upscale, EXIF orientation applied + stripped, garbage rejected), `ProjectRepositoryTests` (full lifecycle against
  the local stack as `ios-dev@test.dev`, created with the Admin API: create, list, previews, CAS save + conflict,
  rename, delete incl. objects).
- Simulator runs driven with `xcrun simctl` + screenshots: Start screen, sign-in sheet, import → editor, project
  grid (local draft with the "only on this phone" mark), debug login → draft promoted (row + original + preview in
  storage, local meta updated), cloud list with signed thumbnails, cache wipe → open → re-cached.
- Not testable by Claude: the real Apple/Google sign-in round trips (need an Apple ID / Google account in the
  simulator and the providers on the Supabase project) — **user to try**.

## Findings
- `AnyJSON` has no `[String: Any]` initializer: documents go through `jsonData()` → `JSONDecoder` (`anyJSON()`).
- `createSignedURLs` returns `SignedURLResult` (`.signedURL` optional per path).
- supabase-swift downloads are served from the URL cache after the object is gone; tests must list the folder.
- `print` does not reach `log show`; `os.Logger` at `.notice` does (subsystem `art.diceify.app`).
- The simulator's Photos library (stock waterfall) made two surprise projects while the window was being tapped —
  the picker path works; nothing to fix.
