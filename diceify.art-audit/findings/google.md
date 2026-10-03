# Google field data: Search Console + GA4 (orchestrator, 2026-10-03)

Sources: GSC property `sc-domain:diceify.art` (URL Inspection, Search Analytics, Sitemaps APIs), GA4 property 367429523 "Diceify - GA4". CrUX field data: not available (PageSpeed API quota exhausted on this network; lab Lighthouse used instead, see performance.md).

## Indexation (URL Inspection, 9 key URLs)
| URL | Verdict | Last crawl | Notes |
|---|---|---|---|
| / | Indexed | 2026-09-24 | Google canonical `https://diceify.art/` (page declares no trailing slash) |
| /dice-art | Indexed | 2026-09-11 | Breadcrumbs + Image Metadata rich results |
| /gallery | Indexed | 2026-09-25 | Breadcrumbs + Image Metadata |
| /editor | Indexed | 2026-09-12 | client-rendered app, 66 words of HTML text |
| /blog | Indexed | 2026-09-15 | |
| /blog/jeremy-dice-portraits-nieces | Indexed | 2026-08-18 | |
| /blog/why-i-built-diceify | **Discovered – currently not indexed** | never | in sitemap since 2024; Google chose not to crawl it |
| /privacy | Indexed | 2026-09-06 | **canonical mismatch**: page declared `/` at crawl time; fixed live on 2026-10-02, not recrawled yet |
| /terms | Indexed | 2026-09-21 | same canonical mismatch, same fix pending recrawl |

Sitemap: submitted 2026-03-10, downloaded 2026-09-28, 29 warnings / 0 errors, index counter stale ("8 submitted / 0 indexed" vs 8 of 9 actually indexed).

### Findings
- **High — Organic traffic has fallen ~80% since May.** GA4 organic sessions: Jan 4,124 (viral spike) → Mar 1,496 → May 1,886 → Jun 838 → Jul 712 → Aug 492 → Sep 343. GSC mobile impressions May 8,845 → Sep 2,552; mobile CTR 14.2% → 7.6%; desktop position 9.0 → 22.3 (Aug) → 11.6 (Sep). The week after the **May 21 2026 Core Update** clicks halved (316 → 156/week) and never recovered; the FAQ-rich-result retirement (May 7) removed the expanded SERP snippet the homepage FAQ had earned. Treat the core-update overlap as a hypothesis, not proof, but it is the single most important thing to investigate. (Google ledger: status.search.google.com/incidents/wdAXJk6LRRihEjpzEeWE.)
- **High — Desktop rankings are unstable.** "dice art generator": mobile pos 3.0 (87 clicks, 21% CTR) vs desktop pos 17.4 (12 clicks, 6.9% CTR) over 90 days. Day-level desktop positions alternate between ~3 and 20–46, i.e. on roughly a third of days the homepage is not the page Google shows and a weak page (gallery/blog) ranks far down instead. Desktop SERPs for this query carry more AI Overview / video / shopping real estate; see sxo.md.
- **High — /dice-art and /gallery earn impressions but almost no clicks.** /dice-art 6,407 impr → 49 clicks (0.76%), /gallery 5,727 → 20 (0.35%) in 90 days. Both rank 6–9 for "dice art", "dice portrait", "dice picture art", "dice mosaic generator". Their titles/snippets do not win against image packs, Etsy and Pinterest; GA4 engagement on these landing pages is 43–46% on mobile (vs 64% on /). Fix = snippet rewrite + page-type change (gallery as an inspiration page with real captions; guide with a visible answer-first intro). See content.md and sxo.md.
- **Medium — Sitelink rows distort GSC.** `/blog`, `/#pricing`, `/#faq` show 3.7–4.8k impressions each at position ~4.4 with 0–1 clicks. These are sitelinks under the homepage result, not rankings; "quick win" tools that flag them are wrong. Google chose /blog (118 words, 2 posts) as a sitelink target — a stronger blog or a "How it works" page would make a better sitelink.
- **Medium — one blog post has never been indexed** (`/blog/why-i-built-diceify`, "Discovered – currently not indexed"). 495 words, no image, 2 internal links, dated 2024-01. Google's crawl budget signal says it is not worth fetching. Fix: add an image, dateModified, links from /dice-art and the homepage founder note, request indexing after the content update.
- **Low — stale canonical mismatch on /privacy and /terms.** Already fixed in code (2026-10-02 deploy). Request re-indexing of both URLs in GSC so the warning clears.
- **Low — homepage canonical vs Google canonical differ by a trailing slash** (`https://diceify.art` vs `https://diceify.art/`). Google resolves it, but every sitemap `<loc>`, canonical and og:url should use the slash form to avoid a 29-warning sitemap and split signals. (technical.md / sitemap.md)
- **Info — Brand queries are healthy**: "diceify" / "dicefy" position 1–1.8, 61–78% CTR. Misspelling "dicefy" gets as many impressions as the brand; both are captured.
- **Info — Non-Google search is small but engaged**: Bing 58 sessions / 54 key events, DuckDuckGo 10 / 12, ChatGPT 31 / 17 in 90 days. Bing + ChatGPT (which uses Bing's index) justify Bing Webmaster Tools + IndexNow (geo.md).

## Quick wins from GSC (real pages only, sitelink rows excluded)
| Query | Page | Pos | Impr (90 d) | CTR | Action |
|---|---|---|---|---|---|
| dice art | /gallery | 6.0 | 899 | 0% | rewrite title/description toward "examples / ideas", add captions and dice counts |
| dice art | /dice-art | 6.0 | 884 | 0.2% | answer-first intro + title "Dice Art: What It Is, How Many Dice You Need, How to Make It" |
| dice portrait | /dice-art | 4.8 | 267 | 0% | add a "dice portrait" section with a photo→portrait example and link to /editor |
| dice painting | / | 7.6 | 231 | 0.4% | intent mismatch (painted dice crafts) — deprioritise |
| dice art generator | /gallery | 6.4 | 236 | 0.4% | gallery is cannibalising the homepage on desktop; link gallery → / with "dice art generator" anchor and keep tool intent on / |
| dice art kit | / | 9.6 | 35 | 2.9% | shopping intent — only worth a "what you need / where to buy dice" section |

## GA4 engagement (Jul 5 – Oct 2)
| Channel | Sessions | Engagement | Avg duration |
|---|---|---|---|
| Organic Search | 1,468 | 70% | 208 s |
| Direct | 444 | 47% | 73 s |
| Unassigned | 425 | 47% | 392 s |
| Referral | 83 | 86% | 178 s |
| AI Assistant (GA4 channel) | 31 | 68% | 316 s |

Organic landing pages: / 1,031 (eng. 64% mobile / 68% desktop), /editor 297 (100% engaged — direct tool users), /dice-art 78 (46% mobile), /gallery 39 (43% mobile). The spring Performance Max campaign ("Cross-network", 5,344 sessions Apr–Jul, 31 s avg duration) is off; it inflated spring totals and should be excluded from any year-over-year organic comparison.
