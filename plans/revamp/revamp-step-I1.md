# Step I1 — PostHog product analytics (alongside GA4)

User request (2026-10-02): "I want to use PostHog here. What should I measure?" → the measurement plan below → "ok let's
start". Decision taken by default (recommended, not contradicted): PostHog runs **alongside** GA4; every event goes to
both through one adapter. GA4 stays for acquisition/SEO reporting.

The question the data must answer: **does a free user reach the 5-row build wall, and does the wall convert?**

## Adapter

- `lib/analytics.ts` — the only importer of `posthog-js` and of `sendGAEvent` (ESLint `no-restricted-imports`, same
  pattern as `lib/report-error.ts` for Sentry; `GoogleAnalytics` itself stays importable). Exports:
  - `track(event, props)` typed by `AnalyticsEvents` (the full catalog), sends to GA4 and PostHog;
  - `identifyUser(id)` (GA4 `user_id` + its `login` event, unchanged from `AnalyticsTracker`; PostHog `identify`),
    `setUserProperties({ plan })`, `resetUser()`, `rememberShareReferral(shareId)` (super property `ref_share_id`);
  - `initAnalytics()`, `GA_MEASUREMENT_ID`, `NO_CAPTURE_CLASS`.
- PostHog is a dynamic `import('posthog-js')` started by `components/Analytics.tsx` (root layout, also renders the GA4
  tag) or by the first call; calls chain on the one promise, so they keep their order. A static import added ~100 kB
  (gzip) to the first load of every page that tracks.
- Config: `defaults: '2026-08-30'` (pageview on every client-side route change), `person_profiles: 'identified_only'`,
  `session_recording.blockSelector` for `blob:`/`data:` images. `NEXT_PUBLIC_POSTHOG_KEY` unset → never loaded;
  `NEXT_PUBLIC_POSTHOG_HOST` defaults to the US cloud.
- Identity: `AnalyticsTracker` (editor layout, inside `ProfileProvider`) identifies on a user id, resets only on a
  sign-out (a signed-out arrival must not mint a new anonymous id), sets `plan` once the profile is loaded.

## Events

| Event | Where | Properties |
|---|---|---|
| `$pageview`, autocapture | PostHog itself | — |
| `editor_opened` | `useEditorBootstrap`, after boot | `signed_in`, `restored` (an image was restored) |
| `photo_uploaded` | `useStartProject`, after success | `file_type`, `file_size` |
| `crop_completed` | `useStepNavigation` → `trackStepChange`, leaving crop | `aspect_ratio` |
| `tune_completed` | same, arriving at build (from tune or crop) | `rows`, `cols`, `total_dice`, `color_mode`, `contrast`, `gamma`, `edge_sharpening`, `rotate6/3/2` |
| `build_started` | `moveTo` → `trackBuildMove`, first forward move from die 0 | `total_dice` |
| `build_progress` | same, each milestone passed (`buildMilestonesCrossed`, core) | `percent` (25/50/75/100; 100 = last die), `total_dice` |
| `paywall_shown` | `useGate().gate(allowed, feature, …)` when it blocks | `feature` (`build_limit` / `blueprint` / `share` / `upgrade`), `prompt` (`sign_in` / `limit` / `proFeature`) |
| `click_upgrade` | unchanged sites | `source`, `plan_type?` |
| `checkout_started` | `PricingCards.goToCheckout`, before the redirect | `plan` |
| `purchase_completed` | **server**: `stripe-webhook`, `checkout.session.completed` after a successful sync | `checkout_plan`, `mode`, `revenue`, `currency`, `$set.plan`; `distinct_id` = `client_reference_id` (user id); uuid from the Stripe event id (PostHog de-duplicates redeliveries) |
| `blueprint_downloaded` | `useBlueprintDownload` | `total_dice` |
| `share_create`, `share`, `share_view`, `share_cta_click` | unchanged (H1) | unchanged; `share_view` also registers `ref_share_id` |
| `go_to_editor`, `hub_click`, `blog_click`, `unsupported_login_provider_click` | unchanged marketing sites | unchanged |

Not tracked on purpose: slider moves, autosave, undo/redo, anything about the photo itself.

## Privacy

- Replay masks inputs (default). The photo never reaches a replay: `blob:`/`data:` images are blocked by selector (the
  cropper's photo, local thumbnails, the dice preview); `NO_CAPTURE_CLASS` (`ph-no-capture`) on `ProjectThumb` (signed
  URLs of the cropped photo) and on the dropzone's file input (replay records file input values = file names).
- Canvas capture stays off (PostHog project setting).
- Privacy policy §2.4 must be reworded before the key goes live (it says "Vercel Analytics" and "anonymized"):
  TODO(user) updated, draft wording in `revamp-agent-suggestions.md`.

## Server side

`supabase/functions/_shared/analytics.ts`: `purchaseEvent(event, plan)` (pure, vitest) and `capture(e)` (Deno `fetch` to
`<host>/i/v0/e/`, 3 s timeout, never throws). Secrets `POSTHOG_KEY` (+ `POSTHOG_HOST`); unset → nothing sent.

## Verification

- `npm run typecheck && npm test && npm run lint && npm run build` + `npm run functions:check` green.
- Unit tests: `core/dice/build.test.ts` (`buildMilestonesCrossed`), `features/editor/analytics.test.ts` (step and build
  event rules through the real `moveTo`), `supabase/functions/_shared/analytics.test.ts` (purchase mapping, uuid).
- ESLint probe: `posthog-js` / `sendGAEvent` imports outside `lib/analytics.ts` are errors.
- Bundle: first load of `/`, `/blog`, `/share`, `/editor`, `/account` within 2 kB of HEAD; PostHog is its own lazy
  chunk (~100 kB gzip); no key in `out/`.
- Manual (not run, repo rule): with `NEXT_PUBLIC_POSTHOG_KEY` set, PostHog → Activity shows `$pageview` on `/` and on
  a client-side route change; upload → crop → tune → build → 25 % shows the funnel events in order; sign-in merges the
  anonymous events into the user (person page); sign-out → a new anonymous id; a replay of the crop step shows a
  placeholder instead of the photo; Stripe test checkout (`stripe:listen`) → `purchase_completed` on the same person.
