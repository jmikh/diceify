# Step E4 — Cloudflare Worker instead of Pages

User decision (2026-10-02), while creating the Cloudflare project for F2: the dashboard's **Create application** flow now
creates Workers and offers Pages only as "legacy"; Cloudflare recommends Workers for new projects (Pages is maintained,
new features land in Workers). The E1 Pages project was never created, so nothing is migrated: the static export is served
as a Worker's static assets and the H1 share function becomes the Worker's script.

## Design

- `wrangler.jsonc` (repo root): Worker `diceify` (must equal the dashboard name), `main: worker/index.ts`,
  `assets: { directory: ./out, binding: ASSETS, html_handling: auto-trailing-slash, not_found_handling: 404-page,
  run_worker_first: ["/s/*"] }`. Static requests never invoke the script (free, unmetered); `/editor` → `editor.html`,
  `/editor.html` → 307 `/editor`, unknown paths → `404.html` with 404 — what Pages did natively, now explicit.
  `public/_headers` keeps working (Workers static assets support `_headers`/`_redirects`).
- `workers_dev: true` + `preview_urls: true` explicit: adding custom-domain `routes` at cut-over flips the `workers_dev`
  default to false, which would silently remove the `workers.dev` and preview URLs.
- Runtime variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, read by the share script) live in the
  dashboard, in **Production** and **Previews base** (Previews do not inherit production settings), with `keep_vars: true`
  so `wrangler deploy` does not delete them. Rejected: `vars` + `previews.vars` in `wrangler.jsonc` (the hosted values
  twice in git, and a third copy in the build variables). The build variables (inlined by `next build`) are a separate
  dashboard list in Workers Builds.
- `worker/index.ts` = routing only: `^/s/[^/]+/?$` with GET/HEAD → `serveShare`; any other `/s/*` path or method →
  `env.ASSETS.fetch(request)` (404 page / 405). `worker/share.ts` = the H1 function body unchanged (`serveShare(request,
  env, id)`, `ShareEnv`), import path `../core/share`.
- `worker/tsconfig.json` (was `functions/tsconfig.json`), ESLint boundary `worker/**` (own folder + `core/share`),
  `typecheck` runs `tsc -p worker`; root `tsconfig.json` and ESLint ignore `.wrangler/` (wrangler dev state).
- `wrangler@^4.147.0` devDependency: Workers Builds' default preview command `npx wrangler preview` needs ≥ 4.135 (the
  Homebrew 4.58 on the dev machine is too old), and the deploy should not float on whatever `npx` downloads.
- `npm run worker:dev` = `wrangler dev` (http://localhost:8787) after `npm run build`; it reads `.dev.vars` if present,
  else `.env.local` (observed: a well-formed unknown share id reached the local `get_share`).
- `observability.enabled`: Workers Logs for the share script (`[share] get_share failed` when the variables are missing).

## Dashboard (docs/DEPLOY.md → "Cloudflare Worker")

GitHub app access to `jmikh/diceify` → Create application → import the repo → name `diceify`, build `npm run build`,
deploy `npx wrangler deploy`, preview `npx wrangler preview`, build variables → first build on `master` fails (no
`wrangler.jsonc` there; harmless) → Branch control: production branch `revamp` until the cut-over → runtime variables in
Production + Previews base → retry. Supabase redirect allow-list: `https://diceify.<sub>.workers.dev/**`,
`https://*-diceify.<sub>.workers.dev/**`.

DNS: Workers custom domains need the zone on Cloudflare; `diceify.art` is on Google Cloud DNS (apex `A` → Vercel). Move
the nameservers ahead of the cut-over with the imported records still pointing at Vercel, then attach the custom domains
at cut-over. (DEPLOY.md's E1 note that a `CNAME` to `diceify.pages.dev` would do was wrong for the apex anyway.)

## Verification

- typecheck, test (374 + 17 skipped), lint 0/0, build — the build from an rsync copy (`next dev` was running).
- `wrangler dev` on the copy: static routes 200, `/editor.html` 307, `/nonexistent` · `/s/` · `/s/a/b` 404 page,
  `/s/not*valid` 404 `max-age=300` (Worker), well-formed unknown id 404 `max-age=60` (real `get_share`), POST 405,
  security headers from `_headers`.
- `wrangler deploy --dry-run`: 141 assets, 6 KiB script, `env.ASSETS` binding.

## Manual checks (after the dashboard setup)

- The `revamp` build deploys; `https://diceify.<sub>.workers.dev` serves the landing page, `/editor`, a blog post, 404.
- Google sign-in from that URL returns to it (redirect allow-list).
- A real `/s/<id>`: `og:image` is the share card (runtime variables set); Facebook Sharing Debugger shows it.
- A push to another branch creates `https://<branch>-diceify.<sub>.workers.dev` with the share tags working (Previews base).
