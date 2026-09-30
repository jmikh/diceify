# Diceify

Turn a photo into a dice mosaic you can actually build: upload, crop, tune contrast/gamma, then follow die-by-die
placement instructions. Live at [diceify.art](https://diceify.art).

## Stack

- **Next.js 14** (App Router) as a static site generator: `output: 'export'` → `out/`, hosted on **Cloudflare Pages**.
  There is no application server.
- **Supabase**: Google OAuth, Postgres (projects, profiles) under row-level security, Storage for the project photo.
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
cp .env.example .env.local        # Supabase URL + anon key (local values below), optional Sentry DSN
npm run db:start                  # local Supabase on ports 5433x; `npm run db:status` prints the keys
npm run dev                       # http://localhost:3000
```

Env files (all gitignored except the examples):

| File | Holds |
|---|---|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `NEXT_PUBLIC_SENTRY_DSN` |
| `supabase/.env` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for local Google sign-in (read by `supabase/config.toml`) |
| `supabase/functions/.env` | Stripe test secrets for `npm run functions:serve` (template: `supabase/functions/.env.example`) |

Billing locally: `npm run functions:serve` in one terminal, `npm run stripe:listen` in another; flows, cards and
`stripe trigger` recipes are in `docs/STRIPE_TESTING.md`.

## Commands

| Command | What |
|---|---|
| `npm run dev` / `npm run build` | dev server / static export to `out/` |
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
