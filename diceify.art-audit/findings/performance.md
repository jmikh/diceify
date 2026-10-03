# Performance and Core Web Vitals audit: diceify.art (2026-10-03)

**Performance score: 78 / 100** (lab scores 75-99, but gallery LCP fails on mobile, caching is unconfigured, and there is no field data to confirm).

## Data sources and limits
- **Field data (CrUX/PSI): NOT AVAILABLE.** `pagespeed_check.py` returned "PSI rate limit exceeded" for both strategies. `crux_history.py` needs `GOOGLE_API_KEY` and exited with "API key required". Whether diceify.art has CrUX data (~220 organic clicks/28 d suggests it may be thin) is unknown. Pass/fail below is **lab only** and is not a 75th-percentile verdict. Re-run PSI later or set a key.
- Lab: six Lighthouse **12.8.2** JSON reports (simulated throttling; mobile = Moto G Power 2022 emulation, 412x823, DPR 1.75). Single runs, so expect noise.
- `errors-in-console` is a **false positive** (sandbox blocks googletagmanager.com and cloudflareinsights.com). Same caveat: GA4's real cost is not measured. Both requests show 0 bytes. Real-world GA4 adds roughly 50+ KB script and some main-thread time that this lab cannot see.

## Core Web Vitals (lab)
| Page | LCP m / d | TBT m (INP proxy) | CLS m / d | Verdict |
|---|---|---|---|---|
| / | 2.4 s / 1.2 s | 100 ms | 0 / 0.032 | Pass (mobile LCP close to 2.5 s edge) |
| /dice-art | 3.0 s / 0.8 s | 60 ms | 0 / 0 | **LCP needs improvement on mobile** |
| /gallery | **6.1 s** / 1.4 s | 60 ms | 0 / 0 | **LCP poor on mobile** |
- INP cannot be measured in a no-interaction lab run. TBT 0-100 ms and a 647-element max DOM make a good INP likely on marketing pages. The /editor app was not audited and is the real INP risk.
- CLS is fine. Only shift: home desktop 0.032 on `div.hero-content` (well under 0.1; likely font swap with `display: 'swap'` on Outfit/Syne).
- TTI (9.9 / 6.8 / 7.7 s mobile) is not a CWV and not in the score. It is inflated by the simulated "5 s network quiet" window: 45-49 requests, ~1.1-2 MB of lazy images, and PostHog's 5 requests. Do not chase it directly. Reducing requests and bytes fixes it as a side effect.

## Findings

### 1. HIGH: /gallery LCP image is lazy-loaded (6.1 s mobile, score 75)
- LCP element: Mona Lisa card `<img loading="lazy" data-nimg="fill">` (174x174 CSS px mobile).
- LCP phases (mobile): TTFB 1,070 ms, **load delay 1,611 ms (26%)**, **load time 3,393 ms (56%)**, render 35 ms. `lcp-discovery-insight` score 0: no fetchpriority=high, request not discoverable in initial HTML (it is `lazy`, so it waits for layout), lazy applied. `lcp-lazy-loaded` score 0.
- Load time is long because the 142 KB file competes with other card images and ~2 MB of page images on throttled 4G.
- Fix (`app/(marketing)/gallery/page.tsx`, `GalleryCard`): take an `index` prop and pass `priority={index < 4}` to `<Image>` (next/image then sets eager + fetchpriority=high + a preload). First row is 2 cards on mobile and 4+ on desktop (`auto-fill, minmax(200px,1fr)`). Combine with the srcset fix (images.md) so those first images are about 20-30 KB. Expected gallery mobile LCP about 2.3-2.8 s, score about 92+.

### 2. HIGH: no long-lived caching on hashed assets or images
- Headers per CONTEXT: `cache-control: public, max-age=0, must-revalidate` on `/_next/static/*` and `/images/*`. `public/_headers` exists (security headers only, `/*`) but has no cache rules.
- Lighthouse's `uses-long-cache-ttl` only reports 1 resource (1 KiB) because it skips max-age=0 entries, so the lab **understates** the issue. Real cost: every repeat view and every page navigation revalidates ~50 requests (each a conditional 304 round trip, 30-100+ ms on mobile) instead of hitting disk cache. Roughly 0.5-2.5 MB of images on cold cache.
- Fix: append to `/Users/johnmikhail/Projects/diceify/public/_headers` (Workers static assets support `_headers`; Next copies `public/` into `out/`):
```
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=2592000, stale-while-revalidate=604800

/favicon*
  Cache-Control: public, max-age=604800
/android-chrome-*
  Cache-Control: public, max-age=604800
/apple-touch-icon.png
  Cache-Control: public, max-age=604800
```
  Leave HTML on the default `max-age=0, must-revalidate` so deploys are visible immediately. `/images/*` filenames are not content-hashed, so replacing a photo in place would serve stale for up to 30 days: either rename on change (the new resized variants are a good moment to adopt `name.<hash>.webp`) or use a shorter TTL (1 day). Also note `_headers` has a `/*` block; later matching blocks merge, they do not replace, so security headers stay. Verify with `curl -I` after deploy. Keep the file under Workers' 100-rule limit (fine).

### 3. HIGH: image bytes (largest weight item; full detail in images.md)
- Total transfer: / 2,131 KiB mobile (images 1.41 MB), /gallery 2,580 KiB (images 2.01 MB), /dice-art 990 KiB (images 376 KB).
- `image-delivery-insight` savings: home 1,308 KiB m / 1,365 d, gallery 1,889 / 1,848, dice-art 361 / 344. `uses-responsive-images` waste: home 981 KiB m / 1,222 d, gallery 1,432 / 1,680. Cause: `images.unoptimized: true` means next/image emits no srcset/sizes, so 600x600 files (140-175 KB) are served for 174-280 px slots.

### 4. MEDIUM: JavaScript weight and third parties
- JS transfer: home 656 KB, gallery 532 KB, dice-art 533 KB. Unused JS: home 316 KiB, gallery 250 KiB (score 0 on gallery), dice-art 250 KiB. TBT is small (60-100 ms) and bootup 0.4-0.5 s, so this hurts bytes and TTI more than interactivity.
- Largest chunks (home): `b468fba8` 103 KB (framework, 61% unused), `940-*` 96 KB, `928-*` 87 KB (only on home), `fd9d1056` 56 KB, `830-*` 54 KB (93% unused), `page-*` 33 KB (the **/editor** page chunk).
- **Editor chunk prefetch:** on home the requests include `editor.txt?_rsc=...`, `page-0973da7c31152a4a.js` (33 KB), `error-*.js`, `layout-*.js`. Those are `next/link` viewport prefetches of /editor (CTA buttons). They run on throttled mobile bandwidth right when the hero loads. Set `prefetch={false}` on `<Link href="/editor">` in marketing components (Hero, Navbar, CTAs), or prefetch on hover only. Saves ~35-60 KB on the critical window.
- **PostHog (118.8 KB over 5 requests from us-assets.i.posthog.com; Lighthouse attributes 7-26 ms blocking):** `posthog-recorder.js` 68 KB (session replay), `surveys.js` 34 KB, `dead-clicks-autocapture.js` 9 KB, `web-vitals-with-attribution.js` 7-8 KB, plus the core dynamic chunk. 97 KB of this is optional. `lib/analytics.ts` `loadPosthog` starts at mount (`useEffect` in `components/Analytics.tsx`) so it competes with LCP resources. Options (product decisions: replay and surveys are the owner's call): (a) in `posthog.init` add `disable_surveys: true`, `capture_dead_clicks: false`, `capture_performance: { web_vitals: false }` (about -50 KB, no replay loss; check the option names against the installed posthog-js 1.435); (b) start replay only on `/editor` and `/s/*` rather than all marketing pages (`disable_session_recording: true` then `posthog.startSessionRecording()` there); (c) defer init with `requestIdleCallback(() => ..., { timeout: 3000 })` inside `initAnalytics`. Caveat: deferring delays the first pageview slightly. Bounce-before-idle visitors would not be captured, so keep the timeout short.
- **Preconnect:** `uses-rel-preconnect` flags `us-assets.i.posthog.com` (300 ms) on gallery mobile only. If PostHog stays eager, add `<link rel="preconnect" href="https://us-assets.i.posthog.com" crossOrigin="anonymous">` in `app/layout.tsx` head. If deferred to idle, skip it, since preconnect then adds no value. Also `us.i.posthog.com` (event host) is hit later and needs no hint.
- **Legacy JS 49 KB** (all five pages): `940-*` 13.5 KB, posthog recorder 10.8, surveys 8.6, `b468` (framework) 8.5, posthog web-vitals 8.3. About 27 KB is PostHog's own bundle (out of your control; removing the optional modules removes it). The rest is Next's baseline polyfills. Next 14 has no `browserslist` in this repo's package.json; adding a modern target (`"browserslist": ["chrome >= 100","safari >= 15.4","firefox >= 100","edge >= 100"]`) trims some of it. Low gain, low priority, and touching browser support is a product call.
- Third-party summary: posthog.com 118.8 KB / 7-26 ms blocking. GTM/Cloudflare show 0 (blocked here). `third-parties-insight` score 1.

### 5. MEDIUM: render-delay-dominated LCP on text pages (home mobile 2.4 s, dice-art mobile 3.0 s)
- Home LCP element is the `<h1>`; dice-art's is a `<p>`. Phases: TTFB ~1.0-1.3 s (simulated throttled RTT; real server response is 60-160 ms, `server-response-time` passes), **element render delay 1.37 s (57%) home, 1.70 s (57%) dice-art**, load delay/time 0. Render is gated by 2 render-blocking CSS files (`9e8d6ae2` 10.6 KB, `44c199b7` 4.1 KB, about 170-330 ms estimated) and two woff2 fonts (32.6 KB + 34.9 KB, `display: swap`, preloaded by next/font).
- Home hero images (`kids-dice.webp` 138 KB + `kids-photo.webp` 79 KB) both have `fetchpriority="high"` (in `DiceLens.tsx`) and are fetched at 333 ms alongside CSS. On mobile the h1 is the LCP, so the 217 KB of high-priority image data competes with the CSS/fonts and delays the h1. Fix: keep `fetchPriority="high"` only on the visible dice image; give the hidden "reveal" photo `loading="lazy"` or no priority, and ship a smaller mobile variant (see images.md). Likely LCP gain 0.2-0.5 s on mobile.
- `network-dependency-tree-insight` shows longest chain 1.67 s via `/manifest.json` (not render critical, 0.7 KB). The CSS bundle is small; inlining critical CSS is not worth the complexity.

### 6. LOW: other
- Home desktop CLS 0.032 on `hero-content`: reserve with `size-adjust` (next/font already does fallback metric matching for Google fonts) or check whether DiceLens animates the layout. Within "good".
- Cloudflare Insights beacon (`static.cloudflareinsights.com`) is injected by Cloudflare's Web Analytics and appears redundant with GA4 and PostHog. Disabling it in the Cloudflare dashboard removes one script. Optional.
- Server: TTFB real 60-160 ms, HTTP/2, brotli (HTML 105 KB to 14.6 KB), CF cache HIT. No action.
- DOM: 647 / 260 / 107 elements, no issue. Bootup 0.0-0.5 s, main thread 0.2-1.5 s, no forced reflows (score 1), fonts score 1, unsized-images score 1 on all reports.

## Prioritized actions
| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | `priority` on first gallery cards (`index < 4`) | 5 min | Gallery mobile LCP 6.1 s to about 2.5 s |
| 2 | Add cache rules to `public/_headers` | 5 min | Repeat views and navigation, no lab-score change |
| 3 | Generate resized webp variants + custom image loader (images.md) | 1-2 h | -1 to -1.9 MB per page, LCP and TTI on mobile |
| 4 | `prefetch={false}` on /editor links | 10 min | -35-60 KB early, less contention |
| 5 | Trim/defer PostHog (surveys, dead clicks, web-vitals; idle init) | 30 min | -50 KB or more, earlier LCP |
| 6 | Only one hero image high priority | 10 min | 0.2-0.5 s home mobile LCP |
| 7 | modern browserslist, preconnect (only if PostHog eager) | low | small |

## What works
- Static export on Cloudflare: real TTFB 60-160 ms, brotli, cache HIT, HTTP/2.
- CLS is 0 on nearly all runs, images on the home page have width/height, fonts use next/font with `display: swap`, no font or layout reflows.
- Low TBT (0-100 ms), small DOM, no unminified JS, no render-blocking JS, tiny CSS (about 15 KB total).
- PostHog is already a dynamic import (kept out of the first-load bundle), GA4 via `@next/third-parties`.
- Formats are already webp; hero image has `fetchpriority="high"`; security headers are in place.
