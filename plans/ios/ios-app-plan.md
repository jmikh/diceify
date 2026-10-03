# Diceify for iOS — plan

Written 2026-10-03 against `master` (web revamp complete, Worker serving diceify.art). Companion to
`plans/revamp/revamp-tiered-plan.md`, which already prepared for this: the dice core is pure TypeScript with a
Swift-portable spec (`core/README.md`) and golden fixtures, and the backend is Supabase that any client can talk to.

The reader knows the web codebase but has never built an iOS app. Section 1 is the decisions to confirm, section 9
is the step-by-step, section 12 explains the Apple vocabulary used throughout.

---

## 1. Recommendation and decisions to confirm

**Build a native SwiftUI app with a Swift port of `core/`, talking to the same Supabase project.** Reuse the
backend, the data model, the share links and the brand; rebuild the UI with iOS conventions (navigation stack,
bottom toolbars, sheets, system materials, SF Symbols, haptics) in the dark pink-on-near-black theme.

| # | Topic | Recommendation | Alternative | Why |
|---|---|---|---|---|
| D1 | Technology | **Native SwiftUI + `DiceCore` Swift package**, verified against `core/dice/__fixtures__` | Expo / React Native reusing `core/` TS as-is | The UI-heavy parts (cropper, pinch-zoom build viewer, Photos picker, share sheet, StoreKit, keep-awake, haptics) are where native wins and where RN needs bridges. The core is ~600 lines with a spec and 8 fixtures, so the port is cheap and provable. iOS 26's glass materials match the existing glass aesthetic almost 1:1. Cost: a second core implementation (fixtures keep it honest) and Swift is new to you (Claude writes it; what you must learn either way is Xcode, signing, TestFlight). |
| D2 | Paid plans in the app | **In-app purchase (StoreKit 2) through RevenueCat**, shipped *before* the App Store submission, *after* the first TestFlight | Raw StoreKit 2 + App Store Server Notifications in an edge function | App Review 3.1.1 forbids selling digital features outside IAP, and 3.1.3(b) only lets the app honor web-bought plans if the same plans are also buyable in-app. So a public release that recognizes Studio/Creator needs IAP. RevenueCat (free under $2.5k/month) replaces receipt/JWS verification, restore, grace periods and sends one webhook we store. |
| D3 | Exact builds across devices | **Schema v2: persist the generated grid in the project document** | Accept that web and iOS can differ by a few dice | Browser canvas and Core Graphics resample the photo differently; averaging hides most of it, but a cell near a threshold can flip. Someone building from the phone and later the laptop must see the same die. Storing the grid (~40 KB max, compact encoding) makes Build read the stored grid everywhere; Tune regenerates it. Also makes opening a project on Build instant. |
| D4 | Sign-in | **Sign in with Apple + Google, both native (ID token → Supabase)**; add Sign in with Apple to the web too | Browser-based OAuth bounce (`ASWebAuthenticationSession`) | Apple requires Sign in with Apple when Google sign-in is offered (4.8). Native ID-token sign-in has no Safari bounce. Apple's "Hide My Email" relay creates a *separate* Supabase account from the Google one; offering Apple on the web lets those users sign in there too. |
| D5 | Analytics | **PostHog only** (posthog-ios), same event names + `platform: 'ios'` | Also GA4 (needs the Firebase SDK) | GA4 on iOS means Firebase; PostHog already carries every event and the funnels. GA4 reports will simply not include iOS. |
| D6 | Platforms | **iPhone only, iOS 18+, dark appearance only** | iPad layouts, light mode | Fewer layouts and screenshots for v1. The brand is dark; a forced dark scheme is accepted by review. iPad runs the iPhone layout in compatibility mode. |
| D7 | App Store prices | Your call: parity ($19 / $9 / $36) or round up ($19.99 / $9.99 / $39.99) | | Apple keeps 15% (Small Business Program) of in-app revenue. Prices live in App Store Connect, not in code; `core/billing/plans.ts` copy would need an iOS variant if they differ. |
| D8 | Signed-out use | **Allowed, local-only draft** (as on the web) | Sign-in required at launch | Review dislikes forced sign-in before any value is shown (5.1.1). Mirrors the web: one local draft, sign in to keep and sync it. |

**Status (2026-10-03):** D1 native, D2 RevenueCat, D3 persisted grid (plus a one-time backfill of every existing
project and the web Build step reading the stored grid), D4 Sign in with Apple on both platforms — **confirmed by the
user**. D5–D8 proceed as recommended unless the user says otherwise.

---

## 2. What the app reuses (no new server, no new data model)

| Existing | Reused as |
|---|---|
| Supabase project (Auth, `profiles`, `projects`, `shares`, storage buckets, RLS) | The app's whole backend, through the official `supabase-swift` SDK. Same rows, same policies. A project made on the web opens on the phone and vice versa. |
| `core/dice` (pipeline, build math, stats, SVG, document schema) | Ported to Swift as `DiceCore`; tests load `core/dice/__fixtures__/*.json` and must reproduce every grid exactly. |
| `core/billing` (plans, entitlements) | Ported; same priority rules, extended for the Apple source (section 7). |
| `core/share` (ids, URLs, copy, card layout) | Ported; shares created on iOS are ordinary `/s/<id>` links served by the Worker. |
| Edge functions `billing`, `stripe-webhook` | Unchanged for Stripe. One new function for RevenueCat webhooks, one for account deletion (section 7). |
| Theme tokens (`styles/base.css`), logo, icons | Translated into an asset catalog (section 6). |
| Analytics catalog (`lib/analytics.ts` `AnalyticsEvents`) | Mirrored as a Swift enum; same names and properties. |

Not reused: anything in `app/`, `features/`, `components/`, `lib/image` (DOM), `worker/`.

---

## 3. Scope of v1 (feature parity with the mobile web editor)

| Area | In v1 | Notes |
|---|---|---|
| Start / Projects | Project grid with thumbnail, name, % complete, updated date; New project from Photos library or camera; rename, delete; signed-out local draft | Photo is immutable per project (as web). |
| Crop | Fixed-ratio crop frame with pinch/pan, presets 1:1 · 3:4 · 4:3 · 2:3 · 16:9, Rotate 90° | Produces the same `CropParams` (box in the rotated bounding box + rotation) so documents stay compatible. |
| Tune | Live preview; Rows (20–120), Contrast, Brightness (gamma), Sharpening sliders; color mode Both/Black/White; rotate 6/3/2 toggles; dice count and black/white split; undo/redo | Same bounds as `DICE_PARAM_BOUNDS`. |
| Build | Zoomable grid viewer, current die highlight, run badges (×N), row/column readout, progress bar and %, prev/next die, prev/next *different* die, keep screen awake, haptics; More: View progress, Download blueprint (SVG), Purchase dice | Free plan: rows 0–4 only (`builderRowLimit`), paywall on row 5. |
| Share | Create the share card (1200×630 JPEG, same layout/fonts as web), insert row, upload, native share sheet with the prefilled text and UTM link | Sign-in required, free on every plan, no unshare (existing decisions). |
| Account | Plan and access-until, manage subscription (Apple: system sheet; Stripe: informational only), restore purchases, sign out, **delete account** | Delete account is an App Store requirement (5.1.1(v)) and does not exist on the web yet. |
| Paywall | Limit reached / Pro feature sheets → StoreKit purchase of Creator pass, Studio monthly, Studio yearly | Section 7. |
| Persistence | Autosave with the same 1.5 s debounce and compare-and-set on `cloud_version`; conflict → reload + alert; offline cache of every opened project (original, document, preview) so Build works without network | Building a physical mosaic often happens away from Wi-Fi. |
| Observability | Sentry (sentry-cocoa), PostHog | |

Deliberately out of v1: iPad layouts, widgets / Live Activities for build progress, universal links into the app,
Apple Watch, light mode, localization, free-angle rotation, importing a project from a share link.

---

## 4. Architecture

```
iPhone (SwiftUI app, dark)
  ├─ DiceCore (Swift package, no UIKit)        ← port of core/ (dice, billing, share), tested on the TS fixtures
  ├─ ImageKit (Core Graphics)                   ← decode, EXIF-orient, downscale ≤2048, crop/rotate, JPEG, raster of grids
  ├─ Stores (@Observable)                       ← DocumentStore (+undo), EditorUIStore, DerivedStore, ProjectStore
  ├─ Persistence                                ← Documents/<projectId>/{original.jpg,document.json,preview.jpg}, draft/
  ├─ supabase-swift (anon key + user JWT, Keychain session)
  │     auth: Sign in with Apple / Google via signInWithIdToken
  │     profiles (read own) · projects (CRUD, CAS) · shares (insert) · storage project-images / share-images
  │     functions.invoke('billing', …)  (Stripe: sync/portal unused on iOS; cancel/resume hidden)
  ├─ RevenueCat SDK (appUserID = Supabase user id) ── StoreKit 2 ── App Store
  └─ PostHog iOS · Sentry cocoa

Supabase
  ├─ existing: billing (Stripe), stripe-webhook
  ├─ NEW revenuecat-webhook  (shared-secret header) → writes profiles.apple_* columns (service role)
  └─ NEW account            (JWT) POST /delete → cancel Stripe sub, delete storage objects, delete auth user (cascades)
```

### Repo layout (same repo, `ios/` folder)

```
ios/
  Diceify.xcodeproj            the app (SwiftUI, iOS 18+), automatic signing with your team
  Diceify/                     App/, Theme/, Features/{Start,Editor/{Crop,Tune,Build},Share,Account,Paywall}, Services/, Persistence/
  DiceCore/                    Swift package: Sources/DiceCore/{Dice,Billing,Share}, Tests/DiceCoreTests
  README.md                    how to open, run on the simulator, archive to TestFlight
```

- `DiceCoreTests` reads `../../core/dice/__fixtures__` relative to `#filePath` (no copying, no symlinks); a fixture
  regenerated for the web fails the Swift tests until the port is updated, which is the point.
- `ios/` is outside `tsconfig` `include` patterns by extension and ESLint ignores it (`ignores: ['ios/**']` to be
  added); `npm run typecheck/lint/test/build` stay unaffected. Xcode's `DerivedData` never lives in the repo.
- The TS side keeps owning the spec: a change to `core/README.md` rules = regenerate fixtures = port the change.

### Determinism rules for the port (where Swift silently differs from JS)

- Gray stages are stored as `[Float]` (Float32Array) and computed in `Double`, exactly as the spec says.
- `Math.round` is `floor(x + 0.5)`; Swift's `.rounded()` rounds half away from zero. Use a `jsRound` helper everywhere
  the spec rounds (`computeGridSize`, `rotatedBounds`, raster sizes).
- `Math.pow` vs `Foundation.pow` can differ by one ulp; the gamma branch is the only user. The two `tuned` fixtures
  (gamma 1.3) cover it; if they ever fail by one threshold step, implement gamma as `exp(log(x) / gamma)` on both sides
  and regenerate (a fixture rule change, done on purpose).
- Kernel sums in the spec's order, border copied unchanged, clamps as written.
- Grid rows: `rows[y][x]`, y = 0 the bottom row. Keep it; do not "fix" it to top-down.

---

## 5. Data and cross-platform compatibility

- **Project document**: Swift `Codable` for `ProjectDocument` v1 (strict: unknown keys and out-of-range values are
  errors, like the zod schema). The iOS app never sees legacy drafts (the migration script produced v1), so no legacy
  path. An unsupported `schemaVersion` → "Update Diceify to open this project" (never overwrite).
- **Schema v2 (D3)**: `grid: { width, height, rows: string[] } | null` where each row uses the fixture encoding
  (`"w3 b6r w1 …"`, row 0 = bottom). Web first: bump `CURRENT_SCHEMA_VERSION`, add the `migrateDocument` step (v1 →
  v2 with `rows` absent until the next generation), test the old shape, make Build prefer the stored grid when the
  baseline matches, deploy. Then iOS reads/writes v2 only. Rule: **the web ships a schema before any iOS build writes
  it**, because the web reads old versions and iOS reads only current ones.
- **Backfill (user decision)**: `scripts/backfill-grids.ts` (service role, hosted or local target, `--dry-run`) walks
  every `projects` row, downloads `original.jpg`, applies the crop with `sharp` (rotation, region, longer side ≤ 2048,
  the same `drawRegion` arithmetic), runs `generateDiceGrid`, and writes the v2 document with `rows` filled. Caveat:
  `sharp` resamples differently from the browser canvas, so a project with build progress can get a grid that
  differs from what its owner saw by a cell or two near a threshold. The script therefore logs, per project, the
  number of dice that differ from a second run with the browser-like resampler only when both are available; in
  practice: backfill everything, report how many projects carried progress, and accept that the stored grid is the
  canonical one from then on (Tune regenerates it on the next change anyway). The web pipeline also writes `rows`
  whenever it generates, so any project opened on the web after the deploy self-heals to the browser grid before the
  script runs if the user gets there first.
- **Web uses the stored grid (user decision)**: on the Build step the editor renders `document.grid.rows` directly
  (no pipeline run, instant open); the pipeline still runs on Crop/Tune and overwrites `rows` + the thumbnail/raster.
  `progressApplies` keeps guarding progress against a changed crop/params.
- **Version skew**: `projects.document` written by a newer iOS build must stay readable by the deployed web, so iOS
  never writes a version the web has not shipped (enforced by the rule above).
- **Images**: iOS uploads the same `{uid}/{projectId}/original.jpg` (EXIF orientation applied, longer side ≤ 2048,
  JPEG quality 0.85, metadata stripped) and `preview.jpg` (192 px, 0.8). Storage policies need no change.
- **Build progress** is a grid position; grid dimensions depend only on crop size and `numRows`, so progress made on
  one platform is valid on the other even before D3.
- **Offline cache**: every opened project is cached in the app's Documents directory; saves go to a queue that retries
  with the same CAS semantics; a conflict reloads the cloud row (the web's behavior).

---

## 6. Design system: the Diceify theme in iOS clothes

Principle: keep the palette, the dark glass surfaces, the pink primary and the rounded 20 px panels; replace web
chrome (hover states, custom scrollbars, orbs everywhere, toasts, popovers) with iOS equivalents (sheets, toolbars,
context menus, alerts, system materials, SF Symbols, Dynamic Type, haptics).

### Tokens → asset catalog

| Web token | iOS | Use |
|---|---|---|
| `--bg-primary #0a0014`, `--bg-secondary #1a0826` | `Color.bgPrimary`, `Color.bgSecondary` | Screen backgrounds (a subtle top→bottom gradient on Start only). |
| `--bg-glass` / `--border-glass` panels, radius 1.25 rem | `GlassPanel` modifier: `.glassEffect()` on iOS 26, `.ultraThinMaterial` + 8 % white stroke on iOS 18/19; `RoundedRectangle(cornerRadius: 20, style: .continuous)` | Canvas panel, control cards, project cards. |
| `--pink #FF2D92` | `Color.pink` (tint) | Selection, active chips, progress, links. |
| `--pink-strong #E0127A` | `Color.pinkStrong` | Filled primary buttons (`.borderedProminent` tinted), white label. |
| `--pink-light #FF5CAD` | `Color.pinkLight` | Pressed/hover-equivalent, text links. |
| `--accent-purple #9333ea`, `--accent-green #22c55e`, `--accent-blue #6495ff` | `Color.accentPurple/Green/Blue` | Run badges (purple = run width, pink = remaining), success states. |
| text 0.9 / 0.7 / 0.5 / `#858585` | `.primary`, `.secondary`, `Color.textMuted`, `Color.textDim` | Keep the 4.5:1 rule: `textDim` is the floor. |
| Glow shadows | Only on the Start CTA and paywall button (`.shadow(color: .pink.opacity(0.25), radius: 20)`) | Everywhere else iOS relies on material, not glow. |
| Fonts Outfit (body), Syne (display) | **SF Pro (system) for all UI** with Dynamic Type; **Syne** bundled for the Start title and paywall headline; **Outfit + Syne** bundled for the share card so it is pixel-identical to the web card | Both fonts are OFL; bundling is allowed. |
| Lucide icons | SF Symbols: `crop`, `slider.horizontal.3`, `square.grid.3x3`, `circle.lefthalf.filled` (contrast), `sun.max`, `sparkles`, `dice`, `rotate.right`, `chevron.left/right`, `chevron.left.2/right.2`, `eye`, `square.and.arrow.down`, `cart`, `square.and.arrow.up`, `person.crop.circle` | |
| Die rendering (`core/dice/geometry.ts`) | Same constants: backgrounds `#1a1a1a` / `#fafafa`, dots, stroke `#6b6b6b`, corner 10 %, border 5 %, dot radius 12 %, padding 0.35 | 12 cached die images (+ rotated) blitted by Core Graphics. |

### Screens

**Start (Projects)**: large title "Your projects" (navigation bar, large title, glass on scroll); top-right account
avatar / "Sign in". Hero card "New project" with two actions: Photos (`PhotosPicker`) and Camera. Below: 2-column
grid of project cards (thumbnail with the cropped photo, name, progress ring or %, relative date); long-press context
menu: Rename, Delete; swipe not needed. Signed-out: the single draft card with the same web copy ("A new photo replaces
… Sign in first to keep it."). Soft orbs background (two static radial gradients, blurred) behind this screen only.

**Editor shell**: pushed on a `NavigationStack`; nav bar title = project name (tap → rename/settings sheet);
trailing: undo/redo (Crop/Tune only), share. Step control: a segmented capsule `Crop · Tune · Build` under the nav bar
(matches the web's step tabs and the mobile top bar). Stage: the glass canvas panel filling the middle. Bottom:
a fixed-height control area in the thumb zone with the web's two rows (main row 72 pt, tool row 56 pt) so the stage
never jumps between steps, above the home indicator (safe area). Step back/next = the chevron buttons flanking the
main row, as on mobile web; leaving Build with progress asks to confirm (same `needsResetConfirm` rule).

**Crop**: photo under a fixed-ratio frame with corner handles, rule-of-thirds grid, pinch to zoom, pan; outside dimmed.
Main row: aspect chips (1:1, 3:4, 4:3, 2:3, 16:9) + Next. Tool row: "Rotate 90°". Reframing on preset change uses the
ported `reframeCrop` so behavior matches.

**Tune**: stage shows the rendered grid (letterboxed) with "N dice" + black/white split pill at the bottom. Main row: a
card with the active control (slider with value label, or the color-mode segmented control, or the rotate toggles).
Tool row: 6 tabs Rows · Contrast · Bright · Sharpen · Color · Rotate. Slider drags batch into one undo entry (port of
`documentHistoryBatcher`); regeneration debounced 300 ms off the main thread.

**Build**: stage = zoomable grid (pinch, double-tap), current die outlined in pink, run badges, row numbers along the
left edge (1 = bottom row, as users count), light haptic per step, `.success` haptic at 25/50/75/100 %. Main row:
back · progress bar + % · More (menu: View progress, Download blueprint, Purchase dice). Tool row: ⏮ (prev different)
◀ (prev) [row R · col C] ▶ (next) ⏭ (next different, pink filled). Screen stays awake while on Build. Free plan: a
non-blocking banner at row 5 ("Rows 1–5 are free · Unlock the full build") → paywall sheet.

**Share**: sheet (medium detent): preview of the card, "Share" (system share sheet with URL + prefilled post text,
`utm_source=share_sheet`) and "Copy link" (`copy_link`). Creating the share shows a progress state while the card is
rendered and uploaded.

**Account**: list style (inset grouped): user row (avatar, name, email, provider), Plan row (Explorer / Creator until
date / Studio renews on date / Pro), Manage subscription (Apple → `manageSubscriptionsSheet`; Stripe → "Managed on
diceify.art" caption, no link), Restore purchases, Sign out, Delete account (destructive, confirmation alert).

**Paywall**: sheet; headline in Syne; the three products as cards (Creator pass 30 days, Studio monthly, Studio yearly
with "save X %"); price strings from StoreKit (localized); Apple-required links to Terms/Privacy; "Restore" link.
Copy reuses `PRICING` descriptions.

**Sign-in**: sheet with "Sign in with Apple" (system button, black style on dark), "Continue with Google", a line on
why (keep projects, share, unlock). Opens from the same places the web opens its modal (`useGate` ports to `Gate`).

### iOS conventions applied

Sheets with detents instead of modals; alerts for conflicts and destructive confirmations; context menus instead of
popover menus; `.toolbar(.bottomBar)` for the editor rows; `ScrollView` + `NavigationStack` large titles; Dynamic
Type up to accessibility sizes on non-canvas text; VoiceOver labels on every control (ported from the `aria-label`s);
Reduce Motion respected (no float/glow animations); `.sensoryFeedback` haptics; keyboard avoidance for rename.

---

## 7. Backend and platform work (new, shared with the web)

### 7.1 Sign in with Apple and native Google

- **Supabase → Apple provider**: enable; "Authorized Client IDs" = the app's bundle id (`art.diceify.app`). Native
  sign-in needs no secret. The app uses `AuthenticationServices` → `signInWithIdToken(provider: .apple, idToken, nonce)`.
  Request scopes `fullName`, `email`; Apple sends the name only once, so store it into `profiles.name` through the
  user metadata on first sign-in.
- **Google native**: Google Cloud → create an **iOS** OAuth client (bundle id); Supabase Google provider →
  "Authorized Client IDs" += that client id; app uses the Google Sign-In SDK → `signInWithIdToken(provider: .google,
  idToken, accessToken)`. The existing web client id keeps working for the web.
- **Web (recommended, D4)**: add Sign in with Apple to `SignInModal`/`EditorSignInModal` (Supabase OAuth, needs a
  Services ID + key in the Apple provider for the web flow). Small, and it keeps relay-email users able to sign in on
  the web.
- Account linking: Supabase links identities with the same verified email into one user. Google-on-web then
  Apple-on-iOS with the real email = same account; "Hide My Email" = a second account (accepted, documented in the
  account screen by showing the provider).

### 7.2 Account deletion (required by 5.1.1(v))

New edge function `account` (`verify_jwt = true`), `POST /delete`:
1. If the profile has an active Stripe subscription: `subscriptions.cancel` (immediate) so a deleted user is never
   charged again; Apple subscriptions cannot be cancelled server-side (the sheet tells the user to cancel in Settings
   first and links `manageSubscriptionsSheet`).
2. Remove storage objects: everything under `project-images/{uid}/`, and `share-images/<id>.jpg` for the user's
   share rows (shares are anonymous but their rows cascade-delete, so their images would otherwise be orphans).
3. `auth.admin.deleteUser(uid)` → cascades `profiles` → `projects`, `shares`.
Add the same button to the web Account page (one call, reuse the function).

### 7.3 Billing: Apple as a second source

Profiles gain Apple columns written **only** by the new `revenuecat-webhook` function (service role), mirroring the
Stripe rule:

```
apple_app_user_id text unique     -- RevenueCat app user id = Supabase uid (sanity)
apple_product_id text             -- creator_30d | studio_monthly | studio_yearly
apple_status text                 -- active | expired | billing_issue | cancelled (still active until expiry)
apple_expires_at timestamptz      -- entitlement end (pass end or current period end)
apple_will_renew boolean
apple_synced_at timestamptz
```

- `BillingState` gets an `apple` member; `deriveEntitlements` priority becomes: lifetime → Studio (Stripe PRO status
  **or** Apple studio product active) → Creator (Stripe pass **or** Apple pass not expired, strict `>`) → Explorer.
  `accessUntil` = the later date; `canManageBilling` becomes `manageVia: 'stripe' | 'apple' | null`.
- SQL `effective_plan` mirrored (same priority) — change both together, as today. `_shared/billing-snapshot.ts`
  `hasPaidAccess` (used to refuse a second Stripe checkout) also considers Apple, so a user cannot pay twice.
- Products in App Store Connect: non-renewing subscription `creator_30d` ($19), subscription group "Studio" with
  `studio_monthly` ($9) and `studio_yearly` ($36) (prices per D7). RevenueCat entitlements `creator`, `studio`.
- App: RevenueCat `appUserID` = Supabase user id, login after auth, logout on sign out; after a purchase the app
  shows the unlocked state from the SDK's `CustomerInfo` and refetches `profiles` until the webhook has landed
  (typically seconds). Entitlements still come from the profile row (single source), the SDK result only bridges the gap.
- Stripe-sourced plans in the app: honored (3.1.3(b) satisfied because the same plans are buyable in-app). No links
  to Stripe checkout or portal from the app; cancel/resume of Stripe subs stays web-only.
- The `paywall_shown`, `click_upgrade`, `checkout_started` events keep their names; a server-side `purchase`
  event from the RevenueCat webhook mirrors `purchaseEvent` in `stripe-webhook`.

### 7.4 Schema v2 (D3), see section 5. One migration (`npm run db:migration -- apple_billing`), `db:reset`, `db:types`.

---

## 8. Observability and analytics on iOS

- PostHog iOS: autocapture off (screens named explicitly), session replay off (photos), `identify(uid)` on sign-in,
  `reset()` on sign-out, every event from `AnalyticsEvents` with `platform: "ios"` and `app_version`.
- Sentry cocoa with `reportError(error, where:)` wrapper as the only importer (same rule as the web).
- No photo ever leaves the device except to the user's own storage path; nothing is attached to error reports.

---

## 9. Steps

Each step ends with: `swift test` (DiceCore), `xcodebuild test` (app tests), a simulator run that Claude drives with
`xcrun simctl` (boot, install, screenshot) and, whenever the web repo changed, the web gates
(`npm run typecheck && npm test && npm run lint && npm run build`, `functions:check` when functions changed).
Steps get `plans/ios/ios-step-<N>.md` docs and a step log at the bottom of this file, like the revamp.

Effort is a rough size for working sessions with Claude, not a promise.

### Step 0 — Decide and set up (½ day, mostly you)

You:
- Confirm D1–D8 above.
- Xcode 26.6 is installed but the command line still points at the Command Line Tools. Run
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, then `sudo xcodebuild -license accept`, open
  Xcode once and install the iOS platform (Settings → Components) so a simulator exists.
- Apple Developer → Certificates, Identifiers & Profiles → Identifiers: register the App ID `art.diceify.app`
  with capabilities **Sign in with Apple** and **In-App Purchase**.
- App Store Connect → My Apps → New App: name "Diceify", bundle id above, SKU `diceify-ios`. Agreements: accept the
  Paid Apps agreement and fill banking/tax (needed before IAP can be tested in sandbox or sold).
- Supabase dashboard: enable the Apple provider (bundle id as client id); Google Cloud: create the iOS OAuth client;
  add it to the Google provider's authorized client ids.
- RevenueCat: create the project and the iOS app (needs the App Store Connect API key or shared secret), define the
  three products and two entitlements (can wait until step 6).

Claude: `ios/` skeleton, `.gitignore` additions (`ios/**/xcuserdata`, `DerivedData`), ESLint ignore, `ios/README.md`.

### Step 1 — Web-side prep (2–3 days, in this repo, deployable on its own)

- Schema v2 with the persisted grid (D3): core change (row encode/decode shared with the fixtures, `gridToRows` /
  `rowsToGrid`), migration step + test for the v1 shape, fixtures untouched (the pipeline does not change). The
  pipeline writes `grid.rows`; Build renders the stored grid (section 5).
- `scripts/backfill-grids.ts` + a dry run against the local stack, then the hosted project (after the web deploy).
- `account` edge function + web "Delete account" on the Account page.
- Apple billing columns + `deriveEntitlements`/`effective_plan` extension (behavior unchanged until Apple rows exist)
  + `revenuecat-webhook` function (secret header, idempotent, writes the columns).
- Sign in with Apple on the web (D4).
- PostHog: `platform` property on every web event (`web`).
- `docs/DEPLOY.md`: Apple provider, iOS Google client, RevenueCat secret, function deploys.

### Step 2 — `DiceCore` Swift package (2–3 days)

- `Dice`: types, `computeGridSize`, `toGray`, `downsample`, `sharpen`, `mapGrayToDie`, `generateDiceGrid`,
  `computeStats`, build math (`build.ts`, including `computeViewBox` and the windows), `geometry` dot positions,
  SVG string rendering (`renderGridSvg`, progress SVG) for the blueprint, document `Codable` v2 + validation +
  `documentStats`, `reframeCrop`, `scaleCrop`, `nearestAspectRatio`, `progressApplies`, grid row encode/decode.
- `Billing`: plans, pricing copy, `deriveEntitlements` (with Apple), `rowLimitAllows`.
- `Share`: id from bytes, URLs, copy, card layout.
- Tests: all 8 fixtures byte-exact; ports of the TS unit tests for build math, document, entitlements, share.

### Step 3 — App skeleton, theme, auth, projects (3–4 days)

- Xcode project, targets, automatic signing; asset catalog (colors, app icon from `public/favicon.svg` / logo,
  bundled fonts); `Theme/` (GlassPanel, buttons, chips, slider style, typography).
- `SupabaseService` (client, Keychain session), `AuthService` (Apple, Google, sign out), `ProfileStore` with
  entitlements, `Gate`.
- Start screen with PhotosPicker/camera → `ImageKit` import → local project; project grid; rename/delete; signed-out
  draft; sign-in sheet; draft promotion on sign-in (upload as a new project, as the web does).
- `ProjectRepository` (list, get, create, CAS save, delete, preview URLs) + offline cache + save queue.
- First run on the simulator: sign in, see the web's projects with thumbnails.

### Step 4 — Editor: Crop → Tune → Build (6–8 days)

- Shell, step control, bottom rows, step rules (`canAdvance`, `canEnter`, `needsResetConfirm`), autosave.
- Crop view (custom, 90° rotation) producing web-compatible `CropParams`; thumbnails.
- Pipeline actor: crop → `Pixels` → grid → raster, cached per crop, debounced, cancellable.
- Tune controls, undo/redo with batching, stats pill.
- Build viewer (zoom/pan, windowed drawing, highlight, badges, row numbers), navigation incl. next/prev different,
  progress + milestones events, keep-awake, haptics, row-limit banner, progress preview sheet, blueprint export
  (SVG to the share sheet / Files), Purchase dice link.
- Parity check: open the same project on web and iOS (after step 1) and compare grids and progress.

### Step 5 — Share, account, analytics, errors (3–4 days)

- Share card renderer (Core Graphics, bundled Outfit/Syne), `createShare` port, share sheet + copy link + events.
- Account screen, delete account flow, sign-out.
- PostHog + Sentry wiring, screen names, event mirror.
- **First TestFlight** (internal testers = you): Product → Archive → Distribute → TestFlight. Review for TestFlight is
  light; IAP is not required yet. Use it on a real device for a week; fix what feels off.

### Step 6 — In-app purchase (4–5 days)

- RevenueCat SDK, products/offerings, paywall sheet, purchase + restore, `manageSubscriptionsSheet`, sandbox testing
  with a Sandbox Apple ID (App Store Connect → Users and Access → Sandbox), StoreKit configuration file for the
  simulator.
- Webhook end-to-end on the local stack (`functions:serve` + RevenueCat test events) and hosted.
- Entitlement edge cases: web-bought Studio shown correctly; Apple pass + later Stripe checkout refused; expiry.

### Step 7 — Submission (2–3 days + review wait)

- App Store listing: name/subtitle, description and keywords (reuse the SEO list in `app/layout.tsx`), category
  Graphics & Design, 4+ rating, support URL, marketing URL, privacy policy URL (`/privacy` updated to mention the app,
  Apple sign-in, RevenueCat), 6.9" screenshots (Claude renders them from the simulator), app preview optional.
- App Privacy questionnaire: email/name/user id (account), photos (user content, stored in the user's own storage),
  purchase history, product interaction + crash data (analytics), none used for tracking. `PrivacyInfo.xcprivacy`
  for required-reason APIs (UserDefaults, file timestamps); SDKs ship their own manifests.
- Review notes: a test account the reviewer can use (Sign in with Apple works with any Apple ID; also enable an
  email/password test user on the hosted project), how to reach the paywall, that purchases use the sandbox.
- Submit; typical first review takes 1–3 days; common rejections for this kind of app are listed in section 11.

---

## 10. Verification

- Core: every fixture exact (`swift test`), plus a parity script `npm run ios:parity -- <project id>` later if
  wanted: generates a grid in Node and in Swift for the same cropped JPEG and diffs them.
- App: XCTest for stores (undo batching, step rules, autosave CAS/conflict with a fake repository, offline queue),
  `Gate`, entitlements with Apple rows; one XCUITest smoke run (launch → sample photo → crop → tune → build).
- Manual, on device, per TestFlight build: sign-in both providers, sync with a web-made project, build a few rows,
  share to Messages, purchase in sandbox, restore, delete account (on a throwaway account).
- Integration suites for the new functions follow the web pattern (`SUPABASE_TEST=1`, skip otherwise).

---

## 11. Risks and how the plan handles them

| Risk | Handling |
|---|---|
| App Review 3.1.1 / 3.1.3(b) (external purchases) | IAP before public release; no links to Stripe checkout/portal in the app; neutral wording about web plans. The 2025 US court ruling allows external purchase links in the US only; not something to design v1 around. |
| 4.8 Sign in with Apple | Included from step 3. |
| 5.1.1(v) account deletion | Edge function in step 1, screen in step 5. |
| 5.1.1 forced sign-in | Signed-out drafts allowed (D8). |
| Web vs iOS grid differences | Persisted grid (D3); fixtures for the core; `jsRound`/float rules in section 4. |
| Schema skew between clients | Web ships schema changes first; iOS refuses unknown versions without overwriting. |
| Relay emails splitting accounts | Apple on the web too; provider shown on the account screen. |
| Two billing sources | Separate Apple columns, one `deriveEntitlements`, SQL mirror, double-pay refused. |
| Large grids (120 rows ≈ 19k dice) | Windowed drawing in Build, cached die bitmaps, raster off the main thread. |
| Memory for 2048 px originals | Downscale on import with `CGImageSource` thumbnails (never decode the full 48 MP photo). |
| Session persistence | supabase-swift stores the session in the Keychain; refresh handled by the SDK. |
| You are new to Xcode | Every step's doc lists the exact clicks; signing is automatic; Claude runs builds/tests/simulators from the terminal; the only things Claude cannot do are portal clicks (Apple Developer, App Store Connect, RevenueCat dashboards) and physical-device testing. |

---

## 12. Vocabulary (the Apple side, in one place)

- **Xcode**: Apple's IDE and build toolchain (installed: 26.6). Builds, runs on the Simulator, archives for upload.
- **Bundle identifier**: the app's reverse-DNS id (`art.diceify.app`); fixed forever once published.
- **Team / signing**: your Developer Program membership signs builds; "automatic signing" in Xcode handles
  certificates and provisioning profiles for you.
- **Capabilities**: features declared on the App ID (Sign in with Apple, In-App Purchase, later Associated Domains).
- **Simulator**: an iPhone in a window; Claude can boot it, install builds and take screenshots from the terminal.
- **TestFlight**: Apple's beta channel; internal testers (you) get builds within minutes, external testers after a
  light review.
- **App Store Connect**: the portal for the listing, screenshots, pricing, IAP products, TestFlight, review.
- **StoreKit 2 / RevenueCat**: Apple's purchase framework and the service that wraps it (products, receipts,
  restore, webhooks).
- **App Review guidelines**: numbered rules (3.1.1 purchases, 4.8 Sign in with Apple, 5.1.1 privacy/accounts).
- **Swift Package (SwiftPM)**: Swift's module/dependency system; `DiceCore` is one, with `swift test`.
- **SwiftUI**: Apple's declarative UI framework (think React with structs); `@Observable` classes are the stores.

---

## Step log

- **Step 0 (2026-10-03, repo side done; portals pending)** — `plans/ios/ios-step-0.md`. Decisions D1–D4 confirmed
  (+ grid backfill, web Build on the stored grid). `ios/DiceCore` package with the fixture harness and `jsRound`,
  tests green through Xcode's toolchain; `.gitignore`/ESLint ignores; `ios/README.md`. Web gates green
  (typecheck, test, lint, build from a scratch copy because `next dev` was running).
- **Step 1 (2026-10-03, done, uncommitted)** — `plans/ios/ios-step-1.md`. Schema v2 (`grid.rows`) + editor + backfill
  script (local dry run: 141 of 152 projects); `account` function + web delete account; `apple_*` columns +
  `effective_plan`/`effectivePlan`/`deriveEntitlements` with `source`; `revenuecat-webhook` + `billing/apple-sync`;
  Sign in with Apple on the web; `platform: 'web'` on events. All gates + integration + served-function checks green.
- **Step 2 (2026-10-03, done, uncommitted)** — `plans/ios/ios-step-2.md`. `ios/DiceCore`: dice pipeline, build math,
  encoding, SVG, document v2, billing, share ported; 52 Swift tests incl. all 8 fixtures and the SVG snapshot exact.
- **Step 3 (2026-10-03, done, uncommitted)** — `plans/ios/ios-step-3.md`. XcodeGen project, theme, Apple/Google
  sign-in wiring, local store + image import + repository + projects store, Start screen with photo import and the
  project grid, editor placeholder; 7 app tests incl. the repository lifecycle on the local stack; simulator flows
  verified by screenshot. Real sign-in round trips left to the user.
