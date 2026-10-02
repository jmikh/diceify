# GENERAL INSTRUCTIONS
- If you find yourself writing complicated code that you think could be way easier with library, let me know and we can use websearch or other to find an appropriate one.
- Always keep code modular and don't repeat yourself.
- Do not implement things I did not ask for. If you think they'd be useful ask me instead.

# Diceify

Photo → dice-art editor. **No server of our own**: a static Next.js 14 export (`output: 'export'`, `out/`) served as a
Cloudflare Worker's static assets (`wrangler.jsonc`), the browser talks to Supabase (Auth + Postgres + Storage) directly under
RLS, and the only server code is two Supabase Edge Functions (`billing`, `stripe-webhook`) plus the Worker's script
(`worker/`, runs only for `/s/*`: social card tags for share links). Sentry client-side only; GA4 via `@next/third-parties`.

## Architecture map

```
app/           routing glue only: (marketing)/ landing, blog, gallery, dice-art, privacy, terms; (editor)/ editor, account
core/          PURE TS (no DOM, no React, no app imports; own tsconfig, lib es2022): dice/ pipeline, build math, svg,
               document schema; billing/ entitlements + plans; share/ ids, URLs, copy, card layout, meta tags.
               README.md = algorithm spec (Swift-portable). Fixtures + tests.
lib/           browser/platform adapters: supabase/ (client, auth, profile, projects, shares, storage, keepalive, billing,
               generated database.types.ts), image/ (decode, crop, rasterize, shareCard), report-error.ts (the only Sentry importer),
               env.public.ts, media-query.ts
features/      editor/ (store/, hooks/, components/{shell,start,crop,tune,build,project,share,account,mobile,common}, steps.ts),
               marketing/ (components incl. ShareView, blog/data.ts), account/ (useUser, SignInModal, AnalyticsTracker), billing/ (cards, AccountScreen)
worker/        Cloudflare Worker script (own tsconfig): index.ts routes /s/<id> → share.ts = share page + its og/twitter tags
components/    Logo, Footer, BackgroundOrbs (shared, dumb)
styles/        base.css, marketing.css, editor.css       supabase/  config.toml, migrations/, functions/{_shared,billing,stripe-webhook}
scripts/       gen-fixtures.ts, migrate-from-prisma.ts (+ migrate/ helpers)   docs/  DEPLOY.md, STRIPE_TESTING.md   plans/revamp/  plan + step docs
```

Import rules (ESLint `no-restricted-imports`, all `error`): `core` → only `core` (+ `zod`). `lib`/`components` → `core`,
`lib`, `components` (never `features`/`app`). `features/*` → `core`, `lib`, `components`; `features/{marketing,account,billing}`
never import `features/editor`; nothing imports `app`. `app` → `@/features`, `@/components`, `@/lib`, `@/core`, `@/styles`.
`supabase/functions`: a function imports its own folder + `../_shared`; `_shared` only itself; bare specifiers from `deno.json`.
`worker/`: its own folder + `core/share` only (relative).
`@sentry/*` only in `lib/report-error.ts` (+ `instrumentation-client.ts`, `next.config.js`) — use `reportError`/`setErrorUser`.

## Core (`core/dice`)

- `DiceGrid.rows[y][x]`, **y = 0 is the bottom row** (the build row users see); `Pixels` is RGBA top-down.
- Pipeline: `toGrayImage` → `downsample` (area average) → `sharpen` → per cell `applyGamma` → `applyContrast` →
  `mapBrightnessToDie` → `shouldRotate`. Deterministic; golden fixtures in `core/dice/__fixtures__/*.json`.
- **Fixture rule**: changing thresholds/sampling/sharpen = regenerate fixtures (`npm run gen-fixtures`, commit the diff, and
  say so). **Document rule**: changing `ProjectDocument`'s shape = bump `CURRENT_SCHEMA_VERSION` + a `migrateDocument` step
  + a test for the old shape. Legacy inputs are normalized (clamped), current versions validated strictly (zod).

## Editor state (`features/editor/store`)

- `useDocumentStore` (zustand + zundo): `crop`, `dice`, `buildProgress`, `buildBaseline`, `name`. **Undo tracks only
  `crop` + `dice`**; slider drags go through `documentHistoryBatcher` (one entry per interaction); widget/store reconcile
  writes use `untracked()`. `replaceDocument`/`uploadImage`/`resetEditor` clear history.
- `useEditorUiStore`: `step` (crop → tune → build; uploading is the Start screen, not a step), `startOpen`, one `modal`
  at a time. `useDerivedStore`: grid/stats/preview written by `useDicePipeline`. `useProjectStore`: `boot`, `projectId`,
  `cloudVersion`, image (object URL + Blob), `saveStatus`, `projects`, `previews` (thumbnails).
- Shell: one fixed viewport (no page scroll). Desktop = header + canvas panel (+ under-canvas strip) + inspector;
  mobile (`< lg`) = `MobileEditor`. Shared class strings in `components/common/ui.ts`; filled buttons use `--pink-strong`.
- Autosave (`store/autosave.ts`): whole snapshot, 1.5 s debounce, cloud save is CAS on `cloud_version` (conflict → reload +
  toast); anonymous = local draft (`localStorage` doc + IndexedDB image). Step transitions only via `useStepNavigation`.

## Sharing

`/s/<id>` = static `share.html` + the Worker's meta tags. A share = immutable `shares` row + `share-images/<id>.jpg`
(public bucket, 1200×630 card rendered client-side); row first, then upload (storage policy needs the own row); public read
only via the `get_share` RPC; no update/delete/unshare. Sign-in required, free on every plan. Links carry UTM tags
(`core/share/urls.ts`); GA4 events `share_create`, `share`, `share_view`, `share_cta_click`.

## Gating

`useEntitlements()` / `useGate()` are the **only** gating sources (`deriveEntitlements` in `core/billing/entitlements.ts`;
`builderRowLimit: null` = unlimited, never `Infinity`). SQL `effective_plan` in the initial migration **must mirror**
`entitlements.ts` — change both together. Projects are unlimited on every plan (no SQL limit since G1).

## Data

- RLS owner-only on `profiles` (read only from the client) and `projects` (CRUD own rows); storage bucket
  `project-images`, path `{uid}/{projectId}/original.jpg`, **immutable per project** (DB trigger) — a new photo = a new project;
  `preview.jpg` next to it is the thumbnail (the cropped photo, overwritten when the crop changes, listed via signed URLs). Projects are unlimited.
- `cloud_version` is bumped by a trigger (client values ignored); saves are CAS `eq('cloud_version', expected)`.
- Billing columns on `profiles` are written **only** by the edge functions (service role), recomputed from Stripe on
  every webhook/sync, and once by the legacy migration script (`scripts/migrate-from-prisma.ts`). Never write them from the client or SQL migrations.
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

## Testing

- Every step ends with `npm run typecheck && npm test && npm run lint && npm run build` (+ `npm run functions:check`
  when `supabase/functions` changed) all green. **No manual browser tests unless asked.**
- Integration suites are opt-in: `SUPABASE_TEST=1` (local stack running) and `STRIPE_TEST=1` (+ sandbox key); they
  skip otherwise. Pure logic belongs in `core/` with a unit test.

## Plans

`plans/revamp/revamp-tiered-plan.md` is the source of truth for architecture and decisions; each step gets a
`plans/revamp/revamp-step-<N>.md` and appends to the plan's Step log; out-of-scope findings go to
`plans/revamp/revamp-agent-suggestions.md` ("Open for the user"), never into scope creep.
