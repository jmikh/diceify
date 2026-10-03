# iOS step 1 — web-side prep (shared backend changes)

Plan: `plans/ios/ios-app-plan.md` § 9 step 1. Everything here ships on the web before any iOS code depends on it.
Done 2026-10-03 on `master` (uncommitted until the user commits).

## What changed

### Schema v2: the grid travels with the document (D3)
- `core/dice/encoding.ts`: the fixture text format (`w3 b6r …`, row 0 = bottom) is now a core module (`encodeGrid`,
  `decodeGrid`, `gridRowsProblem`); `__fixtures__/format.ts` keeps only the `Fixture` type.
- `core/dice/document.schema.ts` / `document.ts`: `CURRENT_SCHEMA_VERSION = 2`, `grid: { width, height, rows: string[] | null }`
  validated against its size; `migrateDocument` upgrades v1 (`rows: null`) and still converts legacy drafts/rows;
  `decodeStoredGrid`; `GridInputs` + `gridInputsEqual` (what `progressApplies` is built on).
- Editor: `useDerivedStore` keeps `gridRows` (encoded once per generation) and `gridInputs` (the crop/dice it came from) and
  seeds the grid from a loaded document (`reset(doc)`), so Build renders at once; `buildDocument` writes `rows` only while
  they belong to the current crop/dice; `useDicePipeline` skips generation when the held grid matches the inputs (a loaded
  document's stored grid is the canonical one until a param changes); autosave reacts to `gridRows`.
- Backfill: `scripts/backfill-grids.ts` (+ `scripts/backfill/{cropImage,run}.ts`), `npm run backfill:grids`. sharp crop that
  mirrors `drawRegion`; compare-and-set on `cloud_version`; stale grid sizes replaced when nothing was placed, reported and
  left alone otherwise. Local dry run: 152 projects, 141 would be written (50 with progress), 11 without a crop, 2 stale sizes.

### Account deletion (App Store 5.1.1(v))
- `supabase/functions/account` `POST /delete` (`verify_jwt = true`) → `_shared/account-delete.ts`: cancel an active Stripe
  subscription, remove originals/thumbnails/share cards, delete the auth user (rows cascade).
- Web: `lib/supabase/account.ts`, "Delete account" section on `/account` (two-step confirm, then local sign-out, home).
- `lib/supabase/functions.ts`: the invoke/error-envelope helper shared by `billing.ts` and `account.ts`.

### Apple as a second billing source (D2 groundwork)
- Migration `20261003113657_apple_billing.sql`: `profiles.apple_plan / apple_product_id / apple_expires_at / apple_will_renew /
  apple_environment / apple_synced_at`; `effective_plan` mirrors the new priority.
- `core/billing/entitlements.ts`: `BillingState.applePlan/appleExpiresAt/appleWillRenew`, `Entitlements.source`
  (`'stripe' | 'apple' | null`); lifetime → studio (Stripe PRO, else unexpired Apple) → creator (later-ending pass) → explorer.
  `_shared/billing-snapshot.ts` `effectivePlan` is the third mirror (`hasPaidAccess` refuses a Stripe checkout while Apple grants).
- `_shared/apple-snapshot.ts` (pure, RevenueCat subscriber → columns; `studio*`/`creator*` product ids; pass = 30 days),
  `_shared/apple-sync.ts` (fetch + write), `revenuecat-webhook` function (shared-secret header, refetch-and-recompute,
  `purchase_completed` to PostHog with `store: 'app_store'`), `POST /billing/apple-sync` (503 until `REVENUECAT_SECRET_KEY`).
- Account page: Apple-sourced plans show App Store copy; cancel/resume only for Stripe-sourced Studio.

### Sign in with Apple on the web (D4)
- `signInWithApple` (`lib/supabase/auth.ts`); the modal's Apple button is a real sign-in next to Google (Facebook stays an
  "other method" placeholder). Needs the Services ID + key on the hosted Apple provider (`docs/DEPLOY.md`); untested locally
  (no Apple provider on the local stack) — **user to try on the hosted project after configuring it**.

### Analytics
- Every web event carries `platform: 'web'` (`lib/analytics.ts`); the app will send `platform: 'ios'` with the same names.

## Verification (all green, 2026-10-03)
- `npm run typecheck`, `npm run lint`, `npm test` (426 unit tests), `npm run functions:check` (4 functions), `npm run build`
  (from a scratch copy: `next dev` was running).
- Integration on the local stack (`SUPABASE_TEST=1`): projects/auth/shares suites with v2 documents; `scripts/backfill`
  (dry run, write, skip, stale sizes); `_shared/account-delete`; `_shared/apple-sync` incl. SQL `effective_plan` agreeing with
  TS `effectivePlan` and core `deriveEntitlements`.
- Served functions (`supabase functions serve` with RevenueCat placeholders, `REVENUECAT_API_URL` → a fake on the host):
  webhook 401 on a bad secret, TEST event, INITIAL_PURCHASE → columns + `effective_plan = studio`, anonymous id ignored;
  `billing/apple-sync` 200 with the Apple view / 401 anonymous; `account/delete` 200 and the user gone.
- `DEVELOPER_DIR=… swift test` (DiceCore harness, fixtures unchanged).

## Deploy order (user)
1. Push → Workers Build (web reads v2, writes rows on the next generation). 2. `npm run db:push` (apple columns).
3. `npm run functions:deploy` + secrets (`REVENUECAT_*` can wait for step 6; without them the webhook function fails to boot
   and `apple-sync` answers 503 — nothing else is affected). 4. `npm run backfill:grids -- --dry-run --target=hosted`, then
   without `--dry-run`. 5. Apple provider on the hosted project (Services ID + key) → try the web Apple button.

## Open
- `supabase/functions/.env.example` does not exist although docs mention it; the required variables are listed in DEPLOY.md.
- Local data was kept (`supabase migration up` instead of `db:reset`); a `db:reset` later re-proves the migration chain from zero.
