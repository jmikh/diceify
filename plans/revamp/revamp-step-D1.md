# Step D1 — Edge functions scaffold, billing sync, Stripe webhook

Scope (tiered plan): `supabase/functions/deno.json`, `_shared/{billing-snapshot (+vitest), billing-sync, stripe, supabase-admin,
http}.ts`, `stripe-webhook/index.ts`, `billing/index.ts` with only `GET /sync`, `config.toml` `[functions.*]`, `functions/.env.example`,
npm `functions:*` / `stripe:listen` scripts, `docs/STRIPE_TESTING.md`, `docs/DEPLOY.md` Stripe section, `lib/supabase/billing.ts`
(`syncBilling()` only) wired into `CheckoutSuccessHandler`. Not here: checkout/portal/cancel/resume routes, the Account page,
pricing wiring, `?checkout=success` polling (D2).

## Repo state found

- `app/api/**` and `lib/stripe.ts` are already gone (C3); `stripe@^20` is still in `package.json` with no importer.
- `supabase/functions/` exists but is empty; `vitest.config.ts` already includes `supabase/functions/_shared/**/*.test.ts`; the root
  `tsconfig.json` excludes `supabase/functions` (vitest ignores tsconfig `exclude`, so the test still runs); `.gitignore` has
  `supabase/functions/.env*`, which also ignores the `.env.example` this step commits → a `!` exception is added.
- `[functions.stripe-webhook]` is present but commented out in `config.toml` (C1: the CLI warns on every start without the folder).
- `npm:stripe@20` resolves to **20.4.1**, whose `apiVersion` option is typed as the literal `'2026-02-25.clover'`; the plan's
  `'2025-11-17.clover'` is a `deno check` error (TS2322). See Decisions.
- Legacy `.env.local` holds `sk_test_` Stripe credentials for the "diceify sandbox" account (prefix checked only); the Stripe CLI
  is logged into a *different* account, so local forwarding uses `stripe listen --api-key`.
- `functions.invoke('billing/sync')` works: functions-js builds `${url}/${functionName}`, so a sub-path rides along.

## Decisions

### Layout

```
supabase/functions/
  deno.json                 imports (stripe, @supabase/supabase-js, zod), compilerOptions { lib: ["deno.window"], strict }
  deno.lock                 committed (deterministic npm resolution for serve/deploy)
  .env.example              committed; .env is gitignored
  _shared/billing-snapshot.ts (+ .test.ts)   pure, zero imports
  _shared/billing-sync.ts   syncBillingFromStripe, shouldSync, toBillingView (type-only imports → vitest can load it)
  _shared/stripe.ts         getStripe() + assertStripeEnv()
  _shared/supabase-admin.ts service-role client
  _shared/http.ts           json/error envelope, CORS, handleOptions, requireUser
  stripe-webhook/index.ts   verify_jwt = false
  billing/index.ts          verify_jwt = true; GET /sync only
```

Relative imports carry `.ts` extensions (Deno); `npm:` specifiers only via `deno.json`. Nothing under `supabase/functions` imports the
app (`core`, `lib`); the PRO status set and the 30-day creator pass are mirrored with a comment (same rule as SQL `effective_plan`).

### Stripe SDK pin (design change)

`deno.json` pins `npm:stripe@20.4.1` and `_shared/stripe.ts` passes `apiVersion: '2026-02-25.clover'` (the SDK's own pin, exported as
`STRIPE_API_VERSION`). Bumping the SDK makes `deno check` fail until the literal is updated on purpose — the dashboard webhook endpoint
must be set to the same version. The tiered plan's `'2025-11-17.clover'` is replaced.

### Snapshot rules (`computeBillingSnapshot(current, facts, now)`)

Inputs: the stored `{ plan, planExpiresAt }`, `subscriptions.list({ customer, status: 'all', limit: 10 })`,
`checkout.sessions.list({ customer, limit: 20 })`, `now`. Everything is recomputed on every call; no per-event state.

| Field | Rule |
|---|---|
| chosen subscription | `pickSubscription`: newest (`created` desc) with status in `active/trialing/past_due`; else newest overall; none → `null` |
| `stripe_subscription_id` / `subscription_status` | from the chosen subscription; `null` without one |
| `current_period_end` | `items.data[0].current_period_end`, fallback root `current_period_end` (older payload versions); ISO string |
| `cancel_at` | `cancel_at`; fallback `cancel_at_period_end ? current_period_end : null` |
| `plan_expires_at` | `creatorExpiry`: max(stored, each session with `status === 'complete' && mode === 'payment' && (metadata.plan ?? metadata.planType) === 'creator'` → `created + 30 d`). Monotonic: never lowered |
| `plan` | `lifetime` if stored is lifetime (never downgraded) → `studio` if the chosen subscription is PRO → `creator` if `plan_expires_at > now` → `studio` if any subscription exists (lapsed, informational) → `creator` if an expiry exists (lapsed) → `explorer` |

Entitlements stay client-side (`deriveEntitlements` over the profile row): a lapsed `studio`/`creator` row derives explorer there and
in SQL `effective_plan`. The unit test imports `core/billing/entitlements` (test only) to pin that mapping.

### Sync (`syncBillingFromStripe(admin, stripe, by, now)`)

`by` = `{ profileId }` (billing function) or `{ stripeCustomerId }` (webhook). Load `profiles` (id, plan, plan_expires_at,
stripe_customer_id, subscription_status, current_period_end, cancel_at, synced_at) → no row → `null`. No `stripe_customer_id` → write
`synced_at` only (nothing to ask Stripe) → view. Else the two list calls → snapshot → `update profiles set <snapshot>, synced_at = now`
→ `BillingView { plan, subscriptionStatus, currentPeriodEnd, cancelAt, planExpiresAt, hasStripeCustomer, syncedAt }` (camelCase;
what the client shows). `shouldSync(syncedAt, now, minIntervalMs)` = no timestamp, unparsable, or older than the interval; the billing
function uses `SYNC_MIN_INTERVAL_MS = 30_000` and answers from the row when skipping (log line `billing/sync: skipped (synced 12s ago)`).

### Webhook

`Deno.serve` → `req.text()` raw → `stripe.webhooks.constructEventAsync(raw, sig, STRIPE_WEBHOOK_SECRET)` (SubtleCrypto; missing header or
bad signature → 400 `INVALID_SIGNATURE`). Event types that trigger a sync: `checkout.session.completed`,
`customer.subscription.{created,updated,deleted,paused,resumed}`, `invoice.{paid,payment_failed,payment_action_required}`. Customer id
= `object.customer` (string or expanded object); no customer → 200 ignored. Unknown customer (no profile) → `console.warn` + 200
`{ received: true, unknownCustomer: true }` (a `stripe trigger` fixture, or a customer created outside the app). Stripe/DB failure → 500
`INTERNAL` so Stripe retries. Anything else → 200 `{ received: true, ignored: true }`. Idempotent by construction (full recompute).

### Billing function

Router on the pathname after `/billing`: `GET /sync` → `requireUser` (401 `UNAUTHORIZED` envelope; the gateway already 401s requests
without any JWT because `verify_jwt = true`) → profile via service role → `shouldSync` ? sync : row → 200 `{ billing: BillingView }`.
Missing profile → 404 `NOT_FOUND`. Other paths → 404 `NOT_FOUND` (D2 list in a comment). CORS: `*`, headers
`authorization, apikey, content-type, x-client-info`; `OPTIONS` → 204. Errors: `{ error: { code, message, details? } }`.

### Secrets / env

| Var | Local (`supabase/functions/.env`, gitignored) | Hosted |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` | `supabase secrets set` (`sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` printed by `stripe listen` (changes per session) | dashboard endpoint secret |
| `STRIPE_{CREATOR,STUDIO_MONTHLY,STUDIO_YEARLY}_PRICE_ID` | test prices | live prices (D2 uses them) |
| `APP_URL` | `http://localhost:3000` | `https://diceify.art` (D2 success/cancel URLs) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | injected by the runtime (`http://kong:8000` locally) | injected |

`assertStripeEnv()` (called at boot by both functions): key missing → throw; `sk_test_` while `SUPABASE_URL` is not local
(`127.0.0.1`/`localhost`/`kong`) → throw; `sk_live_` locally → `console.warn`.

### Client

`lib/supabase/billing.ts`: `BillingView` (mirror of the `_shared` type, documented as such — `lib` cannot import Deno code) and
`syncBilling()` = `functions.invoke('billing/sync', { method: 'GET' })`, unwrapping the error envelope into an `Error` with the code.
`CheckoutSuccessHandler` calls `syncBilling()` (failure logged, not fatal) and then `refresh()`; D2 replaces it with polling on
`/account`. No other UI change.

### Tooling

- Scripts: `functions:serve` (`supabase functions serve --env-file supabase/functions/.env`), `functions:deploy`, `functions:check`
  (`deno check` on both entry points — pulls every `_shared` module), `stripe:listen`
  (`stripe listen --forward-to http://127.0.0.1:54331/functions/v1/stripe-webhook`; add `--api-key sk_test_…` when the CLI login is
  another account). `functions:check` is not part of `typecheck` (Deno is a Homebrew install, not an npm dependency) — documented.
- `stripe` removed from `package.json` (Deno owns it now).
- ESLint: `supabase/functions/**` lints under the normal TS config (no `no-undef` for TS; `Deno` is fine); nothing special needed.

## Local run

```sh
npm run db:start
npm run functions:serve          # terminal 2 (reads supabase/functions/.env)
npm run stripe:listen            # terminal 3 → paste the printed whsec_ into supabase/functions/.env, restart serve
npm run dev                      # terminal 4
```

## Test plan

1. `npm run functions:check` (deno check both entry points).
2. Unit (`billing-snapshot.test.ts`, vitest): active+canceled → active picked; only canceled → `plan: 'studio'` and `deriveEntitlements`
   → explorer; creator via `planType` metadata; monotonic expiry; lifetime kept with subscription facts; item-level period end +
   root fallback; `cancel_at` fallback; no customer facts → explorer; `shouldSync` window.
3. Webhook against `functions:serve`: signed `customer.subscription.updated` with an unknown customer → 200 + warn; bad signature → 400;
   `ping`-type event → 200 ignored; `stripe trigger customer.subscription.updated --api-key …` through `stripe listen` → same.
4. `GET /billing/sync`: no JWT → 401; user JWT (Admin API user + password grant), no customer → `{ plan: 'explorer',
   hasStripeCustomer: false }`; test customer + `pm_card_visa` subscription via the Stripe API, `stripe_customer_id` set with psql →
   `plan='studio'`, `subscription_status='active'`, `current_period_end` set; second call within 30 s logs "skipped".
5. `npm run typecheck && npm test && npm run lint && npm run build`.
