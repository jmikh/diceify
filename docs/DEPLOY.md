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
- `supabase/functions/.env` — Stripe secrets for `supabase functions serve` (D1).

Test users: auth users cannot be seeded; create them with the Admin API against the local stack:

```sh
curl -X POST http://127.0.0.1:54331/auth/v1/admin/users -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' -d '{"email":"a@test.dev","password":"pass1234","email_confirm":true,"user_metadata":{"full_name":"A"}}'
```

Schema changes: never edit an applied migration; add a new one (`db:migration`), `db:reset`, then `db:types`.

## Hosted Supabase project (E1 / F2)

TODO: `supabase link --project-ref <ref>`, `supabase db push`, `supabase functions deploy`, `supabase secrets set`,
Google provider (client id/secret, `skip_nonce_check`), Site URL `https://diceify.art`, redirect allow-list
(`http://localhost:3000/**`, `https://diceify.art/**`, `https://*.diceify.pages.dev/**`).

## Cloudflare Pages (E1)

TODO: project setup (build `npm run build`, output `out`, Node 20), env vars (`NEXT_PUBLIC_*`), production branch
`master`, preview branch `revamp`, `public/_headers`, DNS.

## Stripe (D1)

TODO: products/prices, webhook endpoint `https://<ref>.supabase.co/functions/v1/stripe-webhook` (pinned API version),
`supabase secrets set STRIPE_*`, local `stripe listen` — see `docs/STRIPE_TESTING.md`.

## Cut-over (F2)

TODO: runbook — freeze old site, `migrate:legacy --dry-run` then for real, smoke tests, DNS move, old DB read-only 30 days.
