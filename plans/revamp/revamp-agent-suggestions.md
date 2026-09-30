# Revamp — agent suggestions

Out-of-scope findings recorded by each step. Restructured in E3: **Open for the user** is the current list (one bullet per
item, prefixed with the step that raised it); **Resolved** keeps one line per item that a later step closed, for the record.
New findings go under "Open for the user"; when one is acted on, move it to "Resolved" with the step that did it.

## Open for the user

Product / policy decisions (not made by any step):

- D2: an active Creator pass blocks a Studio checkout (409 `ALREADY_SUBSCRIBED`, "no stacking"); `StudioCard` used to allow that upgrade. Allowing creator → studio is a one-line change in `handleCheckout` (`hasPaidAccess` → "plan is studio/lifetime").
- D2: `GET /billing/sync` keeps its 30 s window, so the `?checkout=success` poll reads Stripe only on its first attempt; without webhooks a purchase finalised later shows "Still processing" until Refresh 30 s later. A `?force=1` bypass for the checkout return would close the gap.
- D2: `resume` sends `cancel_at_period_end: false`, which does not clear a subscription cancelled with a fixed `cancel_at` date (dashboard "cancel at a specific date"); the Resume button then reappears harmlessly. Also send `cancel_at: ''` if that flow is expected.
- E3: `robots.ts` disallows `/account` only. The binding brief asked to disallow `/editor` too, but `app/(editor)/layout.tsx` carries keywords, a canonical and WebApplication JSON-LD written for search and the page has been in the sitemap — decide whether `/editor` should be indexed; if not, add it to `disallow` and drop it from `app/sitemap.ts`.
- E3: Terms §4.4/§5.1 say the Creator Pass grants "permanent access"; it is a 30-day pass (`core/billing/plans.ts`). §5.1 also says cancellation is "through the Stripe Customer Portal" — it is now in-app on `/account` as well. `TODO(user)` comments mark the lines; wording to be supplied.
- E3: Privacy §2.4 names "Vercel Analytics"; the site uses Google Analytics and Sentry (client error reporting, user id only). `TODO(user)` comment marks the line.
- B5: blog, gallery, dice-art, privacy and terms render no `<Navbar/>`/`<Footer/>` (a "Back" link only). If they should, add both to `app/(marketing)/layout.tsx` and drop the landing page's copies.
- B3: one `modal` slot means `UpgradeButton` inside `LimitReachedModal` replaces the limit modal instead of stacking. Fine unless someone misses the stacked look.
- B4: undo of a `numRows` change while on the build step regenerates a smaller grid but keeps `buildProgress`, which can sit outside the new grid until build is re-entered. Clamp in `useDerivedStore.setGrid` if it ever shows as a blank selector.
- B4: keyboard nudges on a focused slider are one undo entry per key press (pointer drags are batched). Wrap `onKeyDown/Up` in the same interaction if that feels noisy.
- C2: `LimitReachedModal` and the landing Explorer card hard-code "5 rows"; `BuilderLimitToast` reads `ent.builderRowLimit`. One line to read it from `useEntitlements()` if the explorer limit ever changes.
- C2: `AnalyticsTracker` fires a GA `login` event on every editor page load for a signed-in user (same frequency as before). Key it on `SIGNED_IN` in `ProfileProvider` if "login" should mean "just signed in".
- C2: an OAuth round trip returning with `#error=…` is only reported by `auth.initialize()`; `ProfileProvider` does not surface it. A "sign-in failed" toast needs `initialize()` in the provider (sonner is available).
- C3: a signed-in user with a waiting draft saves it only via the header dropdown's "Create New Project"; a visible "Save project" button is a one-liner on `createFromDraft` in `ProjectSelector`.
- C2/D2: `features/billing/PricingCards.tsx` `PRICING_CONFIG` duplicates `core/billing/plans.ts` `PRICING` (prices/description); the bullet lists are UI copy. Build the cards on `PRICING` in a UI pass.
- B2/B5: three viewport hooks coexist (`useMediaQuery` in lib, `useWindowSize` local to `CropperMain`, `useElementSize` in `BuildViewer`). `CropperMain` could size its stencil from its container via `useElementSize` — a behaviour change, for a UI pass.
- E1: no CSP in `public/_headers`. Needs `script-src` for `googletagmanager.com` + Next's inline scripts, `connect-src` for the Supabase URL/`*.google-analytics.com`, `img-src data: blob:`, `form-action` to `checkout.stripe.com`/`billing.stripe.com`. Start with `Content-Security-Policy-Report-Only` once the hosted Supabase URL is fixed (F2).
- E2: `withSentryConfig`'s default `errorHandler` throws, so with `SENTRY_AUTH_TOKEN` set a failed source-map upload fails the Pages build. Pass `errorHandler: (err) => console.warn(err)` if deploys should survive that.
- E2: the Sentry runtime is bundled without a DSN (`/editor` first-load JS 388 kB). `bundleSizeOptimizations: { excludeTracing, excludeReplayShadowDom, excludeReplayIframe, excludeReplayWorker }` could trim it — measure first.
- E2: release naming is the bundler plugin's default (git `HEAD` sha). Verify the `release` tag on the first preview event; if empty, set `release: { name: process.env.CF_PAGES_COMMIT_SHA }`.
- E2 (plan "Not now"): Next 15 upgrade — no Sentry changes needed; needs the React 19 peer audit of cropper/motion/gesture libs.
- E3: `npm audit` (6 findings, all major bumps): `next@14.2.35` (critical/high — image optimizer DoS etc., server-side features a static export does not run; fix = Next 16), `postcss` via `next`, `@next/third-parties` (via `next`), `vitest@3` (moderate, `@vitest/mocker`; fix = vitest 5, blocked by the A1 npm issue), `sharp@0.34` (high, libvips/libheif; fix = `sharp@0.35`, dev-only fixture generator — a bump must be followed by `npm run gen-fixtures` to confirm a clean diff). No fix applied.
- E3: `public/android-chrome-{192,512}.png` are referenced by nothing (`manifest.json` lists only `favicon.svg`). Add them to the manifest `icons` or delete them.
- A1: vitest is pinned to `^3` because npm 11.5.1 cannot resolve vitest 4/5 (arborist crash / missing rolldown bindings). Revisit after `npm i -g npm@latest`.
- A1: `package-lock.json` was regenerated from scratch in A1; transitive deps moved within their ranges. Smoke-test sign-in + Stripe on `master`'s deploy path before cut-over (F2) or diff the lockfile if anything regresses.
- C3: legacy `.env.local` vars (`DATABASE_URL`, `NEXTAUTH_*`, `STRIPE_*`, `CLOUDINARY_*`) are dead; trim the file to the values in `.env.example` (gitignored; the root `.env` is Prisma-era and untracked — delete it locally).
- B4: worth one manual check that undo of a wheel-zoom in the crop step lands where expected (`setCoordinates` with `imageRestriction: stencil` may fit rather than apply the box); if not, `setState` with the full saved cropper state would need `crop` to carry `visibleArea`.

For F1 / F2:

- A3: legacy Prisma users with `subscriptionStatus = 'creator_pass'` have no equivalent status; F1 must map them to `plan = 'creator'`, `plan_expires_at = subscriptionExpiresAt`; `isPro && planType='explorer'` rows should be inspected by hand.
- D1/D2: the F1 migration script needs `syncBillingFromStripe` from Node; `stripe` is a Deno-only dependency now — either add it as a devDependency or run the sync under Deno (the D2 integration test uses a 15-line `fetch` helper instead). Decide once.
- B1: `lib/image/*` canvas paths (`drawRegion`, `rasterizeSvg`) have no unit tests (node env). If a DOM environment is ever added (`jsdom` + `canvas`), `cropToPixels` on a 2×2 image with rotation 90 is the first test to write.
- E2: no test covers the report sites in `autosave.ts`/`useProjects.ts` (network paths; the integration suites are opt-in).

Operational notes (no action; kept because they explain non-obvious behaviour):

- C1: the local stack runs on ports 5433x (API 54331, db 54332, Studio 54333, Mailpit 54334) beside another stack on 5432x. `supabase status -o env` prints both the legacy JWT anon key and `sb_publishable_…`; either works. A missing `supabase/.env` is silent (empty Google credentials → GoTrue JSON 400 page on sign-in, not a modal error).
- C1: `BEFORE INSERT` triggers run before CHECK/RLS, so a user at the limit gets `PROJECT_LIMIT` even for rows that would fail the folder CHECK. `supabase gen types` types `effective_plan`'s argument as the whole row — compute entitlements in TS.
- C3: `flushKeepalive()` while a save is in flight sends a second CAS PATCH; whichever lands second misses (rare, tab hidden within ~1 s of a save). `documentJson()` round-trips through JSON to satisfy the generated `Json` type.
- D1: `stripe listen` delivers payloads in the account's default API version regardless of the SDK pin (the webhook re-reads Stripe, so harmless); `functions serve` does not hot-reload `--env-file`; kong answers `OPTIONS` itself locally; the gateway's own 401 body is not our envelope (client maps to `INTERNAL`); PostgREST timestamps are `+00:00` not `Z`; the `stripe listen` secret is stable per account; `_shared/billing-sync.ts` reads root `current_period_end` through an `unknown` cast as a fallback.
- D2: `handleCheckout` takes the email from the JWT; cancel/resume act on the stored row and answer 409 `STALE` after a re-sync when Stripe rejects; `stripe trigger checkout.session.completed` fires ~8 sibling events (all 200).
- E1: the export writes `out/*.txt` RSC payloads and copies `public/.DS_Store` on macOS — harmless on Pages.
- B5: `theme.colors.glass.border` (white/0.10) maps to `--border-glass` (white/0.08); `--glass-medium` is the exact old value. The Reddit banner in `EditorHeader` uses `mt-4 -mb-1` to keep its old y-position.
- B1: `cropToPixels` never upscales (the old `getCanvas({ width: 2048 })` did), so tiny images sample at native resolution.

## Resolved

- A1 `rules-of-hooks` warnings → `error` (B2). A1 `no-img-element` → rule off (E3). A1 svg-renderer dot layout → `core/dice/svg.ts` (A3/B1).
- A2 `public/demo-portrait.jpg` placeholder → deleted (B5; verified E3). A2/A3/C1 root `tsconfig` `target` → `es2022` (E3). A2 `generateGrayscalePreview` duplication → `useDicePipeline` on core (B1).
- A3 `npm:zod@3` → `npm:zod@4` (D1). A3 two long-side rules → `rasterSize` per caller (B1). A3 `app/api` build noise → gone with `app/api` (E1). A3 lifetime user + portal → portal for any Stripe customer (D2).
- B1 dead `commission-interest`/`croppedImage` → gone (C3/E1). B1 `TunerMain` spinner heuristic → `isGenerating` (B3). B1 `exhaustive-deps` counter-ref false positive → documented line disable, rule at `error` (E3). B1 `CropperMain` unused imports → gone (E3 verified). B1 off-by-one → fixed by `isCompleted` (B1).
- B2 `progressPercent` ×3 → `useBuildProgress` (B3). B2 two is-pro predicates → `useGate`/`useEntitlements` (C2). B2 `vitest` include for `components/` → moot after B5.
- B3 `DiceStepper.module.css` orphan → gone (verified E3). B3 `saveStatus.ts` → `useProjectStore` (B5). B3 ratio/rotation double history entries → tracked/untracked reports (B4). B3 `ProjectSelectionModal` `Project` DTO → rewritten (C3). B3 `hydrateFromLocalDraft` quota → IndexedDB image (C3). B3 unused `displayName`/`Link` → removed (E3).
- B4 `useBuildGate` on `session.user.planType` → `useEntitlements` (C2).
- B5 dead marketing CSS classes + no-op `.content` → removed (E3). B5 `lib/types/index.ts` → deleted, importer on `@/core/dice` (E3). B5 README/CLAUDE stale layout → rewritten (E3). B5 `PricingCards` `/api/stripe/checkout` → `lib/supabase/billing` (D2). B5 28 lint warnings → 0 (C2, E3).
- C1 `[functions.stripe-webhook]` stanza → uncommented (D1). C1 `PROJECT_LIMIT` details JSON string → parsed defensively (C3). C1 storage body `statusCode` → `mapStorageError` (C3). C1 `image_path` mutable → `..._image_path_immutable.sql` trigger (C3). C1 OAuth misconfiguration → documented in `docs/DEPLOY.md` (C2).
- C2 `loadProject` legacy fallback → `projects.get(id)` (C3). C2 `publicEnv` validating four values → Supabase pair only (E3).
- C3 editor page `<Suspense>` → removed (E3). C3 `stripe` npm dependency → removed (D1). C3/E2 `lib/utils/debug.ts` → deleted; `devError` → `reportError`/`console.warn` (E3).
- E1 `sitemap.ts` `/auth/signin` + `robots.ts` `/api/`, `/auth/` → fixed (E3). E1 `NEXT_PUBLIC_APP_URL` unread → dropped (E3). E1 privacy "Vercel Analytics" + CLAUDE.md "Vercel/Railway" → `TODO(user)` comment + CLAUDE.md rewrite (E3). C2/E1 `.next/types` in `tsconfig.include` → kept on purpose (Next re-adds it; `rm -rf .next` documented) (E3).
- E2 `publicEnv.sentryDsn` unread → dropped (E3). E2 Next 14 never calls `onRouterTransitionStart` — harmless, noted in the E2 step doc.
