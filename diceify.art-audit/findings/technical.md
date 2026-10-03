# Technical SEO findings: diceify.art (2026-10-03)

Score: **72 / 100**

## Category status
| Category | Status |
|---|---|
| Crawlability | Pass with issues (/account, no AI/llms rules) |
| Indexability | Warn (canonical slash, blog post unindexed, /editor+/account duplicate meta) |
| Security headers | Warn (no HSTS, no CSP) |
| Caching | Fail (max-age=0 on everything) |
| URL structure | Warn (307 redirects, slash form mismatch) |
| Mobile | Pass |
| CWV potential | Warn (gallery LCP 6.1s mobile, no srcset) |
| JS rendering | Warn (/editor, /account shells) |
| Structured data | Pass (see schema agent) |
| IndexNow | Not implemented (Info) |

## Findings

### High
**H1. Caching: `max-age=0, must-revalidate` on all assets incl. hashed `/_next/static/*` and 140-175 KB images.**
Evidence: curl on /favicon.ico, /sitemap.xml, all pages and assets return `cache-control: public, max-age=0, must-revalidate`. public/_headers contains no cache rules. Repeat visits revalidate ~47 images and all JS chunks. Hurts repeat-visit speed and crawl budget.
Fix: in public/_headers add
```
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
/images/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/*.ico
  Cache-Control: public, max-age=86400
```
Keep HTML on revalidate. (Workers static assets honour `_headers` in `out/`; verify `public/_headers` is copied by the export. It is, since the existing security headers show up.)

**H2. Gallery LCP 6.1 s mobile: LCP element is a lazy-loaded image; no srcset; ~1.4-1.7 MB responsive-image waste; only 2/47 homepage imgs have width/height.**
Fix: in the gallery component, make the first 1-2 images `loading="eager"` + `fetchPriority="high"`; generate 400/800 px webp variants and use srcset/sizes (or next/image with a Cloudflare loader; `images.unoptimized` is required for export, so pre-generate variants in scripts/); add width/height everywhere (CLS 0.03 desktop home).

**H3. Canonical trailing-slash inconsistency on the homepage.**
Evidence: canonical, og:url, hreflang and sitemap `<loc>` are `https://diceify.art` (no slash); Google picked `https://diceify.art/`. The root URL always has a slash in HTTP, so the declared value is technically a different string. Causes the sitemap "29 warnings" and the stale "8 submitted / 0 indexed" counter risk.
Fix: lib/seo.ts: have `pageMetadata` emit `${SITE_URL}/` for the home path only (inner pages stay slashless, which matches `trailingSlash:false`). Same in app/sitemap.ts first entry (`url: SITE_URL + '/'`), the hreflang alternates and JSON-LD `url`/`@id` for the home page. Re-submit the sitemap in GSC.

### Medium
**M1. /account is indexable (`index, follow`, 200) yet robots.txt `Disallow: /account`.**
Evidence: data/raw/account.out has `robots: index, follow`, title/description identical to /editor, canonical `https://diceify.art/editor`. Disallow blocks crawling so Google can never see a noindex, and the canonical consolidation is invisible too. A blocked URL can still be indexed from links (URL-only listing).
Fix: either (a) remove `Disallow: /account` from public/robots.txt and set `robots: { index: false, follow: false }` in the account route metadata (preferred, since the noindex then works), or (b) keep the Disallow and accept the risk. Give /account its own title ("Account | Diceify").

**M2. No HSTS.** Evidence: no `strict-transport-security` header. Fix in public/_headers: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (add `preload` only once all subdomains are HTTPS). Also enable "Always Use HTTPS" in Cloudflare. http->https was not verifiable from this network (middlebox).

**M3. No Content-Security-Policy.** Site loads GA4, PostHog, Cloudflare Insights, Sentry, Supabase, Stripe. Fix: ship `Content-Security-Policy-Report-Only` first in public/_headers (script-src 'self' 'unsafe-inline' googletagmanager, posthog, static.cloudflareinsights; connect-src supabase, posthog, sentry, google-analytics; img-src 'self' data: blob: supabase), tighten later. Not a ranking factor, a trust/security item.

**M4. Unindexed blog post: `/blog/why-i-built-diceify` = "Discovered, currently not indexed".**
Cause: the page is in the sitemap but has only 2 internal links per post, a stale date (2024-01-24), no images, and the blog index is weak; Google does not rate it worth crawling. The other post is indexed.
Fix: link both posts from the homepage footer or a "From the blog" strip and from /dice-art; add body images; expand/refresh and update `dateModified` (only for real changes); then request indexing in GSC. Do not rely on lastmod alone.

**M5. Internal 307 (temporary) redirects for slash/.html variants.**
Evidence: `/dice-art/`, `/gallery/`, `/editor/`, `/blog/` -> 307 `/dice-art` etc.; `/index.html` -> 307 `/`; `/dice-art.html` -> 307 `/dice-art`. Correct target, but 307 is temporary, so link equity consolidation is slower. This comes from `html_handling: "auto-trailing-slash"` in wrangler.jsonc. Fix: switch to `"drop-trailing-slash"` (matches `trailingSlash:false`), which emits 301s/canonical forms. Test that /s/* still works.

**M6. `/editor` and `/account` serve the same title/description; /editor is a client-rendered shell ("Loading workspace…", 66 words).**
Search shows /editor with pos 28 and 296 impressions; Google sees almost no text. Fix: add a static server-rendered intro (h1 present already) with 100-150 words, supported formats, steps, and a `<noscript>` fallback in the editor page; keep app mounted client-side. Differentiate /account title.

**M7. Gallery is thin (67 words) while carrying 13 images; 2.6 MB weight.** Add descriptive captions/alt text with real words (dice count, size, subject) and a short intro; it ranks pos 9.3 with 0.35% CTR.

### Low
- **L1. 404 page has two robots metas** (`noindex` and `noindex, nofollow`): app/not-found.tsx sets metadata and a root default also sets one. Harmless but dedupe. 404 status code is correct (also for `/Dice-Art`, `/GALLERY`: case-sensitive, 404, fine).
- **L2. Query-string duplicates**: `/?ref=x` returns 200 with the clean canonical (no slash, see H3), so duplicates are consolidated. OK; fixing H3 makes it clean.
- **L3. No llms.txt (404)**, no AI-crawler rules in robots.txt, no Content-Signal. Optional: add public/llms.txt and explicit `User-agent: GPTBot/OAI-SearchBot/ClaudeBot/PerplexityBot Allow: /`; ChatGPT already sends ~31 sessions so default-allow is working.
- **L4. No /.well-known/security.txt** (404). Add public/.well-known/security.txt (needs `Contact`, `Expires`).
- **L5. Sitemap**: /blog and static pages have no lastmod (intentional, documented in app/sitemap.ts); `changeFrequency`/`priority` are ignored by Google (remove noise optionally). /editor is in the sitemap although it is an app shell: keep only if you want it ranked (it gets 8 clicks), else drop it.
- **L6. og:title for /blog is just "Blog"**, titles of blog posts end with "| Diceify" but home title lacks the brand suffix (fine). Titles are all unique (no duplicates except /editor == /account, see M1/M6). Blog posts are not in the og:image-per-page set (same og-card on all pages): give posts their own card.
- **L7. /dice-art link-in-text-block a11y failures** (pink links without underline); fix with `text-decoration: underline` in styles/marketing.css.
- **L8. Unused JS ~250-340 KB**: PostHog recorder/surveys 97 KB and prefetched /editor chunk on marketing pages. Lazy-load PostHog after idle or on first interaction and disable session recording/surveys in lib/analytics.ts; set `prefetch={false}` on marketing `<Link href="/editor">`. Homepage TTI 9.9 s mobile lab.
- **L9. manifest.json** is linked with `crossorigin="use-credentials"` (works, but unneeded; drop the attribute). `/manifest.webmanifest` 404 is irrelevant.

### Info
- Hreflang: only `en` + `x-default`, both self-referencing the same URL; valid for a single-language site. Adding it is harmless; no action needed (defer to seo-hreflang if expanding).
- IndexNow not implemented. Bing 58 organic sessions; a Cloudflare "Crawler Hints" toggle (free) gives IndexNow-like pings with no code.
- Playwright rendering unavailable; JS-rendering judgement is from raw HTML: marketing pages are fully server-rendered (738/1202 words in non-JS HTML, JSON-LD static); only /editor and /account depend on JS.
- Share pages `/s/<id>`: unknown ids return 404 (Worker); valid pages carry title "Shared dice art | Diceify" via the Worker. Confirm they are `noindex` or deliberately indexable (not verified here).
- Viewport meta correct (`width=device-width, initial-scale=1, viewport-fit=cover`); Lighthouse SEO 100, a11y 96-100 on all three tested pages; CLS 0-0.03.

## Score breakdown (72)
Crawlability 13/15, Indexability 12/20, Security 6/10 (no HSTS/CSP), URL structure 7/10, Mobile 9/10, CWV/perf 11/20 (caching, gallery LCP, images), JS rendering 7/10, Structured data 7/5 capped -> 5/5, IndexNow/other 2/5... (rounded to 72).

## What works
- Clean flat URLs, all pages 200 and self-canonical, real 404 status, case-sensitive 404s.
- www -> apex 301; HTTP/2 + brotli; Cloudflare edge HIT.
- robots.txt valid with Sitemap line; sitemap valid, 0 errors, real blog lastmods, static pages deliberately without fake lastmod.
- Security headers present: nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
- Server-rendered marketing HTML with rich static JSON-LD (WebApplication, Article, Breadcrumb, ImageGallery); privacy/terms canonical now fixed.
- Mobile viewport, Lighthouse SEO 100, homepage perf 95, CLS ~0, TBT <=100 ms.
- Images have alt text (0 missing on home); unique titles/descriptions on indexable pages.
