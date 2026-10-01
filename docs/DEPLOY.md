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

- `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional
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

Project **diceify**, ref `pmxvjcnxnwzuggnuhkol`, URL `https://pmxvjcnxnwzuggnuhkol.supabase.co`. Created 2026-10-01.

Done from the CLI (2026-10-01): `supabase link --project-ref pmxvjcnxnwzuggnuhkol` (ref saved in `supabase/.temp/`),
`npm run functions:deploy` (`billing`, `stripe-webhook`). `.env.prod.local` (gitignored) holds the hosted URL + anon key for
`npm run dev:prod` / `npm run build:prod`.

Still to do, in order:

1. **Schema**: `npm run db:push` — prompts for the database password (Dashboard → Project Settings → Database). Applies
   `supabase/migrations/*.sql` (tables, RLS policies, triggers, the `project-images` bucket + storage policies).
   Afterwards `npm run db:types:prod` must produce no diff.
2. **Google provider**: Dashboard → Authentication → Providers → Google: enable, paste the client id/secret from
   `supabase/.env`, tick **Skip nonce check**. Google Cloud → the OAuth client's **Authorized redirect URIs** needs
   `https://pmxvjcnxnwzuggnuhkol.supabase.co/auth/v1/callback` (Google returns to Supabase, never to the app).
3. **URL configuration** (Authentication → URL Configuration). The app's `redirectTo` is
   `${window.location.origin}/editor?restored=true` or `/account`, so every host needs a wildcard entry:
   - **Site URL**: `https://diceify.art`
   - **Redirect URLs**: `http://localhost:3000/**` (local `next dev`, incl. `dev:prod`), `https://diceify.art/**`,
     `https://*.diceify.pages.dev/**` (every Cloudflare Pages preview).
4. **Function secrets**: `supabase secrets set --env-file supabase/functions/.env.production` where that file (gitignored,
   never committed) holds `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (from the live webhook endpoint below), the three
   price ids and `APP_URL=https://diceify.art`. Until go-live you can point it at the **test** keys instead
   (`cp supabase/functions/.env supabase/functions/.env.production`, set `APP_URL` to the URL you are testing from) so the
   preview and `dev:prod` exercise checkout with test cards; swap to live keys at cut-over.
5. **Stripe webhook** (per mode): endpoint `https://pmxvjcnxnwzuggnuhkol.supabase.co/functions/v1/stripe-webhook`, events
   listed in the Stripe section, API version pinned to `STRIPE_API_VERSION` in `supabase/functions/_shared/stripe.ts`.

The local stack keeps only `http://localhost:3000/**` (`additional_redirect_urls` in `supabase/config.toml`).

### Local dev against local vs hosted Supabase

| command | Supabase | env file |
|---|---|---|
| `npm run dev` / `npm run dev:local` | local stack (`npm run db:start`) | `.env.local` |
| `npm run dev:prod` | hosted project | `.env.prod.local` (loaded with `node --env-file`; already-set vars win over `.env.local`) |
| `npm run build:prod` | hosted project | `.env.prod.local` (for a `wrangler pages deploy out` direct upload) |

`dev:prod` uses the hosted database and functions but the Next dev server on `localhost:3000`, which is why
`http://localhost:3000/**` must stay in the hosted redirect allow-list. Functions are not served locally in that mode.

## Cloudflare Pages (E1)

The site is a static export: `next.config.js` has `output: 'export'` and `npm run build` writes `out/` (`index.html`,
`editor.html`, `account.html`, `blog.html`, `blog/<slug>.html`, `dice-art.html`, `gallery.html`, `privacy.html`, `terms.html`,
`404.html`, `sitemap.xml`, `robots.txt`, `_headers`, `_next/**`). Pages resolves `/editor` → `editor.html` and
`/blog/<slug>` → `blog/<slug>.html` on its own and serves `404.html` (status 404) for unknown paths, so there is no
`_redirects` file. `public/_headers` adds the security headers (`nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`,
`Permissions-Policy`); no CSP yet. The social card is the static `public/images/og-card.jpg` (1200×630); the old
`opengraph-image`/`twitter-image` routes are gone. There is no server: no `app/api`, no middleware, no Vercel analytics.

### Git integration (recommended)

One-time, in the Cloudflare dashboard (nothing is scripted — `wrangler` was not logged in on the machine that ran E1):

1. Workers & Pages → **Create** → **Pages** → **Connect to Git** → pick this GitHub repo. Project name `diceify`
   (gives `https://diceify.pages.dev`; previews are `https://<branch>.diceify.pages.dev`).
2. **Production branch**: `master`. Preview deployments: "All non-Production branches" (so pushing `revamp` publishes
   `https://revamp.diceify.pages.dev`; until the cut-over `master` still deploys the old Vercel site and the Pages
   production build of `master` is unused).
3. **Build settings**: framework preset "None" (or "Next.js (Static HTML Export)"), build command `npm run build`,
   build output directory `out`, root directory `/`.
4. **Environment variables** (set for both Production and Preview; they are inlined at build time, none is a secret):

   | Variable | Production | Preview (`revamp`) |
   |---|---|---|
   | `NODE_VERSION` | `20` | `20` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | same hosted project (the local stack is not reachable from Pages) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | hosted anon key | same |
   | `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional, unset = inert) | same or unset |
   | `SENTRY_AUTH_TOKEN` | Sentry auth token (optional; enables the source-map upload — keep it a Pages *secret*) | same or unset |
   | `SENTRY_ORG` | Sentry org slug (with the token) | same |
   | `SENTRY_PROJECT` | Sentry project slug (with the token) | same |

   A build with the `NEXT_PUBLIC_*` values missing still succeeds (`lib/env.public.ts` validates on first access), so a
   misconfigured project fails at sign-in/save in the browser, not at build time — check the variables first when that happens.
   Do **not** set `NODE_ENV=production` or `NPM_FLAGS=--omit=dev` on the project: `typescript`, `tailwindcss`, `postcss` and
   `@types/*` are devDependencies and `next build` needs them (Pages' default `npm install`/`npm ci` includes them).
5. Save and deploy. Preview URL after the first `revamp` build: `https://revamp.diceify.pages.dev` (not created yet — see the
   step log in `plans/revamp/revamp-tiered-plan.md`).

### Sentry (optional)

Client-side only (`instrumentation-client.ts`; the static export has no server). Create a Sentry project (platform
"Next.js"), put its DSN in `NEXT_PUBLIC_SENTRY_DSN`; without it the SDK is inert (no network, no console noise). For
readable stack traces set `SENTRY_AUTH_TOKEN` (an org auth token with `project:releases` + `org:read`), `SENTRY_ORG`
and `SENTRY_PROJECT` in the Pages build env: `withSentryConfig` (next.config.js) then generates hidden source maps,
uploads them and deletes them from `out/`. Without the token no maps are generated at all. A failed upload fails the
build (the plugin's default). Events are tagged `where=<site>` (see `lib/report-error.ts`) and carry the user id.

### Direct upload (alternative, no Git integration)

```sh
npx wrangler login                                     # once, opens the browser
npx wrangler pages project create diceify --production-branch master   # once
npm run build
npx wrangler pages deploy out --branch revamp --project-name diceify   # preview; --branch master = production
```

`wrangler` is not a repo dependency (Homebrew `wrangler` 4.x or `npx wrangler@4` both work). Environment variables are
still read from the local `.env.local` by `next build` in this path, so build with the hosted values in that file.

### Custom domain / DNS (F2)

At cut-over: Pages project → Custom domains → add `diceify.art` and `www.diceify.art` (Cloudflare provisions the certificate;
if the zone is not on Cloudflare, point a `CNAME` at `diceify.pages.dev`), then remove the domain from the Vercel project.
The Supabase Site URL and the edge functions' `APP_URL` secret are already `https://diceify.art`.

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

## Legacy data migration (F1)

`scripts/migrate-from-prisma.ts` (`npm run migrate:legacy`) copies the users the plan keeps — paid (any non-explorer plan,
subscription status or Stripe customer) or active in the last 30 days — with their projects from the old Prisma/Postgres
database into Supabase. Design and mapping tables: `plans/revamp/revamp-step-F1.md`. The legacy database is only read
(`default_transaction_read_only` on the connection); the target is whatever `SUPABASE_URL`/`TARGET_DATABASE_URL` name.

Env: `LEGACY_DATABASE_URL` (process env or `.env.local`; falls back to `DATABASE_URL` with a warning); `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `TARGET_DATABASE_URL` (process env; read from `supabase status -o env` when unset and the target
is local); `STRIPE_SECRET_KEY` (process env or `supabase/functions/.env`; never `.env.local`). A non-local `SUPABASE_URL`
is refused without `--target=hosted`, and `--target=hosted` is refused with an `sk_test_` key.

```sh
npm run db:start && npm run db:reset                       # local rehearsal target
npm run migrate:legacy -- --dry-run                         # reads + image decode only; prints the summary
npm run migrate:legacy -- --report=/tmp/migrate-1.json      # real run (local stack); rerun must show 0 created
npm run migrate:legacy -- --only=someone@example.com        # one user; --since=YYYY-MM-DD moves the activity cut-off
```

Flags: `--dry-run`, `--since`, `--only`, `--no-sync-stripe`, `--no-ignore-limit` (let the plan-limit trigger reject the
oldest projects; default keeps every project), `--report=<file>` (legacy ids; `--report-emails` adds emails), `--target=hosted`.
Idempotent: profiles by `legacy_id`/email, projects by `legacy_id`; a rerun re-applies the profile columns and skips
existing projects. With a test-mode key every legacy (live) customer answers "customer not found in this Stripe mode" and
keeps the legacy-mapped columns; the live sync at cut-over fills `cancel_at`/`current_period_end`/`plan_expires_at`.

### Google-linking check (manual, before the hosted run)

Migrated users are admin-created with `email_confirm: true` and no Google identity; their first Google sign-in must attach
to that user instead of creating a second one. Supabase docs (Identity linking → Automatic linking): "When a new user signs
in with OAuth, Supabase Auth will attempt to look for an existing user that uses the same email address. If a match is
found, the new identity is linked to the user." The page does not mention admin-created users, so verify once on the
local stack with your own Gmail (`supabase/.env` Google credentials + `npm run dev`):

```sh
SR=$(supabase status -o env | grep '^SERVICE_ROLE_KEY' | cut -d= -f2 | tr -d '"')
curl -s -X POST http://127.0.0.1:54331/auth/v1/admin/users -H "apikey: $SR" -H "Authorization: Bearer $SR" \
  -H 'Content-Type: application/json' -d '{"email":"<your gmail>","email_confirm":true,"user_metadata":{"full_name":"Me"}}'
# open http://localhost:3000/editor → sign in with Google using that Gmail, then:
psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2 | tr -d '"')" -c \
  "select (select count(*) from auth.users where email = '<your gmail>') as users, \
          (select count(*) from auth.identities i join auth.users u on u.id = i.user_id where u.email = '<your gmail>' and i.provider = 'google') as google_identities"
# expected: users = 1, google_identities = 1. Two users → stop: enable manual linking (Authentication → Providers →
# "Allow manual linking" / GOTRUE_SECURITY_MANUAL_LINKING_ENABLED) or contact support before migrating production.
```

## Cut-over (F2)

Runbook (details per section above; the migration itself is F1):

1. Hosted Supabase project: `supabase link`, `npm run db:push`, `npm run functions:deploy`, `supabase secrets set --env-file
   supabase/functions/.env.production`, Google provider + redirect URLs, Site URL `https://diceify.art`; Stripe live webhook
   endpoint (pinned API version); Customer Portal configuration.
2. Cloudflare Pages: merge `revamp` → `master`, production env variables set, build green on the production branch.
3. Freeze the old site (logins keep bumping `User.updatedAt`, and the `--since` window is evaluated at run time).
4. Migration, from a machine with the legacy `DATABASE_URL` in `.env.local` and the hosted values in the environment:
   ```sh
   export SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<hosted service role key>
   export TARGET_DATABASE_URL='postgresql://postgres:<db password>@db.<project-ref>.supabase.co:5432/postgres'
   export STRIPE_SECRET_KEY=sk_live_…            # the hosted functions' key; enables the live sync
   npm run migrate:legacy -- --target=hosted --dry-run
   npm run migrate:legacy -- --target=hosted --report=migrate-prod-1.json
   npm run migrate:legacy -- --target=hosted --report=migrate-prod-2.json   # rerun: 0 created, 0 migrated
   ```
   Keep the report files (legacy ids only). `TARGET_DATABASE_URL` must connect as `postgres` (the table owner): the script
   toggles the `projects_enforce_limit` trigger per insert and writes explicit `created_at`s.
5. Smoke test: a migrated lifetime user, a migrated studio-canceled user (`cancel_at`/status from the live sync), a new user
   with a real Studio purchase (refund it afterwards).
6. Move DNS `diceify.art` from Vercel to Pages (Custom domain section above); disable the old Vercel Stripe endpoint.
7. Keep the old database read-only for 30 days, then delete the Vercel project.
