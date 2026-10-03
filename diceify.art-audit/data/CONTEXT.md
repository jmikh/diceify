# Shared context for the diceify.art audit (gathered 2026-10-03 by the orchestrator)

Site: https://diceify.art — a free photo→dice-art generator (web app, SaaS with a free tier + paid plans). Static Next.js 14 export served by a Cloudflare Worker; marketing pages are static HTML, /editor and /account are client-rendered React apps. Business type: SaaS / online tool (B2C hobby-craft niche). Not local, not e-commerce. English only (hreflang en + x-default).
Repo: /Users/johnmikhail/Projects/diceify (see CLAUDE.md there; lib/seo.ts holds page metadata; components/JsonLd renders static JSON-LD; public/robots.txt, app/sitemap.ts).
Tooling note: the claude-seo runtime is installed WITHOUT Chromium (download blocked). `render_page.py` with Playwright will fail — use `--mode static` / curl / the saved HTML below. Lighthouse 12 JSON reports (headless Chrome) are in data/*.json; final screenshots in screenshots/.

## Pages (all 200, all `index,follow`, self-canonical, og/twitter tags, og:image = /images/og-card.jpg 1200x630 227 KB on every page)
Saved raw HTML: data/raw/{index,dice-art,gallery,blog,editor,privacy,terms}.html, data/raw/blog_*.out, data/raw/this-page-does-not-exist.out (404), data/raw/account.out
| URL | title | words (non-JS text) | h1 | JSON-LD |
| / | Diceify — Free Dice Art Generator for Portraits & Mosaics | 738 | Turn loved ones into dice art | WebSite+Organization, WebApplication(Offer $0), FAQPage(6 Q), ImageGallery |
| /dice-art | Dice Art — The Complete Guide to Dice Portraits & Mosaics \| Diceify | 1202 | Dice Art: Everything You Need to Know | WebSite, Article, FAQPage(10 Q), HowTo, BreadcrumbList |
| /gallery | Dice Art Gallery \| Portraits & Abstract Mosaics \| Diceify | 67 (thin) | Dice Art Gallery | WebSite, ImageGallery(13 ImageObject), BreadcrumbList |
| /blog | Blog \| Diceify (og:title just "Blog") | 118 | The Diceify Blog | WebSite only |
| /blog/why-i-built-diceify | Why I Built Diceify \| Diceify | 495 | — | Article(Person John Mikhail, 2024-01-24), Breadcrumb |
| /blog/jeremy-dice-portraits-nieces | How I Made Dice Portraits for My Nieces \| Diceify | 487 | — | Article(Person Jeremy Klammer, 2023-11-21), Breadcrumb |
| /editor | Dice Art Builder — Upload, Crop, Tune & Build \| Diceify | 66 ("Loading workspace…") | Diceify dice art editor | WebSite, WebApplication |
| /account | SAME title+description as /editor, `index,follow`, 200 | — | — | robots.txt Disallow: /account |
| /privacy, /terms | ok, 627 / 1100 words | | | WebSite only |
| /llms.txt | 404 | | | |
| /s/<id> (share pages, Worker) | 404 for unknown ids | | | |
Homepage: 47 imgs, 0 missing alt (2 decorative empty alt), 44 lazy, only 2 with width/height, NO srcset anywhere, hero imgs fetchPriority=high. Internal links: 11 unique. External: instagram.com/diceify.art, tiktok.com/@diceify.art. Organization schema has NO sameAs. Homepage canonical is `https://diceify.art` (no trailing slash) while Google's canonical is `https://diceify.art/`.
Blog posts have 0 images in the article body, 2 internal links each (/blog, /editor). Only 2 posts, dated 2023-11 and 2024-01, no new content since.
/dice-art: 7 imgs, no width/height; "link-in-text-block" a11y failures (pink links without underline).
404 page: real 404 status, title "404 - Page Not Found | Diceify", TWO robots metas (`noindex` and `noindex, nofollow`).

## robots.txt
```
User-Agent: *
Allow: /
Disallow: /account
Sitemap: https://diceify.art/sitemap.xml
```
No AI-crawler rules (all allowed). No Content-Signal. No llms.txt. No /.well-known discovery files checked yet.

## sitemap.xml (7 URLs): /, /dice-art, /gallery, /editor, /blog (no lastmod), 2 blog posts (lastmod 2024-01-24, 2023-11-21). Homepage loc `https://diceify.art` without trailing slash. GSC: sitemap last submitted 2026-03-10, last downloaded 2026-09-28, 29 warnings, 0 errors, "8 submitted / 0 indexed" counter (stale).

## HTTP headers (homepage)
HTTP/2, brotli (HTML 105 KB → 14.6 KB), server cloudflare, cf-cache-status HIT. Present: x-content-type-options nosniff, x-frame-options DENY, referrer-policy strict-origin-when-cross-origin, permissions-policy. MISSING: Strict-Transport-Security, Content-Security-Policy. `cache-control: public, max-age=0, must-revalidate` on EVERYTHING including hashed /_next/static/*.js and all images (no immutable/long TTL). www→apex 301 works. http→https could not be tested (ISP middlebox intercepted).

## Images: all gallery/landing images are ~140–175 KB webp each, served at one size (no srcset). Lighthouse "uses-responsive-images" waste: home 1.2 MB desktop / 980 KB mobile, gallery 1.7 MB / 1.4 MB. Total page weight: home 2.1–2.3 MB, gallery 2.6 MB, dice-art 1.0–1.1 MB. Gallery LCP element is a lazy-loaded img (Mona Lisa) → LCP 6.1 s mobile.

## Lighthouse 12 (lab, headless, this machine; console "errors" are only blocked tracker requests in the sandbox)
| page | perf mobile | perf desktop | LCP m/d | CLS | TBT m | TTI m | a11y | BP | SEO |
| / | 95 | 95 | 2.4 s / 1.2 s | 0 / 0.03 | 100 ms | 9.9 s | 100 | 96 | 100 |
| /dice-art | 92 | 99 | 3.0 / 0.8 | 0 | 60 | 6.8 | 96 | 96 | 100 |
| /gallery | 75 | 95 | 6.1 / 1.4 | 0 | 60 | 7.7 | 100 | 96 | 100 |
Unused JS ~250–340 KB per page (Next chunks + PostHog recorder/surveys 97 KB; the /editor page chunk is prefetched on marketing pages). Third parties: PostHog 116 KB, GA4 gtag, Cloudflare Insights beacon.

## Google Search Console (sc-domain:diceify.art)
Indexing: 8 of 9 key URLs indexed. `/blog/why-i-built-diceify` = "Discovered – currently not indexed". /privacy and /terms show CANONICAL MISMATCH (Google selected self, page declared `/`) — from crawls on Sep 6/21 before the Oct 2 fix; the live pages are now self-canonical. Last crawls Aug 18 – Sep 25. Rich results detected: Breadcrumbs, Image Metadata only (no FAQ/HowTo rich results — Google retired FAQ rich results 2026-05-07).
28 days (Sep 5–Oct 3) vs previous 28: clicks 219 (−24%), impressions 3,705 (−13%), CTR 5.9%, avg position 7.2 (was 12.5).
90 days by page: / 942 clicks/12,388 impr (7.6%, pos 6.5); /dice-art 49/6,407 (0.76%, pos 7.2); /gallery 20/5,727 (0.35%, pos 9.3); /editor 8/296 (pos 28); /blog 0/4,794 (pos 4.4); /#pricing 1/4,697; /#faq 0/3,689 — the /blog, /#pricing, /#faq rows are SITELINKS under the homepage result (same position ~4.4), not independent rankings; treat their "0 CTR" accordingly.
Top queries 90d (mobile/desktop): "dice art generator" m 87 clicks pos 3.0 / d 12 clicks pos 17.4; "dice art" m 59 clicks 1,140 impr pos 4.4 / d 21 clicks 610 impr pos 7.5; "dice portrait" m pos 3.4; "dice mosaic generator" m 3.8 / d 4.9; "photo to dice art" pos 2.9; brand "diceify"/"dicefy" pos 1. Desktop "dice art generator" is bimodal day to day: ~3 on some days, 20–46 on others (a different page/weak ranking surfaces some days).
Monthly trend (clicks / impressions / impression-weighted position):
mobile: Jan 2,764/33,393/6.0 (viral spike) · Feb 1,081/8,571/5.0 · Mar 913/7,657/4.9 · Apr 843/7,912/4.4 · May 1,260/8,845/4.0 · Jun 418/4,168/4.6 · Jul 380/3,791/4.7 · Aug 290/3,091/4.8 · Sep 195/2,552/5.4
desktop: Feb 289/2,489/6.4 · Mar 219/2,807/7.3 · Apr 142/2,810/7.3 · May 167/3,237/9.0 · Jun 97/2,430/10.7 · Jul 92/2,304/13.0 · Aug 56/1,984/22.3 · Sep 47/1,485/11.6
Weekly around the May 21 2026 Core Update: w/o May 18: 316 clicks/2,421 impr/pos 5.6 → w/o May 25: 156/1,859/6.9 → June weeks 118–158 → late June 69. Clicks halved the week of the core update and never recovered (correlation only; a hypothesis).
Other Google updates in window: FAQ rich results retired (May 7), June 24 / Aug 18 / Sep 24 Spam Updates.

## GA4 (property 367429523) organic sessions by month: Jan 4,124 · Feb 1,986 · Mar 1,496 · Apr 1,332 · May 1,886 · Jun 838 · Jul 712 · Aug 492 · Sep 343 (−82% May→Sep). Jul 5–Oct 2: Organic 1,468 sessions (engagement 70%), Direct 444, Unassigned 425, Referral 83, AI Assistant channel 31 (chatgpt.com 31 sessions, copilot 1, gemini 1), Bing 58, Yahoo 21, DuckDuckGo 10. Organic landing pages: / 1,031 (eng. 64–68%), /editor 297, /dice-art 78 (eng. 46% mobile), /gallery 39 (43% mobile). Spring paid "Cross-network" campaign (5,344 sessions Apr–Jul) is now off (12).

## Known competitor / AI-search context (from a 2026-10-02 vetting): main competitor diceartgenerator.io (FAQ/HowTo schema, buying guide, templates, a "best dice art generators" page rating itself 5/5 and Diceify 3/5: "no PDF export, limited customization, no project information"). Dice Art Studio (itch.io) is quoted by AI answers for dice-count numbers. Brand confusion with "Dicify" (a TF.js book project). ChatGPT referrals land ~93% on `/`. Unowned questions: die size, finished size / dice per sq ft, weight, glue/mounting, bulk dice cost.
