# Step E2 — Sentry + error boundary

Scope (plan, Phase E): `@sentry/nextjs` client-only (DSN optional → inert), `withSentryConfig` (sourcemaps only when
`SENTRY_AUTH_TOKEN` is set in the Pages build env), `lib/report-error.ts` (`reportError`, `setErrorUser`),
`app/(editor)/editor/error.tsx`, report sites, `setErrorUser` in `ProfileProvider`. Not in scope: the cleanup sweep,
`console.error` removals outside the report sites, edge-function Sentry (E3 / not now).

## Current state (revamp @ E1)

- Static export (`output: 'export'`), no server code in the app; `lib/env.public.ts` already exposes an optional
  `sentryDsn` (validated lazily with the other three values — importing never throws, the first getter access does).
- `app/error.tsx` exists (root boundary, `console.error`), no boundary under `app/(editor)/`.
- Error handling today: `console.error` at 13 sites in `features/` + `app/error.tsx` (`git grep -n "console.error" -- features lib`),
  user feedback via `sonner` toasts. `console.warn` marks expected/degraded paths (storage quota, profile fetch fallback, keepalive).

## SDK path: `@sentry/nextjs` 11.1.0 (webpack plugin), not the react fallback

- Registry: `latest` is 11.1.0 with peer `next: ^14.0 || ^15 || ^16` (v10's peer is the same); 11 is the newest major
  supporting Next 14, so the "latest 10.x" clause does not apply — 11.1.0 is installed (`^11.1.0`).
- Build plugin, read from the installed source: `withSentryConfig` is static-export aware — `output === 'export'` skips
  the server-side webpack plugin and ignores `tunnelRoute`; the client config file is injected into the `main-app`
  entry by the plugin itself (so it works on Next 14 without `instrumentation.ts`); `silent: true` swaps the build
  logger for a no-op. A build test with and without `SENTRY_AUTH_TOKEN`/DSN confirms `out/` stays static (see Verification).
- Client init file: **`instrumentation-client.ts`** at the repo root instead of `sentry.client.config.ts` — v11 prints
  a deprecation warning for the latter and injects both the same way on Next 14 (Next 15.3+ loads it natively, which
  keeps the file valid for a future upgrade). It exports `onRouterTransitionStart = Sentry.captureRouterTransitionStart`
  (the plugin's "ACTION REQUIRED" check; a no-op with tracing off). No `sentry.server.config.ts`/`sentry.edge.config.ts`/
  `instrumentation.ts`: there is no server, and the plugin does not warn about their absence.
- `app/global-error.tsx`: skipped. The plugin only *logs* a recommendation (silenced); it exists to catch root-layout
  render errors, and the root layout here is fonts + metadata. `app/error.tsx` (root) + the editor boundary cover the rest.
- Option renames in v11 vs the plan's snippet: `disableLogger` → `bundleSizeOptimizations.excludeDebugStatements`;
  `hideSourceMaps` is gone (the client build uses `hidden-source-map` and deletes the maps after the upload by default);
  `tunnelRoute` simply omitted; `sendDefaultPii` → `dataCollection: { userInfo: false }` (init option); `withSentryConfig` is exported from the `@sentry/nextjs/config` subpath (the root export is the runtime SDK only). `telemetry: false` added — the bundler plugin otherwise reports build telemetry to Sentry.
- `sourcemaps.disable: !process.env.SENTRY_AUTH_TOKEN` → without a token there is no source-map generation and no upload
  attempt (the plugin would only log "No auth token provided", silenced). With a token, an upload failure throws by default
  (`errorHandler` unset) and fails the Pages build — the plugin's documented default, left as is (recorded in suggestions).

`next.config.js`:
```js
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true, telemetry: false, widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  bundleSizeOptimizations: { excludeDebugStatements: true },
})
```
`instrumentation-client.ts`: `Sentry.init({ dsn, enabled: !!dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0,
replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, dataCollection: { userInfo: false } })` where `dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined`
is read as the literal `process.env` access (inlined) rather than through `publicEnv` — the getter validates all four
public values together and would throw at page load on a build without Supabase env, which E1 deliberately allows.

## Wrapper API (`lib/report-error.ts`, the only importer of `@sentry/*` besides `instrumentation-client.ts`)

- `reportError(err: unknown, ctx?: { where: string; extra?: Record<string, unknown> }): void` —
  `if (Sentry.isEnabled()) Sentry.captureException(err, { tags: { where }, extra })`; `console.error('[where]', err)`
  when `NODE_ENV === 'development'` or when nothing was sent (no DSN / node). Production with a DSN → Sentry only.
  `Sentry.isEnabled()` (client present and `enabled`) replaces a DSN check: it is false in node/tests and false in the
  browser without a DSN, so the module is safe to import anywhere and needs no `window` guard.
- `setErrorUser(id: string | null)` → `Sentry.setUser(id ? { id } : null)` — only the id (automatic user data off).
- `lib/report-error.test.ts`: `vi.mock('@sentry/nextjs')` → capture called with `tags.where`/`extra`, no console in the
  enabled non-dev case; disabled → console.error once, no capture; `setErrorUser('u')`/`(null)` → `setUser({id})`/`(null)`.
- ESLint: a `@sentry/*` `no-restricted-imports` pattern added to every existing boundary block (later flat-config blocks
  replace the rule's options, so it cannot be one global block) plus a catch-all block for the rest, with
  `lib/report-error.ts`, `instrumentation-client.ts` and `next.config.js` ignored.

## Report sites (`console.error` → `reportError`; toasts unchanged; `console.warn` stays on expected paths)

| Site | `where` | Note |
|---|---|---|
| `useDicePipeline` catch | `dice-pipeline` | report + `failGeneration` only when `runId` is current → one report per failure |
| `autosave.ts` `saveToCloud` catch; missing `cloudVersion` invariant | `autosave-save` / `autosave-invariant` | conflicts / deleted-elsewhere untouched; keepalive keeps `console.warn` (fires on `pagehide`, offline is normal) |
| `draft.ts` corrupt draft, IDB read/write, legacy image migration | `draft-parse` / `draft-idb` / `draft-migrate` | `localStorage` write failure stays a warn (quota / private window) |
| `useProjects.ts` load / list / create / remove; `useEditorBootstrap` list ×2 | `projects-*` | `ProjectLimitError` excluded (already); a `DocumentError` on load is reported (corrupt row) |
| `UploadMain` catch | `upload` | decode / downscale / create |
| `useUser.tsx` `getSession` error | `auth-session` | profile-fetch fallback stays a warn |
| `useBlueprintDownload`, `ProgressPreviewModal` rasterize | `blueprint-svg` / `preview-raster` | same family as the pipeline (verification 4 wants no stray `console.error` in features) |
| billing: `PricingCards` checkout, `AccountScreen` sync ×2 + `runAction` | `billing-*` | via `reportBillingError(error, where)` in `lib/supabase/billing.ts`: a `BillingError` with a 4xx status → `console.warn` (envelope: 401/404/409/429), anything else → `reportError` |
| `app/error.tsx`, `app/(editor)/editor/error.tsx` | `root-boundary` / `editor-boundary` | editor boundary: "Something went wrong" + "Reload editor" (`reset()`) + "Back to home", same markup pattern as the root one |

`ProfileProvider`: `useEffect(() => setErrorUser(user?.id ?? null), [user?.id])`.

`draft.test.ts` mocks `@/lib/report-error` and asserts `reportError` for the corrupt-data cases (was `console.warn`).

## Env and docs

`.env.example`: `NEXT_PUBLIC_SENTRY_DSN` (exists) + commented `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` ("only in
the Cloudflare Pages build env; enables the source-map upload"). `docs/DEPLOY.md`: the three rows in the Pages env table +
a short Sentry paragraph (create the project, DSN into `NEXT_PUBLIC_SENTRY_DSN`, token/org/project for source maps).

## Verification

1. `rm -rf .next out && npm run build` with no `SENTRY_*`/DSN → 0, `out/` layout unchanged (E1 list), no `.map` files.
2. Same with `NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0` → 0; the DSN string appears in
   `out/_next/static` only in this build; no network from the build (no token → sourcemaps disabled, `telemetry: false`).
3. `npm test` green incl. `lib/report-error.test.ts`; a node one-liner importing `lib/report-error.ts` (no DSN) does not throw.
4. Static smoke: E1's resolver script on `out/` → `/editor` 200.
5. `git grep -n "@sentry" -- app components lib features core` → `lib/report-error.ts` only (+ root `instrumentation-client.ts`,
   `next.config.js`); `git grep -n "console.error" -- features lib` → `lib/report-error.ts` and `lib/utils/debug.ts` (dead
   file, E3 delete list) only.
6. `npm run typecheck && npm test && npm run lint && npm run build` → all 0.
7. Manual (user): create a Sentry project, set `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_AUTH_TOKEN/ORG/PROJECT` for source
   maps) in the Pages env; forced throw in a step component → boundary + event in Sentry tagged with the user id; DSN
   unset → no network, no console noise; pipeline error sets `derived.error` and reports once.
