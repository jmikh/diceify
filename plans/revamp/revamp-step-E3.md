# Step E3 — Cleanup, docs, deps

Scope (plan, Phase E): apply the Cleanup list fully; `CLAUDE.md` + `README.md` rewritten; `.env`/`tsbuildinfo` untracked;
deps pruned; `no-explicit-any` + boundary rules at `error`; sitemap fix; TODO comments flagging Terms/Privacy wording.
No behaviour changes beyond dead-code removal and the small documented items. Product decisions are deferred (list below).

## Current state (revamp @ E2)

- `npm run lint`: 0 errors, **13 warnings** (2 unused vars, 6 `any` — 4 in dead `lib/utils/debug.ts` + 2 in
  `AnalyticsTracker`, 3 `no-img-element`, 1 `exhaustive-deps` ref-counter false positive, 1 unused `displayName`).
- Tracked files: `.env` and `tsconfig.tsbuildinfo` are **not** tracked (both gitignored; `.env` exists on disk only).
  `middleware.ts.backup`, root html prototypes, `public/demo-portrait.jpg`, `DiceStepper.module.css` already gone.
- Zero-importer files (script over `git ls-files`): only `lib/types/index.ts` (one importer, `ColorModeControl`).
  `lib/utils/debug.ts` has 2 importers (`UserMenu`, `CropperMain`). `publicEnv.appUrl`/`sentryDsn` are read by nothing.
- Deps: `opentype.js` has 0 importers; everything else in `dependencies` has ≥ 1. `@types/*`, `typescript`, `tailwindcss`,
  `postcss`, `autoprefixer` sit in `dependencies`. `npm ls --depth=0` clean.
- `public/`: unreferenced `demo.mp4` (13 MB; Hero uses `demo-optimized.mp4`), `images/og-image.{jpg,webp}` (replaced by
  `og-card.jpg` in E1), `logo-full-dark.svg`, `android-chrome-{192,512}.png` (favicon family; manifest lists `favicon.svg` only).
  `manifest.json` `screenshots[0].src` still points at the deleted `/opengraph-image` route.
- `styles/marketing.css` defines `hero-badge`, `hero-visual`, `hero-blogs-section`, `hero-blogs-row`, `gallery-page-card-dice`
  (no users); 7 marketing pages carry a `content` class defined nowhere.

## Checklist (source in brackets: plan Cleanup / step doc / suggestion line)

Dead code
- [x] Delete `lib/utils/debug.ts`; `devLog` calls deleted, `devError` → `reportError` (crop read failure, a real error) /
  `console.warn` (avatar `<img>` load failure, expected) per E2's policy. [plan Cleanup; C3, E2 suggestions]
- [x] Delete `lib/types/index.ts`; `ColorModeControl` imports `ColorMode` from `@/core/dice`. [B5 suggestion]
- [x] `lib/env.public.ts`: drop `appUrl` and `sentryDsn` (unread; the DSN is read literally in `instrumentation-client.ts`).
  `NEXT_PUBLIC_APP_URL` removed from `.env.example`, `docs/DEPLOY.md`, the integration tests' defaults, the plan. [E1, E2]
- [x] `app/(editor)/editor/page.tsx`: drop the `<Suspense>` (nothing under it suspends). [C3, E1]
- [x] `app/layout.tsx`: unused `Inter` font (nothing references it; drops a useless preload). [lint]
- [x] `app/not-found.tsx` unused `Home`; `ProjectSelector` unused `displayName`. [B3 suggestion, lint]
- [x] `styles/marketing.css` dead classes + the no-op `content` class on 7 pages. [B5 suggestion]
- [x] `public/`: delete `demo.mp4`, `images/og-image.jpg`, `images/og-image.webp`, `logo-full-dark.svg`. Keep the
  `android-chrome-*` icons (favicon family; open item: wire into `manifest.json` or delete). [binding details]
- [x] `public/manifest.json` screenshot → `/images/og-card.jpg` (`image/jpeg`). [E3 finding]
- [x] `.gitignore`: drop stale `/tests/screenshots/`, `.vercel`, `/lib/generated/prisma`; `eslint.config.mjs` ignore
  `lib/generated/**` dropped. `.env`/`*.tsbuildinfo` already ignored and untracked (verified). [plan Cleanup]
- [x] Verify gone: `middleware.ts.backup`, root html prototypes, `demo-portrait.jpg`, `DiceStepper.module.css`. [B5, A2, B3]

Deps
- [x] Remove `opentype.js`. Move `@types/node`, `@types/react`, `@types/react-dom`, `typescript`, `tailwindcss`, `postcss`,
  `autoprefixer` to `devDependencies` (Next needs tailwind/postcss at build time; Pages installs devDependencies by default —
  `docs/DEPLOY.md` notes that `NODE_ENV=production`/`NPM_FLAGS=--omit=dev` must not be set). `@next/third-parties` stays `^14.2.35`.
- [x] `npm audit`: summary only (all fixes are major bumps: `next`/`@next/third-parties` → 16, `vitest` → 5, `sharp` → 0.35). Open item.

tsconfig / ESLint
- [x] `target: "es2022"`; `Array.from(new Set())` (`env.public.ts`) and `Array.from(matchAll)` (`svg.test.ts`) → spreads.
  `Array.from(typedArray)` in `sample.test.ts` stays (it converts for `toEqual`, not a workaround). [A2, A3, C1]
- [x] Keep `.next/types/**/*.ts` in `include`: `next build`/`next dev` re-add it when missing, and Next's own build-time
  tsc uses it for route prop checks. `rm -rf .next` after deleting a route is documented in `CLAUDE.md`. [C2, E1 — REJECT]
- [x] `exclude` stays `node_modules, out, supabase/functions`; `scripts/` and `core/` are covered by `npm run typecheck`.
- [x] `no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps` → `error`. `AnalyticsTracker` `any` → a typed
  `window.gtag` declaration. The one `exhaustive-deps` site (`useDicePipeline` cleanup bumping a counter ref) gets a
  line-level disable with the reason (it is a counter, not a DOM ref). [A1, B1, B5]
- [x] `@next/next/no-img-element` → `off` with a comment (static export + `images.unoptimized`; the 3 sites are a data URL,
  a Google avatar and a spinner SVG — `next/image` adds nothing). [A1 suggestion]
- [x] New boundary: `supabase/functions/**` may import only relative paths inside `functions/` (`_shared` from a function,
  siblings inside `_shared`) and the bare specifiers in `deno.json` — never `@/…` or another function's folder.

Small fixes
- [x] `app/sitemap.ts`: remove `/auth/signin`. `app/robots.ts`: `disallow: ['/account']` (private). **`/editor` stays
  allowed and in the sitemap**: `app/(editor)/layout.tsx` carries keywords, canonical and WebApplication JSON-LD
  written for search, so disallowing it is an SEO decision — flagged as an open item rather than made here. [plan; E1]
- [x] `{/* TODO(user): … */}` comments in `terms/page.tsx` (§4.4, §5.1 "permanent access" vs 30-day pass) and
  `privacy/page.tsx` (§2.4 "Vercel Analytics" → GA + Sentry). Text unchanged. [plan Open items]
- [x] `docs/DEPLOY.md`: env table minus `NEXT_PUBLIC_APP_URL`; devDependencies note.

Docs
- [x] `CLAUDE.md` (≤120 lines): general rules verbatim; architecture map (tree + import rules + "no server"); core
  (`rows[y][x]`, pipeline, fixture regen rule, schema-version rule); state (store ownership, undo rules); gating rule;
  data rules (RLS, CAS, immutable image, billing columns); commands table; testing rule; plans convention.
- [x] `README.md`: what it is, stack, local setup (Supabase local, env files, functions, Stripe), commands, pointers to
  `docs/DEPLOY.md` and `docs/STRIPE_TESTING.md`.
- [x] `revamp-agent-suggestions.md` restructured: "Resolved" (one line each) + "Open for the user".
- [x] Plan: repo layout tree (folder level = `find` output; `lib/types`, `lib/utils` gone), Tooling deps/scripts = actual
  `package.json`, Import rules (+ functions boundary), Static export env list, Cleanup section marked applied, Step log.

## Suggestions triage (line = bullet order in `revamp-agent-suggestions.md` before the rewrite)

DONE in E3: A1 `no-img-element` off · A2 `demo-portrait` verified gone · A2/A3/C1 `target: es2022` + workarounds ·
B1 `exhaustive-deps` site + CropperMain unused imports (already gone) · B3 `DiceStepper.module.css` verified gone ·
B3 unused `displayName`/`Link` · B5 marketing CSS dead classes + `.content` · B5 `lib/types` · B5 README/CLAUDE ·
B5 warning sweep · C2 env validated together (now only the Supabase pair) · C3 editor Suspense · C3/E2 `debug.ts` ·
E1 sitemap/robots · E1 Suspense · E1 privacy prose + CLAUDE "Vercel/Railway" · E1 `appUrl` · E2 `sentryDsn`.

REJECT — already resolved by a later step (no action): A1 `rules-of-hooks` (B2) · A1 svg-renderer dots (A3/B1) ·
A2 `generateGrayscalePreview` (B1) · A3 `npm:zod@4` (D1) · A3 rasterSize rule (B1) · A3 build noise (E1) · B1 dead API
routes (C3/E1) · B1 TunerMain spinner (B3) · B1 off-by-one (B1) · B2 progressPercent (B3) · B2 two is-pro predicates (C2) ·
B2 vitest include (B5) · B3 `saveStatus.ts` (B5) · B3 ratio double entry (B4) · B3 modal `Project` interface (C3) ·
B3 draft requires image (C3) · B4 `useBuildGate` predicate (C2) · B5 PricingCards fetch (D2) · C1 webhook stanza (D1) ·
C1 details JSON string (C3) · C1 storage statusCode (C3) · C1 image_path immutable (C3) · C2 loadProject fallback (C3) ·
C3 `stripe` dep (D1).

REJECT — informational / accepted behaviour, nothing to do: A3 lifetime portal note · B1 no-upscale crop · B2 dropped
`hasUnlimitedDice` · B2 last-die no-op · B3 remount refetch · B3 legacy crop step · B4 mid-gesture reports · B4
`cropperHandle` registry (until a second cropper) · B5 glass border token · B5 Reddit banner margin · C1 ports · C1
trigger order · C1 `effective_plan` RPC · C1 keys · C2 OAuth JSON 400 page (documented) · C2 TOKEN_REFRESHED refetch ·
C3 keepalive double CAS · C3 legacy data URL read · C3 `documentJson` cast · D1 payload API version · D1 env-file reload ·
D1 gateway 401 · D1 timestamp form · D1 listen secret · D1 `deno.lock` · D1 `current_period_end` fallback · D2 JWT email ·
D2 cancel/resume stale · D2 `AccountShell` (YAGNI) · D2 trigger siblings · E1 `out/*.txt`/`.DS_Store` · C2/E1
`.next/types` include (Next re-adds it; see tsconfig above).

DEFER — product / policy / later step (user decides): A1 lockfile smoke on `master` (F2) · A1 vitest 4/5 after an npm
upgrade · A3 `creator_pass` mapping (F1) · B1 DOM-env tests for `lib/image` · B2/B5 viewport-hook consolidation (UI pass) ·
B3 modal stacking · B4 undo of `numRows` on build (clamp progress) · B4 manual undo-of-zoom check · B4 slider keyboard
entries · B5 navbar/footer on inner marketing pages · C2 OAuth-error toast · C2/D2 `PRICING_CONFIG` on `PRICING` (UI refactor) ·
C2 `LimitReachedModal` "5 rows" copy from entitlements · C2 GA `login` semantics · C3 "Save project" affordance · C3 trim
`.env.local` · D1/D2 F1 sync from Node (`stripe` devDependency vs Deno) · D2 creator→studio upgrade policy · D2 sync window
on checkout return · D2 `resume` with a fixed `cancel_at` · E1 CSP · E2 `errorHandler` on upload failure · E2
`bundleSizeOptimizations` (measure first) · E2 release naming check (F2) · E2 Next 15 · E2 tests for report sites.

## Verification

1. `npm run lint` → 0 errors, 0 warnings. `npm run typecheck`, `npm test`, `npm run functions:check`, `npm run build` → 0.
2. `git grep -nE "prisma|next-auth|theme\.colors|devLog|devError|useSession|lib/subscription|maxProjects=|@vercel|Vercel" -- app components lib features core supabase scripts styles`
   → only the two `TODO(user)` comments (+ the privacy prose they flag); `git ls-files | grep -E "tsbuildinfo|^\.env$"` → empty.
3. `npm ls --depth=0` clean; importer count ≥ 1 for every remaining dependency (pasted in the report).
4. Static smoke on `out/`: `/`, `/editor`, `/account`, a blog post, `/sitemap.xml`, `/robots.txt` → 200; unknown → 404.
5. Plan repo-layout tree folders == `find app core lib features components styles supabase scripts docs -maxdepth 2 -type d`.
6. ESLint probe: a `supabase/functions/billing` file importing `../stripe-webhook/index.ts` or `@/lib/x` is rejected.
