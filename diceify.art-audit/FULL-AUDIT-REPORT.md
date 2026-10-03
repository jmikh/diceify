# diceify.art — Full SEO Audit (2026-10-03)

**SEO Health Score: 65 / 100**  ·  Business type: SaaS / free online craft tool (photo → dice-art generator, B2C, English, no local footprint)  ·  Property: `sc-domain:diceify.art`  ·  GA4 property 367429523

| Category | Weight | Score | Driver |
|---|---|---|---|
| Technical SEO | 22% | 72 | no caching on hashed assets, 307 redirects, /account indexable, no HSTS/CSP |
| Content Quality | 23% | 54 | Terms/Privacy contradictions, renders labelled "built by hand", no About/author, thin gallery, stale blog |
| On-Page SEO | 20% | 62 | no nav/footer on subpages, weak titles on the two low-CTR pages, "generator" anchor points at /editor |
| Schema | 10% | 72 | valid but no `@id` graph, no `sameAs`, price-0 Offer vs paid plans, deprecated HowTo/FAQ |
| Performance (CWV, lab only) | 10% | 78 | gallery LCP 6.1 s mobile (lazy LCP image), 1–1.9 MB image waste per page |
| AI Search Readiness | 10% | 62 | GEO 63 / agentic 60: competitor defines the brand (3/5), no entity signals, no Bing/IndexNow |
| Images | 5% | 55 | alt text complete, webp everywhere, but one 600 px size for every slot, no srcset |

Scope: 9 indexable URLs crawled (the whole site), robots/sitemap/headers, 6 Lighthouse 12 runs (home, /dice-art, /gallery × mobile/desktop), Search Console (indexation of all 9 URLs, 16 months of query data), GA4 (12 months). Limits: no CrUX field data (PageSpeed quota exhausted), no Playwright rendering (Chromium download blocked; screenshots are Lighthouse captures), backlink data is estimate-only (Common Crawl timed out, no Moz/Bing key), SERP checks used a non-Google search tool. Per-category detail with evidence and fixes: `findings/*.md`.

---

## Executive summary

**The site is technically sound and ranks well on mobile, but organic traffic has fallen about 80% since May 2026 and the content layer is not holding up its end.** GA4 organic sessions went 1,886 (May) → 838 (Jun) → 712 → 492 → 343 (Sep). Clicks halved the week of the **May 21 2026 Core Update** and never recovered; the FAQ-rich-result retirement (May 7) also removed the expanded snippet the homepage FAQ used to earn. Correlation, not proof, but the pattern matches a quality/E-E-A-T re-evaluation: a 2-post blog last updated January 2024, a 57-word gallery, a guide authored by "Diceify" with no human behind it, Terms that contradict the pricing, a Privacy Policy that names the wrong analytics vendor, and gallery copy calling digital renders "built by hand". Mobile still ranks 3–4 for "dice art generator"; desktop swings between position 3 and 20–46 day to day, and desktop CTR fell from ~8% to ~3%. Two exact-match competitors (diceartgenerator.io / .com) were registered on 22–23 January 2026, days after Diceify's viral spike, with an upload box in the hero and a comparison page rating Diceify 3/5; the desktop slide began about three months later.

The October 2 fixes (canonicals, titles, static JSON-LD, og images) are live and correct; Google has not recrawled /privacy and /terms yet, so GSC still shows a canonical mismatch there.

### Top 5 critical issues
1. **Trust contradictions on money pages.** /terms §4.4 says the Creator Pass grants "permanent access … for the lifetime of the Service"; the pricing card and `core/billing/plans.ts` say 30 days. §4.1 limits free-tier projects; the site says unlimited. /privacy names "Vercel Analytics" (not used), omits PostHog session replay, Cloudflare and Supabase, dated Jan 2025. (content.md H1, H2)
2. **Organic decline since May with an unstable desktop ranking**, new exact-match tool competitors since January, and no page that can take the hit: /dice-art and /gallery get 12k impressions for 69 clicks (0.35–0.76% CTR); the homepage has no upload box while the competitors' heroes do. (google.md, sxo.md)
3. **No visible person or entity.** No About page, no author bio, Article author = Organization, Organization schema has no `sameAs`/`founder`, no Wikidata item; the only third-party description of Diceify is a competitor rating it 3/5 with partly false claims. (content.md H4, geo.md GEO-1/2, schema.md)
4. **Gallery is thin and slow**: 57 words, 0.35% CTR at position 9, LCP 6.1 s on mobile because the LCP image is lazy-loaded and 13 × 150 KB images are served at one size. (content H5, performance #1, images)
5. **"Built by hand" claims sit on digital renders**; the only photo of a real build is a blog thumbnail. For a craft niche this is the strongest Experience signal the site could have, and it is absent. (content.md H3)

### Top 5 quick wins (each under an hour)
1. `priority` on the first four gallery cards → gallery mobile LCP ~6.1 s → ~2.5 s (performance #1).
2. Cache rules in `public/_headers`: immutable for `/_next/static/*`, 30 days for `/images/*` (performance #2).
3. Fix Terms §4.1/4.4/5.1 and the Privacy processor list; bump both "Last updated" dates (content H1/H2).
4. Organization `sameAs` + `founder` + visible "Diceify is…" sentence; point every "dice art generator" anchor at `/` not `/editor` (schema, geo GEO-2, content M5).
5. Verify in Bing Webmaster Tools (import from GSC) and turn on Cloudflare Crawler Hints for IndexNow (geo GEO-3); `prefetch={false}` on /editor links and `wrangler.jsonc` `html_handling: "drop-trailing-slash"` to turn 307s into 301s (technical M5).

---

## 1. Technical SEO (72)
**Works:** flat self-canonical URLs, real 404s (also for case variants), www→apex 301, HTTP/2 + brotli (105 KB HTML → 14.6 KB), TTFB 60–160 ms, four security headers, static server-rendered JSON-LD, Lighthouse SEO 100 on every page, valid robots.txt and sitemap, hreflang en + x-default correct for one language.

| Sev | Finding | Fix |
|---|---|---|
| High | `cache-control: public, max-age=0, must-revalidate` on everything incl. hashed `/_next/static/*` and all images; every repeat view revalidates ~50 requests | add cache blocks to `public/_headers` (immutable 1 y for `_next/static`, 30 d + stale-while-revalidate for `/images/*`) |
| High | Gallery LCP 6.1 s mobile: LCP image `loading="lazy"`, no srcset | see Performance |
| High | Homepage canonical/og:url/hreflang/sitemap use `https://diceify.art`, Google's canonical is `https://diceify.art/` | emit the slash form for the home path only in `lib/seo.ts` + `app/sitemap.ts`; cosmetic but removes the split |
| Medium | `/account` is 200 + `index,follow` with /editor's exact title/description while `robots.txt` disallows it (so a noindex can never be seen) | drop the Disallow, set `robots: noindex` in the account route metadata, give it its own title |
| Medium | No HSTS, no CSP | `Strict-Transport-Security: max-age=31536000; includeSubDomains`; start CSP as Report-Only |
| Medium | `/dice-art/`, `/gallery/`, `/index.html`, `/dice-art.html` → **307** (temporary) redirects, from `html_handling: "auto-trailing-slash"` | `"drop-trailing-slash"` in `wrangler.jsonc` (matches `trailingSlash:false`); re-test `/s/*` |
| Medium | `/blog/why-i-built-diceify` "Discovered – currently not indexed" since 2024 | content + internal links (see Content), then Request Indexing |
| Medium | /editor is a client-rendered shell (66 words, "Loading workspace…"), pos 28, same title as /account | add a 100–150-word static intro + `<noscript>` in the editor page |
| Low | 404 page has two robots metas; `/.well-known/security.txt` 404; `manifest.json` linked `crossorigin="use-credentials"`; no IndexNow | dedupe; add security.txt; Cloudflare Crawler Hints |
| Info | http→https could not be tested (ISP middlebox); share pages `/s/<id>` indexability not verified | check in Cloudflare ("Always Use HTTPS" was enabled 2026-10-02) |

## 2. Content Quality (54) and E-E-A-T (48)
**Works:** /dice-art is a genuinely good guide (answer-first, Flesch ~81, correct size math: 363 dice/ft² at 16 mm, 645 at 12 mm; both glue methods with a real failure story; honest "Last updated" that matches `dateModified`), two real first-hand stories with specifics, no filler or AI-pattern phrasing, unique non-templated metadata, a concrete worked example on the homepage (87×77 · 4,564 black · 2,135 white).

| Sev | Finding | Fix |
|---|---|---|
| High | Terms contradict pricing (Creator Pass "permanent" vs 30 days; Explorer project limit vs "unlimited") | rewrite §4.1, §4.4, §5.1 to match `plans.ts` |
| High | Privacy Policy out of date (Vercel Analytics named; PostHog session replay, Cloudflare, Supabase omitted; Jan 2025) | list real processors, replay masking, retention, legal entity |
| High | Gallery, /dice-art and ImageGallery schema say "built by hand"; the images are digital renders; no real build photos in main content | correct copy; add a "Real builds" section (founder's Umm Kulthum build, Jeremy's portraits with permission, community builds); label tiles Built / Digital preview |
| High | No About page, no author bio, guide author = Organization, no founder/sameAs | `/about` page, Person schema for John Mikhail, make him the /dice-art author |
| High | /gallery: 57 words, name-only captions, description promises "loved ones" that are not there | data caption per tile (grid, dice count, B/W split, size, built/preview), 150–250-word intro, Kids/Pets/Couples section |
| High | Blog: 2 posts (2023-11, 2024-01), no dates on cards, "tutorials" promised but none, founder post unindexed, no body images, YouTube embed without VideoObject | 1–2 first-hand posts/month, dates, media, VideoObject |
| High | Unanswered questions AI engines take elsewhere: weight, bulk dice cost, framing/hanging, what exports you get (PDF gap), templates, comparison | new /dice-art sections with **measured** first-party numbers; templates and comparison pages (see Content architecture) |
| Medium | Jeremy post: "35 × 47 inches" is the dice grid (1,645 dice), the frame is 26×32 in; byline/schema credit Jeremy for a third-person rewrite | fix the sentence; "Diceify team, based on Jeremy Klammer's post", or get a first-person Q&A |
| Medium | Build-time figures disagree (home "a day or two", /dice-art "a full day", Jeremy "100+ hours") | one source of truth; publish a measured dice/hour rate |
| Medium | 7 of 8 non-home pages have no nav or footer (`app/(marketing)/layout.tsx` on purpose): Privacy/Terms/Contact reachable only from `/`; posts carry 2 internal links | move Footer (+ compact nav) into the marketing layout; contextual links in posts |
| Medium | The only exact "dice art generator" anchor points to **/editor**; homepage FAQ duplicates 5 of 6 /dice-art questions | all "generator" anchors → `/`; cut homepage FAQ to product questions |
| Medium | Weak titles/descriptions on the two low-CTR pages; homepage description 172 chars truncated | /dice-art: "Dice Art: How to Make It, Dice Count & Size Chart \| Diceify"; /gallery: "Dice Art Examples: Portraits With Dice Counts \| Diceify" (after captions ship); full table in content.md M6 |
| Medium | Stale years (footer © 2025, schema © 2024), "Join 5,000+ creators" unsubstantiated | build-time year; tie the count to real data or soften |
| Low | Fragment H2s ("6 faces." / "2 colors."), og:title "Blog", posts reuse generic og-card, "Um/Umm Kulthum" spelling, gallery claims © Diceify on Pikachu/Afghan Girl/Kobe/Salah derivatives, `twitter:creator @diceify` vs `@diceify.art` | content.md L1–L7 |

## 3. On-Page SEO (62)
**Works:** unique keyword-led titles ≤60 chars on almost every page, one H1 per page, question-form H2s on /dice-art, breadcrumbs, complete alt text, a "Further reading" block on /dice-art.
**Holds it down:** no sitewide nav/footer, 2-link blog posts, mis-pointed "generator" anchor, FAQ overlap, truncated/generic descriptions where CTR is lowest, the /editor–/account duplicate.

## 4. Schema & structured data (72)
Validation: 0 errors, ~10 warnings; every block is static server-rendered JSON-LD; BreadcrumbList correct on 4 pages; ImageObject license fields complete (GSC detects Breadcrumbs + Image Metadata rich results).

| Sev | Finding | Fix |
|---|---|---|
| High | Organization only nested in WebSite `publisher`, re-declared inconsistently in Article/WebApplication/ImageGallery, no `@id` graph | one `@graph` in `app/layout.tsx`: `#organization`, `#website`, Person `#john`; reference by `@id` |
| High | No `sameAs` (Instagram, TikTok, Reddit r/DicePortraits, YouTube exist) | add `sameAs`, `founder`, `foundingDate`, `alternateName: ["Diceify.art"]` |
| High | Logo is favicon-192 on most pages, `logo-full.svg` in blog Articles (Google does not support SVG logos) | one 512 px PNG everywhere |
| Medium | WebApplication Offer is price 0 only; plans are Creator $19 / Studio $9 mo / $36 yr; a second WebApplication ("Diceify Builder") on /editor duplicates it; no aggregateRating (do not fabricate) | tiered Offer array built from `PRICING` in `core/billing/plans.ts`; merge via `@id` |
| Medium | Blog Articles have no `image`, `dateModified` = `datePublished`; /dice-art author is Organization; Person John Mikhail has no `url` | add images, real dateModified, Person author with `/about` |
| Medium | HowTo on /dice-art is deprecated for rich results; FAQPage on / and /dice-art has had no SERP value since May 2026 and the two pages answer "What is dice art?" differently | remove HowTo; keep one FAQPage (on /dice-art) with aligned answers; keep the visible Q/A for AI parsing |
| Low | 404 and share pages carry WebSite schema from the root layout; `copyrightNotice © 2024` | move WebSite to the homepage; fix year |

## 5. Performance (78, lab only)
| Page | Perf m/d | LCP m/d | CLS | TBT m | TTI m |
|---|---|---|---|---|---|
| / | 95 / 95 | 2.4 s / 1.2 s | 0 / 0.03 | 100 ms | 9.9 s |
| /dice-art | 92 / 99 | 3.0 / 0.8 | 0 | 60 | 6.8 |
| /gallery | 75 / 95 | **6.1** / 1.4 | 0 | 60 | 7.7 |

No CrUX field data was obtainable; treat these as lab. Console "errors" in the reports are only the sandbox blocking GTM and Cloudflare Insights.

| Sev | Finding | Fix |
|---|---|---|
| High | Gallery LCP element is a lazy `next/image fill` card (load delay 1.6 s + load time 3.4 s) | `priority={index < 4}` in `GalleryCard` (`app/(marketing)/gallery/page.tsx`) |
| High | No long-lived caching (see Technical); Lighthouse understates it because it skips max-age=0 entries | `public/_headers` cache rules |
| High | Image bytes: 1.4–2.0 MB of images per page, `images.unoptimized: true` → no srcset; 600×600 files for 174–280 px slots | build-time 320/480/640 webp variants (sharp is already a devDependency) + `loader: 'custom'` so `next/image` emits srcset in the static export; or Cloudflare Image Transformations |
| Medium | JS: 530–660 KB per page, 250–340 KB unused; /editor chunk (33 KB+) prefetched on every marketing page via `next/link`; PostHog 119 KB of which 97 KB optional (recorder, surveys, dead clicks, web-vitals) | `prefetch={false}` on /editor links; trim PostHog modules / init on idle (replay and surveys are product decisions); preconnect `us-assets.i.posthog.com` only if PostHog stays eager |
| Medium | Text-page LCP is 57% render delay; both hero images are `fetchpriority="high"` (217 KB) and compete with CSS/fonts | high priority on the visible dice image only; lazy for the hidden "reveal" photo |
| Low | Legacy JS 49 KB (mostly PostHog + Next polyfills); Cloudflare Insights beacon redundant with GA4 + PostHog | optional browserslist; disable Insights in the dashboard |

## 6. Images (55)
Alt text complete (decorative `alt=""`), webp everywhere, hero images have width/height and no CLS. Everything else is delivery: one size per image, no srcset, 1.0–1.9 MB waste per page; the gallery LCP image is lazy; `fill` images on /dice-art and /gallery have no width/height (safe today because wrappers are fixed-ratio). Full fix recipe (variants script, `lib/image-loader.ts`, `sizes` corrections) in images.md.

## 7. AI Search Readiness (62)
GEO 63 (citability 68, structure 75, multi-modal 50, authority 35, technical 82; platform estimates: Google AIO 66, ChatGPT 55, Perplexity 50, Bing Copilot 45). Agentic 60.
**Works:** every AI user agent tested (17) gets 200 with identical bytes; robots allows all; /dice-art opens each section with a quotable number and AI answers already quote it verbatim; ChatGPT sends referrals (31 sessions / 90 d, 93% to `/`).

| Sev | Finding | Fix |
|---|---|---|
| High | diceartgenerator.io's "best dice art generators" page is the only comparison on the web and rates Diceify 3/5 with partly false claims ("no project information", "limited customization", "privacy: upload"); the true gap is no PDF export | publish an honest, dated, bylined `/best-dice-art-generators` with a stated method and a feature table; concede the PDF gap; ask the competitor to correct the factual errors |
| High | Weak entity: no `sameAs`, no Wikidata, no visible "Diceify is…" sentence, confusion with "Dicify" (TF.js book project) | one definitional sentence near the hero + footer + llms.txt; schema `sameAs`/`founder`; Wikidata item; one disambiguation line |
| High | No Bing Webmaster verification artifact, no IndexNow; ChatGPT and Copilot depend on Bing's index; desktop (Bing's main surface) is where rankings are weakest | verify BWT via GSC import; Cloudflare Crawler Hints (IndexNow) |
| Med-High | No owned numbers for weight, cost, dice/hour; Dice Art Studio gets quoted instead | measure (weigh 100 dice, dated bulk prices) and publish; gallery captions with dice counts |
| Medium | Freshness/authorship (2 posts, Organization author, `dateModified` = `datePublished`); homepage FAQ questions are `<button>`s so extractors pull zero answers, and its answers differ from /dice-art | Person author; `<h3>` or `<details>` FAQ markup; one source of truth |
| Medium (agentic) | /editor empty without JS; AI access policy undeclared (no named groups, no Content-Signal); no aria-live for save/build status | static intro; decide the policy deliberately (default-allow is working); `role=status` |
| Low | llms.txt 404 (proposed body in geo.md), no Markdown delivery, no `.well-known` files, no WebMCP (not worth building yet) | add `public/llms.txt`; defer the rest |

## 8. Search experience (SXO)
SXO Gap Scores (per page, not the health score): `/` 65, `/dice-art` 68, `/gallery` **37**, `/editor` 44. Google's own SERP could not be fetched (error page); page types come from Brave's live SERP plus Google Autocomplete, so treat the mix percentages as directional.

| Sev | Finding | Fix |
|---|---|---|
| High | **/gallery is the wrong page type for its demand.** For "dice art" it sits at position 6 with 899 impressions and 0 clicks, the signature of Google's image block (image clicks that stay in Google Images don't count). Autocomplete: "dice art ideas / images"; every SERP carries Video and Reddit modules led by real builds (r/DIY "13,000 dice" 52K votes, "Making a Mural with Only Dice" 1.55M views). The gallery offers 57 words and 13 flat renders | rebuild as "Dice art ideas & real builds": lead with photos of physical pieces + the existing YouTube build video (VideoObject), group by idea (Kids, Couples, Pets, Icons, Abstract), caption with grid/dice/size/hours, "Make one like this" links, eager-load the first row |
| Medium (High on desktop) | **The homepage is a landing page; generator SERPs are 90–100% tools.** Two exact-match competitors, diceartgenerator.io and .com, were registered 22–23 Jan 2026 (right after Diceify's viral January) and put a drag-and-drop `<input type=file>` in the hero with "100% Free · No sign-up · 2,500 dice · 50×50 · 60 cm". Diceify's `/` has 0 file inputs; the tool is a click away on a client-rendered /editor. Desktop "dice art generator" slid from 3.1 (Apr) to ~21 (Aug/Sep), about 3 months after those domains launched | in-hero upload drop zone handing off to the editor's crop step + one line stating what is free; mobile before/after thumbnail above the fold |
| Medium | **Three URLs compete for the same intents**, which explains the bimodal desktop ranking: `/`, `/gallery` and `/dice-art` all surface for "dice art"; `/gallery` gets 236 impressions for "dice art generator"; the homepage FAQ repeats 5 of 6 /dice-art questions, and Brave shows `/` (FAQ snippet) rather than the guide for "how to make dice art" | de-duplicate: homepage FAQ = tool/plan questions only; definitional questions only on /dice-art; "dice art generator" anchors → `/` |
| Medium | **/dice-art matches "how to" intent but not its format**: the SERP has 7 videos and 4 Reddit threads; the guide's first viewport has no image, CTA, ToC or video, and shows renders only | two-sentence answer under the H1, ToC, "Make your own (free)" button, the Umm Kulthum build video with VideoObject, process photos, a "what to buy" block, a named author |
| Deprioritise | "dice painting" (re-inking RPG dice; 0.4% CTR drags the average but not rankings), "dice art kit" (Shopping module: Michaels, Amazon, Etsy, PicDice), "picture dice" (stock photos), "art dice" (prompt-dice products, 60% of the fractured "dice art" SERP) | no pages; at most a "what you need to buy" block on /dice-art |
| Low | Gallery ImageObjects claim © Diceify on renders of third-party photos (Afghan Girl) and athletes | replace with own/user builds |

Persona fit (Relevance/Clarity/Trust/Action, /100): gift maker `/` 74 · tool comparer `/` 60 · inspiration browser `/gallery` 47 · teacher 42–45 · kit buyer ≤41. Desktop-vs-mobile hypotheses, ranked: new EMD tool competitors on desktop; TikTok-driven brand recognition on mobile (21% CTR at position 3); URL rotation from cannibalisation. Not verified against Google's live SERP; validation queries are in sxo.md.

## 9. Content architecture (cluster.md)
Demand is mostly tool intent and `/` already wins it; **do not create new pages for "generator" queries**. Three hubs: `/` (tool), `/dice-art` (informational pillar, grow to ~2,200–2,800 words with a ToC), `/gallery` (inspiration, 300–500 words with data captions). Nine new spokes, first six now: size calculator (dice per ft², all 5 aspect ratios, measured weight), buying dice (sizes, bulk sources, dated cost table, "is a kit worth it?"), how to glue dice art, best dice art generators compared, best photos for dice art, a measured 50×50 build log (do this first; the other pages cite it). Later: framing & hanging, famous dice art, settings explained. Don't chase: "dice art kit" (shopping), "dice painting" (re-inking RPG dice), "picture dice" (stock photos), "dice template pdf" (paper dice), "art dice", "dicify". 66-link internal matrix and cannibalization check (0 conflicts) in cluster.md. PDF export and templates are product decisions, flagged not scoped.

## 10. Authority & backlinks (estimate only)
Common Crawl timed out and no Moz/Bing key exists, so no measured numbers. Observed: the competitor's roundup mentions "Diceify.art" without a link; domain is ≥3 years old (Wayback 2023-06); referral traffic 83 sessions / quarter. Estimates (low confidence): 10–40 referring domains, DA/DR ~10–25; rankings are relevance- and brand-driven, not link-driven, so the competitor can overtake on content alone. Opportunities: `sameAs` profiles, Product Hunt + AlternativeTo/SaaSHub, maker/craft subreddits with real build photos, BoardGameGeek and bulk-dice sellers, STEM-teacher resources (pixelation lesson), creator reviews for free premium, a cross-link with Dice Art Studio, a visible "Made with Diceify" link on shared cards. Skip Wikipedia (policy).

## 11. Google data (google.md)
8 of 9 URLs indexed; founder post never crawled; /privacy and /terms canonical mismatch is stale (fixed Oct 2, awaiting recrawl; request indexing). Sitemap: last submitted March 2026, 29 historical warnings, stale "8 submitted / 0 indexed" counter → resubmit once. Sitelink rows (`/blog`, `/#pricing`, `/#faq`) inflate GSC impressions at 0 CTR and should be excluded from quick-win analysis. Brand queries rank #1 with 61–78% CTR. Bing 58 / DuckDuckGo 10 / ChatGPT 31 sessions per quarter.

Monthly GSC (clicks / impressions / position): mobile Jan 2,764/33k/6.0 (viral) → May 1,260/8.8k/4.0 → Sep 195/2.6k/5.4; desktop May 167/3.2k/9.0 → Aug 56/2.0k/22.3 → Sep 47/1.5k/11.6. Google updates in the window: FAQ rich results retired (May 7), **May 2026 Core Update (May 21)**, Spam Updates Jun 24 / Aug 18 / Sep 24.

---
Artifacts: `findings/` (technical, content, schema, performance, images, geo, agentic, sxo, sitemap, cluster, backlinks, visual, google), `screenshots/` (6 Lighthouse captures), `data/` (raw HTML, Lighthouse JSON, CONTEXT.md), `audit-data.json`, `ACTION-PLAN.md`.
