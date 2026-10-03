# iOS step 0 — decisions and setup

Plan: `plans/ios/ios-app-plan.md`. Decisions confirmed 2026-10-03: native SwiftUI + DiceCore, RevenueCat for IAP,
persisted grid (schema v2) with a backfill of every project and the web Build step using it, Sign in with Apple on
iOS and web. D5–D8 (PostHog only, iPhone-only iOS 18+ dark-only, App Store prices, signed-out drafts) as recommended.

## Done in the repo (Claude)

- `ios/DiceCore` SwiftPM package (tools 6.0, Swift Testing) with the fixture harness (`Fixtures.swift` reads
  `core/dice/__fixtures__` by path). `swift test` is green via `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`
  (the Command Line Tools toolchain ships no test framework; the `xcode-select` item below removes the need for the
  variable).
- `jsRound` (JavaScript `Math.round` semantics) as the first spec rule in code.
- `.gitignore` (Xcode user state, build products), ESLint ignores `ios/**`, `ios/README.md`.

## Your checklist (portals; Claude cannot click these)

Machine
- [ ] `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
- [ ] `sudo xcodebuild -license accept`
- [ ] Open Xcode → Settings → Components → install the iOS 26 platform (simulator runtime)
- [ ] Xcode → Settings → Accounts → add your Apple ID (the developer team appears)

Apple Developer (developer.apple.com → Certificates, Identifiers & Profiles)
- [ ] Identifiers → App IDs → new: description "Diceify", bundle id `art.diceify.app` (explicit),
      capabilities: Sign in with Apple, In-App Purchase

App Store Connect (appstoreconnect.apple.com)
- [ ] My Apps → + → New App: iOS, name "Diceify", primary language English (US), bundle id `art.diceify.app`,
      SKU `diceify-ios`, full access
- [ ] Business → Agreements: accept the Paid Apps agreement, add banking and tax info (IAP cannot be tested in the
      sandbox before this is active; approval takes a day or two)
- [ ] Users and Access → Sandbox → Test Accounts: create one sandbox Apple ID for purchase testing (step 6)

Supabase (hosted project, Authentication → Providers)
- [ ] Apple: enable; Client IDs = `art.diceify.app` (native sign-in needs no secret). The web flow (step 1) will
      additionally need a Services ID + key; Claude will list those when step 1 starts.
- [ ] Google: keep the web client; add the iOS client id (next item) to "Authorized Client IDs"

Google Cloud (APIs & Services → Credentials)
- [ ] Create OAuth client → iOS → bundle id `art.diceify.app`; note the client id and the reversed id (URL scheme)

RevenueCat (app.revenuecat.com) — can wait until step 6
- [ ] Project "Diceify" → add an App Store app with bundle id `art.diceify.app` and the App Store Connect
      In-App Purchase key (App Store Connect → Users and Access → Integrations → In-App Purchase)

Tell Claude when the machine items are done: from then on builds, tests, simulators and screenshots run from the
terminal.
