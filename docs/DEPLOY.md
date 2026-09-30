# Deploying Diceify

Backend = Supabase (Auth + Postgres + Storage + two edge functions). Frontend = static Next.js export on Cloudflare Pages.
This file is filled in step by step (C1 local dev → D1 Stripe → E1 Pages → F2 cut-over); see `plans/revamp/revamp-tiered-plan.md`.

## Local dev (C1)

Prerequisites: Docker running, Supabase CLI via Homebrew (`brew install supabase/tap/supabase`; the repo does not pin the
CLI as an npm dependency — 2.84+ is known to work).

```sh
npm run db:start      # boots the local stack (ports 5433x, see supabase/config.toml) and applies supabase/migrations
npm run db:status     # prints API URL, anon/service keys, DB URL, Studio URL (http://127.0.0.1:54333)
npm run db:reset      # drops + re-applies migrations + seed.sql
npm run db:migration -- <name>   # new empty migration file (YYYYMMDDHHMMSS_<name>.sql)
npm run db:types      # regenerates lib/supabase/database.types.ts (commit it)
npm run db:stop
```

Env files (all gitignored except `.env.example`):

- `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, optional
  `NEXT_PUBLIC_SENTRY_DSN` (copy from `.env.example`; local values are printed by `db:status`).
- `supabase/.env` — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, read by `env(...)` in `supabase/config.toml`. Add
  `http://127.0.0.1:54331/auth/v1/callback` as an authorized redirect URI on the Google OAuth client for local sign-in.
- `supabase/functions/.env` — Stripe secrets for `npm run functions:serve` (template `supabase/functions/.env.example`; `docs/STRIPE_TESTING.md`).

Test users: auth users cannot be seeded; create them with the Admin API against the local stack:

```sh
curl -X POST http://127.0.0.1:54331/auth/v1/admin/users -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' -d '{"email":"a@test.dev","password":"pass1234","email_confirm":true,"user_metadata":{"full_name":"A"}}'
```

Schema changes: never edit an applied migration; add a new one (`db:migration`), `db:reset`, then `db:types`.

## Google OAuth (C2)

Sign-in is `supabase.auth.signInWithOAuth({ provider: 'google' })` (PKCE; `lib/supabase/auth.ts`). One Google OAuth client
(Google Cloud console → APIs & Services → Credentials, type "Web application") serves both environments; it needs no extra
scopes (the old People API birthday scope is gone).

- **Authorized redirect URIs** on the Google client — Google returns to Supabase Auth, never to the app:
  - local: `http://127.0.0.1:54331/auth/v1/callback`
  - hosted: `https://<project-ref>.supabase.co/auth/v1/callback`
- **Credentials**: local → `supabase/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; `supabase/config.toml` reads them with
  `env(...)`; `skip_nonce_check = true` is required for the supabase-js PKCE flow). A missing `supabase/.env` is silent — the
  provider stays enabled with empty credentials and the sign-in lands on a GoTrue error page. Hosted → Dashboard → Authentication
  → Providers → Google (same id/secret, "Skip nonce check" on).
- **Redirect allow-list** (Supabase Auth → URL Configuration; local: `additional_redirect_urls` in `config.toml`): the app's
  `redirectTo` is `${origin}/editor?restored=true`, so allow `http://localhost:3000/**` (local), `https://diceify.art/**` and
  `https://*.diceify.pages.dev/**` (E1 previews). Site URL: `http://localhost:3000` local, `https://diceify.art` hosted.
- Headless check without a browser: `SUPABASE_TEST=1 SUPABASE_SERVICE_ROLE_KEY=… npx vitest run lib/supabase/auth.integration.test.ts`
  (password sign-in → own `profiles` row through RLS → plan change → entitlements).

## Hosted Supabase project (E1 / F2)

TODO: `supabase link --project-ref <ref>`, `supabase db push`, `supabase functions deploy`, `supabase secrets set`,
Google provider (client id/secret, `skip_nonce_check`), Site URL `https://diceify.art`, redirect allow-list
(`http://localhost:3000/**`, `https://diceify.art/**`, `https://*.diceify.pages.dev/**`).

## Cloudflare Pages (E1)

TODO: project setup (build `npm run build`, output `out`, Node 20), env vars (`NEXT_PUBLIC_*`), production branch
`master`, preview branch `revamp`, `public/_headers`, DNS.

## Stripe (D1)

Local testing (env, run order, cards, flows, hand-signed events): `docs/STRIPE_TESTING.md`. Deploying the functions:
`npm run functions:deploy` (= `supabase functions deploy`, after `supabase link`); `config.toml` carries `verify_jwt = false` for
`stripe-webhook` and `true` for `billing`.

- **Products/prices** (live mode): Creator $19 one-time, Studio $9/month and $36/year. Their ids go into the secrets below; the
  one-time checkout must carry `metadata.plan = 'creator'` (D2 sets it) — that is how the sync recognises a creator purchase.
- **Secrets** (hosted): `supabase secrets set --env-file supabase/functions/.env.production` with `STRIPE_SECRET_KEY` (`sk_live_`),
  `STRIPE_WEBHOOK_SECRET`, the three `STRIPE_*_PRICE_ID`s and `APP_URL=https://diceify.art`. The functions refuse an `sk_test_` key
  outside the local stack. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are injected.
- **Webhook endpoint** (dashboard → Developers → Webhooks → Add endpoint): URL
  `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`; **API version `2026-02-25.clover`** — the version pinned in
  `supabase/functions/_shared/stripe.ts` (`STRIPE_API_VERSION`, the `stripe@20.4.1` SDK's own pin; change both together). Events:
  `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`,
  `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`,
  `invoice.payment_action_required`. Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. Every event only names the
  customer; the function recomputes the whole snapshot from Stripe, so a missed or reordered event is harmless.
- **Customer Portal** (live mode, once): dashboard → Settings → Billing → Customer portal → save a configuration (invoices, payment
  method; cancellation may stay off — the app cancels through its own route). `POST /billing/portal` fails until it exists.
- **Cut-over (F2)**: disable the old Vercel endpoint once this one is live; the customer ids carry over unchanged (the migration
  script copies `stripe_customer_id`, then `syncBillingFromStripe` fills the rest).

## Cut-over (F2)

TODO: runbook — freeze old site, `migrate:legacy --dry-run` then for real, smoke tests, DNS move, old DB read-only 30 days.
