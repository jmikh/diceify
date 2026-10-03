# diceify.art — SEO Action Plan (2026-10-03)

Priority = impact on the organic decline × effort. "File" points at where the change lives in the repo. Full evidence in `findings/*.md`.

## Critical (this week) — trust and the decline
| # | Action | File / place | Effort | Why |
|---|---|---|---|---|
| C1 | Fix /terms §4.1 (no project limit), §4.4 (Creator Pass = 30 days, non-renewing), §5.1 refund wording; bump "Last updated" | `app/(marketing)/terms` | 30 min | contradicts the pricing card on a page that takes money (content H1) |
| C2 | Rewrite /privacy processors: Supabase, Stripe, GA4, PostHog incl. session replay + what is masked, Cloudflare; retention; legal entity; drop "Vercel Analytics" | `app/(marketing)/privacy` | 1 h | names a vendor not used, omits the one that records sessions (content H2) |
| C3 | Replace "built by hand" with "patterns generated with Diceify" on /gallery, /dice-art and the ImageGallery schema until a real-builds section exists; label tiles Built / Digital preview | `features/marketing/components/Gallery.tsx`, gallery page, dice-art page | 30 min | renders presented as physical builds (content H3) |
| C4 | Point every "dice art generator" text anchor at `/` (not `/editor`); use "open the editor" for /editor links | `/dice-art` content, Hero, Navbar | 15 min | the one exact-match anchor currently sends the head term to a 66-word app shell; desktop ranking is bimodal (content M5, cluster) |
| C5 | Gallery LCP: `priority={index < 4}` on the first `GalleryCard`s | `app/(marketing)/gallery/page.tsx` | 5 min | mobile LCP 6.1 s → ~2.5 s (performance #1) |
| C6 | Cache rules in `public/_headers`: `/_next/static/*` immutable 1 y; `/images/*` 30 d + stale-while-revalidate; favicons 7 d; HTML unchanged | `public/_headers` | 5 min | every repeat view revalidates ~50 requests (performance #2, technical H1) |
| C7 | Request indexing in GSC for /privacy, /terms (stale canonical mismatch) and resubmit sitemap.xml once | GSC | 5 min | clears stale warnings after the Oct 2 fix (google.md) |

## High (weeks 2–3) — entity, E-E-A-T, CTR
| # | Action | File / place | Effort |
|---|---|---|---|
| H1 | `/about` page: who built Diceify, since 2020, the Umm Kulthum build with photos + video, how the algorithm works, contact, legal entity | new route | half a day |
| H2 | Schema graph: single `@graph` with `#organization` (sameAs Instagram/TikTok/Reddit/YouTube, founder, foundingDate, alternateName, 512 px PNG logo), `#website`, Person `#john`; reference by `@id`; Person as /dice-art author; tiered Offer array from `PRICING`; remove HowTo; keep one FAQPage; fix © year | `app/layout.tsx`, `lib/seo.ts`, `components/JsonLd.tsx`, `core/billing/plans.ts` | 3 h |
| H3 | One visible "Diceify (diceify.art) is a free, browser-based dice art generator that…" sentence near the hero and in the footer; one "not related to Dicify" line in the FAQ | Hero, Footer | 30 min |
| H4 | Bing Webmaster Tools (import from GSC) + Cloudflare Crawler Hints (IndexNow); add `public/llms.txt` (body in geo.md) | BWT, Cloudflare dashboard, `public/` | 45 min |
| H0 | In-hero upload drop zone on `/` (`<input type=file>` → editor crop step) + one line "Free: preview, exact dice counts, PNG, first 5 builder rows. No sign-up."; mobile before/after thumbnail above the fold | Hero, `features/editor` hand-off | half a day |
| H5 | Gallery rebuild (also the SXO page-type fix: lead with real-build photos + the build video): data caption per tile (grid · dice count · B/W split · cm/in at 16 mm · built/preview), 150–250-word intro, Kids/Pets/Couples section from `/images/hero/`, "Real builds" section (founder, Jeremy with permission, community with credit), CTA; then retitle "Dice Art Examples: Portraits With Dice Counts \| Diceify" | gallery page + `Gallery.tsx` | 1 day |
| H6 | /dice-art: ToC + above-fold "Make your own" CTA; retitle "Dice Art: How to Make It, Dice Count & Size Chart \| Diceify" with the numeric description from content M6; underline inline links; `<caption>` on the size table; text equivalent for the 12-shade SVG; `<h3>`/`<details>` FAQ markup | dice-art page, `styles/marketing.css` | 2 h |
| H7 | Sitewide nav + footer on all marketing pages (currently only `/`) ; contextual links from both blog posts to /dice-art, /gallery and each other; link both posts from the homepage/footer | `app/(marketing)/layout.tsx`, blog posts | 2 h |
| H8 | Images: build-time 320/480/640 webp variants via sharp + `images.loader: 'custom'` + `lib/image-loader.ts` (drop `unoptimized`); fix `sizes` on dice-art grid and BlogCard; hero `<img>` gets srcSet; only the visible hero image `fetchPriority="high"` | `scripts/`, `next.config.js`, `lib/`, `DiceLens.tsx` | 2 h |
| H9 | `prefetch={false}` on `/editor` links; trim PostHog (surveys, dead clicks, web-vitals; replay only on /editor and /s/*) or init on idle; drop Cloudflare Insights beacon | marketing components, `lib/analytics.ts`, `components/Analytics.tsx` | 1 h (replay/surveys = product call) |
| H10 | `/account`: remove `Disallow` from robots, add `robots: noindex` metadata and its own title; `/editor`: 100–150-word static intro + `<noscript>`; `wrangler.jsonc` `html_handling: "drop-trailing-slash"` (307 → 301), re-test `/s/*`; HSTS header; CSP Report-Only; dedupe 404 robots metas; security.txt | `public/robots.txt`, account/editor routes, `wrangler.jsonc`, `public/_headers` | 2 h |
| H11 | Jeremy post: "a 35×47 dice grid (1,645 dice) in a 26×32-inch frame"; third-person title/byline or a first-person Q&A; add photos; VideoObject on the founder post; expand the founder post (build photo, grid, dice count, hours, resin failure) then Request Indexing | `features/marketing/blog/data.ts` | 2 h |

## Medium (month 2) — content that owns the questions
| # | Action | Effort |
|---|---|---|
| M1 | **Measure first**: weigh 100 × 16 mm and 100 × 12 mm dice, record dated bulk prices per 1,000 from 2–3 vendors, time a 50×50 build (dice/hour). This data feeds everything below; never publish an estimate as a measurement | 1 week elapsed |
| M2 | /dice-art new sections: weight (column in the size table), cost (column), framing/sealing/hanging, "what you get from Diceify" (free vs paid, SVG, say plainly there is no PDF); rename "How to make your own" → "How to make dice art (4 steps)"; grow to ~2,200–2,800 words | 1 day |
| M3 | `/best-dice-art-generators`: honest, dated, bylined comparison with method (same photo, same grid, every tool), feature table (Diceify, diceartgenerator.io/.com, DiceArt.me, DiceMosaic, Dice Art Studio), same output image from each; concede the PDF gap; ask diceartgenerator.io to correct the privacy/project-info claims | 1 day |
| M4 | Spokes under `/dice-art/<slug>` (new route): size calculator, buying dice, how to glue, best photos; then the 50×50 build log under `/blog/` | 1–2 pages / month |
| M5 | Homepage: trim FAQ to product questions (free vs paid, exports, photo tips, accounts) linking /dice-art for the rest; merge fragment H2s; "Pricing: free, $19 Creator Pass or Studio from $3/month"; tie "5,000+ creators" to a real dated count; shorter description (142 chars in content M6); "Free" cue by the CTA; compact before/after thumbnail on mobile | 2 h |
| M6 | Wikidata item for Diceify (web application, official site, founder, social IDs) | 1 h |
| M7 | Sitemap: real hand-maintained `lastModified` per static page (never build date), drop changefreq/priority, slash form for `/`; per-post og:image; og:title for /blog | 30 min |
| M8 | Blog cadence: 1–2 first-hand posts a month (weighed 1,000 dice; what a 50×50 costs; black-only vs both; gift guide; monthly r/DicePortraits spotlight with permission) | ongoing |

## Low (backlog)
- Templates page (public-domain patterns that open in the editor) and PDF export: product decisions, flagged by the content, GEO and cluster agents; the comparison page should state the current answer either way.
- Framing & hanging, famous dice art, settings explained spokes (cluster S5, S8, S9).
- AVIF trial on one photo; modern `browserslist`; `<link rel="preconnect">` for PostHog only if it stays eager.
- Content-Signal / training opt-outs in robots.txt (business decision; default-allow is working); WebMCP tool (defer until the spec is stable).
- Gallery IP hygiene: prefer public-domain subjects and user builds; drop © Diceify on derivatives of third-party works. Spell "Umm Kulthum" consistently. Verify the `@diceify` X handle.
- Link building: Product Hunt, AlternativeTo/SaaSHub, maker subreddits, BoardGameGeek, STEM-teacher resources, creator reviews, Dice Art Studio cross-link, "Made with Diceify" link on shared cards.

## Monitoring
- GSC weekly: clicks and position for "dice art generator" by device (desktop bimodality), CTR of /dice-art and /gallery after retitling, indexation of the founder post and the new spokes.
- Re-run Lighthouse on /gallery mobile after C5/H8 (target LCP < 2.5 s); check `curl -I` for the new cache headers and 301s.
- Bing Webmaster: index coverage and Copilot citations once verified. GA4: sessions from chatgpt.com / copilot / perplexity by landing page.
- Next core update: compare the weekly series against the May 21 2026 baseline in `findings/google.md`.
