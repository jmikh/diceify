# iOS step 6 — In-app purchase (RevenueCat)

Plan: `plans/ios/ios-app-plan.md` § 7.3 and § 9 step 6. Code done 2026-10-04 (uncommitted).

**User decision (2026-10-04): the app sells Studio only (monthly / yearly).** The Creator pass is not an App Store
product for now. A Creator pass bought on the web is still honoured and shown in the app. The server keeps
recognising `creator…` products (`_shared/apple-snapshot.ts`), so adding the pass later is App Store Connect and
RevenueCat setup plus the card on the paywall. The store setup is portal
work only the user can do (App Store Connect, RevenueCat, Supabase secrets, below); until then the paywall says
"In-app purchases are not set up in this build".

## What exists

### App (`ios/Diceify`)
- **`Services/Purchases.swift`**, the one RevenueCat importer (purchases-ios-spm 5.92): `PurchaseBackend` protocol,
  `RevenueCatStore` (configured at launch from `REVENUECAT_API_KEY`, anonymous until sign-in; `logIn` with the Supabase
  user id **lower-cased**, since RevenueCat ids are case-sensitive and `UUID.uuidString` is upper case; `logOut` on
  sign-out), `StoreOffer` (plan, StoreKit's localized price, the yearly per-month price). A `studio…` product (after an
  optional reverse-DNS prefix, like the server's `planOfProduct`) maps to monthly or yearly by its subscription
  period; any other product, `creator…` included, is ignored. RevenueCat errors become `StoreFailure` messages in the buyer's words.
  `FakeStore` (DEBUG only) holds the web's prices for tests and `--ui-fake-store`.
- **`Features/Paywall/`**: `PaywallModel` loads the offers. A purchase or restore is followed by `billing/apple-sync`
  (up to 3 tries), then a profile reload; the plan shown is always the profile's (single source).
  `PaywallSheet` replaces step 5's `UpgradeSheet`:
  - the web's two headers ("Build Limit Reached" for the row limit, "Upgrade to Pro" otherwise);
  - the Studio card (Monthly / Yearly pill with the savings %), the web's Studio card;
  - the footer: renewal terms, Restore purchases, Terms of Use, Privacy Policy, "Maybe later";
  - "You're all set!" (the web's "already have access" copy) once the profile has a paid plan.
  States: loading, unavailable + Try again, purchase cancelled (silent), pending approval (Ask to Buy), purchased but
  the sync failed (tells the buyer to refresh on the Account screen).
- **Deliberate difference from the web** (App Store 3.1.2(c)): yearly Studio shows the billed amount ("$36.00 /year")
  as the big price and "$3.00/month, billed annually" under it. The web leads with the per-month price, which App
  Review rejects.
- **No stacking** (as on the web): an account with any paid plan sees "You're all set!" instead of the cards, and `buy`
  refuses. The server already refuses a Stripe checkout while an Apple plan is active (`hasPaidAccess`, step 1).
- **Account screen**:
  - "See plans" opens the paywall (`source: account_page`);
  - an Apple Studio plan gets **Manage subscription** (the system `manageSubscriptionsSheet`, then apple-sync on
    close);
  - **Restore purchases** for every plan except lifetime;
  - the Apple Studio status line now ends "Subscribed in this app." (the button replaced the Settings directions).
- **AppSession** conforms to `BillingAccount` (`userId`, `entitlements`, `syncAppleBilling()`), holds the store and
  forwards sign-in/out to it.
- Analytics: `click_upgrade` (`limit_reached` / `pro_feature_modal` / `account_page` + `plan_type`), the new
  `checkout_started` (`plan`) before the App Store sheet, screen `paywall`. The purchase itself is
  `purchase_completed`, sent server-side by the webhook (step 1).
- Config: `REVENUECAT_API_KEY` in `Config/*.xcconfig` → Info.plist → `AppConfig.revenueCatKey`. Debug = the Test Store
  key, Release = the App Store key (the SDK crashes a Release build that carries a `test_` key).
- DiceCore: `CheckoutPlan` (port of `core/billing/plans.ts`).
- DEBUG launch args: `--ui-paywall` (with `--ui-account`), `--ui-fake-store`, `--ui-buy <plan>`.

### Server
- **TRANSFER events** (a restore on another Diceify account moves the purchases there) carry no `app_user_id`. Before
  this step the webhook ignored them, so the losing account kept its plan until expiry. `userIdsOf` (in
  `_shared/apple-snapshot.ts`, unit-tested) returns every Supabase id in `transferred_from` + `transferred_to`, and
  the webhook recomputes each one.

### No StoreKit configuration file
The plan mentioned an Xcode `.storekit` file. RevenueCat's **Test Store** replaces it: simulated purchases in the
simulator with no App Store Connect setup and no certificate upload. Real StoreKit is tested on TestFlight (purchases
there are free sandbox purchases).

## Verification (2026-10-04)
- `xcodebuild test`: **43 tests in 15 suites** green (13 new):
  - `StoreOfferTests`: product id → plan, lower-case app user id, `checkout_started`, sources;
  - `PaywallModelTests`: offers, monthly only, unavailable ×3, paid plan blocks buying, purchase → sync → active,
    cancelled / pending, sync failing 3× keeps the purchase visible, store failure shown, signed out, restore with
    nothing / with Studio.
- DiceCore `swift test` 52 green. Release build for a generic device (`CODE_SIGNING_ALLOWED=NO`) succeeds (no DEBUG
  code leaks).
- Web gates: typecheck, vitest 460 (incl. `userIdsOf`), lint, `functions:check`, build (scratch copy, `next dev` was
  running).
- **Served functions + fake RevenueCat API** (local stack):
  - TRANSFER from a temporary user A (Studio) to the dev user B → A's `apple_*` columns cleared, B's set to
    `studio_yearly`, in one event.
  - In the simulator, `--ui-fake-store --ui-buy studio_yearly` → the app's real `billing/apple-sync` → fake
    RevenueCat → profile → paywall "You're all set!" → Account shows Studio, "Renews on … Subscribed in this app.",
    Manage subscription.
  - Test data removed afterwards.
- Screenshots: the paywall (Studio only; card and footer on one screen), the Account screen as Explorer and as Apple
  Studio.
- **Not testable by Claude**:
  - the real App Store sheet and a sandbox purchase;
  - the RevenueCat Test Store modal (it needs a tap, and the keys);
  - `manageSubscriptionsSheet` with a real subscription;
  - RevenueCat → hosted webhook.
  All of these are for the user after the setup below.

## User setup (portals), in order

Prices (D7) are your call. Parity is $9 / $36 (App Store Connect offers whole-dollar price points); the round-up
alternative is $9.99 / $39.99. The app shows whatever StoreKit returns, and the savings badge is computed from
the two Studio prices.

1. **App Store Connect → Business (Agreements, Tax, and Banking)**: accept the **Paid Apps** agreement, add the bank
   account and tax forms. Products do not load, even in the sandbox, until it is active.
2. **App Store Connect → Apps → Diceify → Monetization → Subscriptions**: create the group **Studio**, then two
   subscriptions:
   - `studio_monthly`: reference name "Studio Monthly", duration 1 month;
   - `studio_yearly`: reference name "Studio Yearly", duration 1 year.

   For each one set the price, availability (all countries) and an English localization (display name "Studio",
   description "Unlimited building and SVG blueprints"). Then the group's localization (display name "Diceify Studio").
   Each subscription needs a **review screenshot**; Claude can render one of the paywall from the simulator on
   request. (No In-App Purchase for the Creator pass: not sold in the app for now.)
3. **App Store Connect → Users and Access → Integrations → In-App Purchase**: generate a key. Download the `.p8` (only
   once) and note the Key ID and the Issuer ID shown on that page.
4. **RevenueCat** (app.revenuecat.com): create the project **Diceify**.
   - Apps & providers → **+ App Store**: name Diceify, bundle id `art.diceify.app`, upload the `.p8` with its Key ID and
     Issuer ID. Copy its **public API key** (`appl_…`).
   - Apps & providers → **Test Store** (create it). Copy its key (`test_…`).
   - Product catalog → **Products**: add `studio_monthly` and `studio_yearly` to the App Store app (import), and create
     the same two ids in the Test Store as subscriptions of 1 month / 1 year.
   - Product catalog → **Offerings**: one offering `default`, marked **current**, with two packages: Monthly
     (`$rc_monthly`) → `studio_monthly`, Annual (`$rc_annual`) → `studio_yearly`. Pick the product of both stores in
     each package. Entitlements are optional (dashboard charts only): the app and
     the backend read product ids.
   - Project settings → **API keys → + New secret API key**, **API version V1**. This is `REVENUECAT_SECRET_KEY`
     (`sk_…`); `GET /v1/subscribers` needs a V1 key.
   - Integrations → **Webhooks → +**: URL `https://pmxvjcnxnwzuggnuhkol.supabase.co/functions/v1/revenuecat-webhook`,
     Authorization header value = a long random string you make up (`openssl rand -hex 32`), which becomes
     `REVENUECAT_WEBHOOK_SECRET`. Environments: production **and** sandbox. Events: all.
   - Project settings → keep **Restore behavior = Transfer to new App User ID** (the default).
5. **Supabase (hosted)**: `npx supabase secrets set REVENUECAT_SECRET_KEY=sk_… REVENUECAT_WEBHOOK_SECRET=…` (or add
   both to the hosted env file you pass to `supabase secrets set --env-file`, DEPLOY.md § Hosted), then
   `npm run functions:deploy` (the webhook does not boot without both). Send RevenueCat's "Send test event" from the
   webhook page: it should answer 200. **Local**: add the same two lines to `supabase/functions/.env` so the simulator's
   Test Store purchases sync through the local `billing/apple-sync`.
6. **Keys into the app**: `ios/Diceify/Config/Debug.xcconfig` `REVENUECAT_API_KEY = test_…` and `Release.xcconfig`
   `REVENUECAT_API_KEY = appl_…`. Both are public keys, safe to commit like the PostHog key.
7. **Try it**:
   - Simulator (Debug, local stack): Account → See plans → Subscribe → RevenueCat's Test Store sheet → "Purchase" →
     "You're all set!". Claude can drive everything up to that tap
     (`--ui-login … --ui-account --ui-paywall --ui-buy studio_yearly`).
   - Phone (TestFlight build): the real App Store sheet with your own Apple ID. Purchases there are free sandbox ones,
     and subscriptions renew every few minutes, then lapse after a few renewals. Check that Account shows the plan,
     Manage subscription opens Apple's sheet, and Restore purchases works after deleting and reinstalling the app.

## Findings
- RevenueCat TRANSFER events have no `app_user_id` (fixed above).
- RevenueCat app user ids are case-sensitive; `UUID.uuidString` is upper case, Supabase ids lower case.
- RevenueCat grants non-renewing products indefinitely in `CustomerInfo` entitlements, so the app never derives a plan
  from the SDK; the server computes a pass end (purchase + 30 days) should the Creator pass ever be sold in the app.
- The SDK `fatalError`s in a Release build configured with a Test Store key: Debug and Release must keep separate keys.
- `static let x: [LocalizedStringKey]` is not `Sendable` under Swift 6 strict concurrency; a computed `static var` is.
- The account screen's restore reuses `PaywallModel` (restore + apple-sync + plan check) without its cards.
