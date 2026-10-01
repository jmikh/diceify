# Diceify

Turn a photo into a dice mosaic you can actually build: upload, crop, tune contrast/gamma, then follow die-by-die
placement instructions. Live at [diceify.art](https://diceify.art).

## Stack

- **Next.js 14** (App Router) as a static site generator: `output: 'export'` → `out/`, hosted on **Cloudflare Pages**.
  There is no application server; one Cloudflare Pages Function (`functions/s/[id].ts`) adds the social card tags to
  share links (`/s/<id>`).
- **Supabase**: Google OAuth, Postgres (projects, profiles, shares) under row-level security, Storage for the project
  photo (private) and share card images (public).
  The browser talks to it directly with `supabase-js`.
- **Two Supabase Edge Functions** (Deno): `billing` (Stripe checkout / portal / cancel / resume / sync) and
  `stripe-webhook`. Subscription state is recomputed from Stripe on every event.
- **Pure TypeScript dice core** (`core/`): deterministic pipeline with golden fixtures; `core/README.md` is the spec.
- zustand + zundo (undo/redo), vitest, ESLint 9, Tailwind, Sentry (client, optional), GA4.

See `CLAUDE.md` for the architecture map, import rules and working conventions.

## Local setup

Requirements: Node 20+ (Pages builds on 20), npm 11, the Supabase CLI and Deno (Homebrew), the Stripe CLI for billing work.

```sh
npm install
npm run db:start                  # local Supabase on ports 5433x; `npm run db:status` prints the URL + anon key
npm run dev                       # http://localhost:3000 (needs .env.local, below)
```

Env files (all gitignored except `supabase/functions/.env.example`). Only `NEXT_PUBLIC_*` values reach the Next app, and
they are inlined into the static bundle, so no secret ever goes in a root file; secrets live under `supabase/`.

| File | Holds |
|---|---|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (local stack), optional `NEXT_PUBLIC_SENTRY_DSN`; `LEGACY_DATABASE_URL` for `npm run migrate:legacy` until the F2 cut-over |
| `.env.prod.local` | the same public values for the hosted project (`npm run dev:prod` / `build:prod`) |
| `supabase/.env` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for local Google sign-in (read by `supabase/config.toml`) |
| `supabase/functions/.env` | Stripe **test** secrets for `npm run functions:serve` (template: `supabase/functions/.env.example`) |
| `supabase/functions/.env.production` | Stripe **live** secrets, pushed with `supabase secrets set` (`docs/DEPLOY.md`) |
| `.dev.vars` | the two `NEXT_PUBLIC_SUPABASE_*` values for the share-link Pages Function under `npm run pages:dev` |

Billing locally: `npm run functions:serve` in one terminal, `npm run stripe:listen` in another; flows, cards and
`stripe trigger` recipes are in `docs/STRIPE_TESTING.md`.

## Commands

| Command | What |
|---|---|
| `npm run dev` / `npm run build` | dev server / static export to `out/` (local Supabase stack) |
| `npm run dev:prod` / `npm run build:prod` | same against the hosted Supabase project via `.env.prod.local` (see `docs/DEPLOY.md`) |
| `npm test` / `npm run test:watch` | vitest unit tests (integration suites opt in with `SUPABASE_TEST=1`, `STRIPE_TEST=1`) |
| `npm run lint` / `npm run typecheck` | ESLint (0 warnings policy) / `tsc` for the app and `core/` |
| `npm run db:*` | `start`, `stop`, `status`, `reset`, `migration -- <name>`, `types` (regenerates `lib/supabase/database.types.ts`), `push` |
| `npm run functions:*` | `serve`, `check` (`deno check`), `deploy` |
| `npm run stripe:listen` | forward Stripe webhooks to the local function |
| `npm run gen-fixtures` | regenerate the core's golden fixtures |

## Deploy and testing

- Deployment (Cloudflare Pages, hosted Supabase, Stripe endpoint, DNS): `docs/DEPLOY.md`.
- Billing flows and Stripe test recipes: `docs/STRIPE_TESTING.md`.
- Revamp plan and per-step design docs: `plans/revamp/`.
