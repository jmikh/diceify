# GENERAL INSTRUCTIONS
- If you find yourself writing complicated code that you think could be way easier with library, let me know and we can use websearch or other to find an appropriate one.
- Always keep code modular and don't repeat yourself.
- Do not implement things I did not ask for. If you think they'd be useful ask me instead.

# Diceify

Photo → dice-art editor. **No server of our own**: a static Next.js 14 export (`output: 'export'`, `out/`) served as a
Cloudflare Worker's static assets (`wrangler.jsonc`), the browser talks to Supabase (Auth + Postgres + Storage) directly under
RLS, and the only server code is four Supabase Edge Functions (`billing`, `stripe-webhook`, `account` = delete account,
`revenuecat-webhook` = the iOS app's purchases) plus the Worker's script (`worker/`, runs only for `/s/*`: social card tags
for share links). A native iOS app is being built in `ios/` (`plans/ios/ios-app-plan.md`; `DiceCore` = Swift port of `core/`). Sentry client-side only; analytics = GA4
(`@next/third-parties`) + PostHog, both behind `lib/analytics.ts`.

## Architecture map

```
app/           routing glue only: (marketing)/ landing, blog, gallery, dice-art, privacy, terms; (editor)/ editor, account
core/          PURE TS (no DOM, no React, no app imports; own tsconfig, lib es2022): dice/ pipeline, build math, svg,
               document schema; billing/ entitlements + plans; share/ ids, URLs, copy, card layout, meta tags.
               README.md = algorithm spec (Swift-portable). Fixtures + tests.
lib/           browser/platform adapters: supabase/ (client, auth, profile, projects, shares, storage, keepalive, billing,
               generated database.types.ts), image/ (decode, crop, rasterize, shareCard), report-error.ts (the only Sentry importer),
               analytics.ts (the only PostHog / sendGAEvent importer + the event catalog), env.public.ts, media-query.ts,
               seo.ts (`pageMetadata`: every indexable page's title, self-canonical, og/twitter + share image)
features/      editor/ (store/, hooks/, components/{shell,start,crop,tune,build,project,share,account,mobile,common}, steps.ts),
               marketing/ (components incl. ShareView, blog/data.ts), account/ (useUser, SignInModal, AnalyticsTracker), billing/ (cards, AccountScreen)
worker/        Cloudflare Worker script (own tsconfig): index.ts routes /s/<id> → share.ts = share page + its og/twitter tags
components/    Logo, Footer, BackgroundOrbs (shared, dumb), Analytics (GA4 tag + PostHog start, root layout),
               JsonLd (structured data as a static <script>; never next/script, which only injects it client-side)
styles/        base.css, marketing.css, editor.css       supabase/  config.toml, migrations/, functions/{_shared,billing,stripe-webhook}
scripts/       gen-fixtures.ts, migrate-from-prisma.ts (+ migrate/), backfill-grids.ts (+ backfill/)   docs/  DEPLOY.md, STRIPE_TESTING.md
plans/         revamp/ (web revamp, done), ios/ (iOS app plan + step docs)      ios/  DiceCore Swift package (+ the app, step 3)
```

Import rules (ESLint `no-restricted-imports`, all `error`): `core` → only `core` (+ `zod`). `lib`/`components` → `core`,
`lib`, `components` (never `features`/`app`). `features/*` → `core`, `lib`, `components`; `features/{marketing,account,billing}`
never import `features/editor`; nothing imports `app`. `app` → `@/features`, `@/components`, `@/lib`, `@/core`, `@/styles`.
`supabase/functions`: a function imports its own folder + `../_shared`; `_shared` only itself; bare specifiers from `deno.json`.
`worker/`: its own folder + `core/share` only (relative).
`@sentry/*` only in `lib/report-error.ts` (+ `instrumentation-client.ts`, `next.config.js`) — use `reportError`/`setErrorUser`.
`posthog-js` and `sendGAEvent` only in `lib/analytics.ts` — use `track(event, props)` (typed by `AnalyticsEvents`; add new
events there), `identifyUser`/`resetUser`. Put `NO_CAPTURE_CLASS` on anything showing the user's photo from a URL.

## Core (`core/dice`)

- `DiceGrid.rows[y][x]`, **y = 0 is the bottom row** (the build row users see); `Pixels` is RGBA top-down.
- Pipeline: `toGrayImage` → `downsample` (area average) → `sharpen` → per cell `applyGamma` → `applyContrast` →
  `mapBrightnessToDie` → `shouldRotate`. Deterministic; golden fixtures in `core/dice/__fixtures__/*.json`.
- **Fixture rule**: changing thresholds/sampling/sharpen = regenerate fixtures (`npm run gen-fixtures`, commit the diff, and
  say so) and port the change to `ios/DiceCore` (its tests read the same fixtures). **Document rule**: changing
  `ProjectDocument`'s shape = bump `CURRENT_SCHEMA_VERSION` + a `migrateDocument` step + a test for the old shape; the web
  ships a new version before any iOS build writes it. Legacy inputs are normalized (clamped), current versions validated
  strictly (zod). Schema v2: `grid.rows` persists every die (`encoding.ts`, the fixture format) so Build renders the stored
  grid on every device; the pipeline rewrites it whenever it generates (`gridInputs` says which crop/dice it belongs to).

## Editor state (`features/editor/store`)

- `useDocumentStore` (zustand + zundo): `crop`, `dice`, `buildProgress`, `buildBaseline`, `name`. **Undo tracks only
  `crop` + `dice`**; slider drags go through `documentHistoryBatcher` (one entry per interaction); widget/store reconcile
  writes use `untracked()`. `replaceDocument`/`uploadImage`/`resetEditor` clear history.
- `useEditorUiStore`: `step` (crop → tune → build; uploading is the Start screen, not a step), `startOpen`, one `modal`
  at a time. `useDerivedStore`: grid (+ `gridRows`/`gridInputs`)/stats/preview written by `useDicePipeline`, seeded from a
  loaded document's stored grid (the pipeline then skips generation while crop/dice match). `useProjectStore`: `boot`, `projectId`,
  `cloudVersion`, image (object URL + Blob), `saveStatus`, `projects`, `previews` (thumbnails).
- Shell: one fixed viewport (no page scroll). Desktop = header + canvas panel (+ under-canvas strip) + inspector;
  mobile (`< lg`) = `MobileEditor`. Shared class strings in `components/common/ui.ts`; filled buttons use `--pink-strong`.
- Autosave (`store/autosave.ts`): whole snapshot, 1.5 s debounce, cloud save is CAS on `cloud_version` (conflict → reload +
  toast); anonymous = local draft (`localStorage` doc + IndexedDB image). Step transitions only via `useStepNavigation`.

## Sharing

`/s/<id>` = static `share.html` + the Worker's meta tags. A share = immutable `shares` row + `share-images/<id>.jpg`
(public bucket, 1200×630 card rendered client-side); row first, then upload (storage policy needs the own row); public read
only via the `get_share` RPC; no update/delete/unshare. Sign-in required, free on every plan. Links carry UTM tags
(`core/share/urls.ts`); events `share_create`, `share`, `share_view` (+ PostHog `ref_share_id` on later events), `share_cta_click`.

## Gating

`useEntitlements()` / `useGate()` are the **only** gating sources (`deriveEntitlements` in `core/billing/entitlements.ts`;
`builderRowLimit: null` = unlimited, never `Infinity`). Two billing sources: Stripe (web) and Apple (`apple_*` columns,
RevenueCat); priority lifetime → studio from either → creator from either; `source` says which. SQL `effective_plan`
(`*_apple_billing.sql`) and `_shared/billing-snapshot.ts` `effectivePlan` **must mirror** `entitlements.ts` — change all
three together. Projects are unlimited on every plan (no SQL limit since G1).
`gate(allowed, feature, options)` names the blocked `GatedFeature` and reports `paywall_shown` when it blocks.

## Data

- RLS owner-only on `profiles` (read only from the client) and `projects` (CRUD own rows); storage bucket
  `project-images`, path `{uid}/{projectId}/original.jpg`, **immutable per project** (DB trigger) — a new photo = a new project;
  `preview.jpg` next to it is the thumbnail (the cropped photo, overwritten when the crop changes, listed via signed URLs). Projects are unlimited.
- `cloud_version` is bumped by a trigger (client values ignored); saves are CAS `eq('cloud_version', expected)`.
- Billing columns on `profiles` are written **only** by the edge functions (service role): the Stripe ones recomputed from
  Stripe on every webhook/sync (and once by `scripts/migrate-from-prisma.ts`), the `apple_*` ones from the RevenueCat
  subscriber on every `revenuecat-webhook` event / `billing/apple-sync`. Never write them from the client or SQL migrations.
- Account deletion = `account` function `POST /delete` (cancels the Stripe subscription, removes the user's storage objects,
  deletes the auth user; rows cascade).
- Schema changes = a new migration (`npm run db:migration -- <name>`), `npm run db:reset`, `npm run db:types` (commit the types).

## Commands

| Command | What |
|---|---|
| `npm run dev` (= `dev:local`) / `npm run build` | Next dev server / static export to `out/` against the LOCAL stack (`.env.local`) |
| `npm run dev:prod` / `npm run build:prod` | same against the HOSTED project (`.env.prod.local`, gitignored; hosted functions, no local serve) |
| `npm test` / `npm run test:watch` | vitest (node env; `core/`, `lib/`, `features/`, `supabase/functions/_shared/`, `scripts/`) |
| `npm run lint` | ESLint 9 flat config — must be 0 errors, 0 warnings |
| `npm run typecheck` | `tsc --noEmit && tsc -p core && tsc -p worker` (covers `scripts/`; `rm -rf .next` first after deleting a route) |
| `npm run db:start\|stop\|status\|reset\|migration\|types\|push` | local Supabase stack (ports 5433x) / hosted push; `db:types:prod` diffs types against the linked project |
| `npm run functions:serve\|check\|deploy` | edge functions locally (`supabase/functions/.env`) / `deno check` / deploy |
| `npm run stripe:listen` | forward Stripe webhooks to the local `stripe-webhook` function |
| `npm run worker:dev` | `wrangler dev` (after `npm run build`): the static site + the share Worker, vars from `.dev.vars`, else `.env.local` |
| `npm run gen-fixtures` | regenerate `core/dice/__fixtures__` (sharp) |
| `npm run migrate:legacy -- [--dry-run] …` | legacy Prisma DB → Supabase (read-only source; local target unless `--target=hosted`; `docs/DEPLOY.md`) |
| `npm run backfill:grids -- [--dry-run] [--force] [--only=<id>] [--target=hosted]` | fill `document.grid.rows` for existing projects (schema v2; `docs/DEPLOY.md`) |
| `cd ios/DiceCore && DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer swift test` | the Swift core against `core/dice/__fixtures__` (`ios/README.md`) |

## Testing

- Every step ends with `npm run typecheck && npm test && npm run lint && npm run build` (+ `npm run functions:check`
  when `supabase/functions` changed, + `swift test` in `ios/DiceCore` when `core/` or `ios/` changed) all green.
  **No manual browser tests unless asked.** `supabase migration new` reads stdin when piped: run it with `< /dev/null`.
- Integration suites are opt-in: `SUPABASE_TEST=1` (local stack running) and `STRIPE_TEST=1` (+ sandbox key); they
  skip otherwise. Pure logic belongs in `core/` with a unit test.

## Plans

`plans/revamp/revamp-tiered-plan.md` is the source of truth for the web architecture and decisions (done);
`plans/ios/ios-app-plan.md` for the iOS app (steps 0–7, `plans/ios/ios-step-<N>.md` each, Step log at the bottom);
out-of-scope findings go to `plans/revamp/revamp-agent-suggestions.md` ("Open for the user"), never into scope creep.
