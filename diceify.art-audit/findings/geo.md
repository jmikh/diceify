# GEO / AI Search Readiness: diceify.art (2026-10-03)

Method: static fetches only (no Chromium). Live HTML came from `render_page.py --mode never`; the saved HTML is in `data/raw/`. Bot checks used curl with spoofed user agents at about 1 request per second. Live SERP and AI-answer checks failed: Bing returned unrelated results, DuckDuckGo showed a CAPTCHA, Reddit blocked the requests and no DataForSEO was available. Anything that depended on those checks is marked **not verified**.

## AI Search Readiness score: 63 / 100

| Dimension | Weight | Score | Why |
|---|---|---|---|
| Citability | 25% | 68 | /dice-art opens each section with the answer and gives specific numbers (dice counts, sizes in cm/in, dice per sq ft, hours). The homepage FAQ answers (44–59 words) are in the SSR HTML. Gaps: no visible "Diceify is…" sentence, no weight or cost figures, no first-party measured data, and small number conflicts between pages. |
| Structural readability | 20% | 75 | Question H2s, a real `<table>` (no `<caption>`), HowTo steps, a single H1. The homepage FAQ questions are buttons, not headings. The 12-shade scale is SVG only, with no text equivalent. |
| Multi-modal | 15% | 50 | Descriptive alt text everywhere, and a 3-image black/white/both comparison. No video on /dice-art (the only video is a YouTube embed on one blog post) and no VideoObject. The gallery has 67 words and no captions. Every page uses the same og:image. |
| Authority & brand | 20% | 35 | No `sameAs`, no Wikipedia or Wikidata entry (both APIs return 0 results for "Diceify", and Wikipedia has no "dice art" article). /dice-art lists an Organization as author. Blog posts date from 2023-11 and 2024-01. A competitor rates Diceify 3/5. The name gets confused with "Dicify". |
| Technical accessibility | 20% | 82 | Static SSR HTML, robots.txt allows all, every AI user agent gets 200 with identical bytes. llms.txt returns 404, there is no Content-Signal, Bing verification is unknown, there is no IndexNow, and /editor is client-rendered (~66 words without JS). |

Weighted: 17.0 + 15.0 + 7.5 + 7.0 + 16.4 = **62.9 ≈ 63**

### Platform scores (estimates)
| Platform | Score | Main lever |
|---|---|---|
| Google AI Overviews / AI Mode | 66 | Governed by Googlebot and normal ranking (Google-Extended does not affect AIO). Mobile ranks 3–7 for core queries, but desktop has slid (pos 12–22). AIO cites from the top 10, so the desktop slide matters most. |
| ChatGPT Search | 55 | 31 sessions in 90 days, ~93% landing on `/`, so ChatGPT recommends Diceify as a tool but rarely cites it for facts. It relies on the Bing index plus OAI-SearchBot, so Bing verification and IndexNow matter. Third-party "best X" lists drive its tool recommendations. |
| Perplexity | 50 | PerplexityBot is allowed. Perplexity leans on Reddit, YouTube and comparison lists. The competitor's list rates Diceify 3/5, and Dice Art Studio gets quoted for numbers. |
| Bing Copilot | 45 | 58 Bing sessions in 90 days. No Bing verification artifact on the site and no IndexNow. Desktop rankings are weak, and Bing is mostly desktop. |

## 1. AI crawler access: PASS
robots.txt (`app/robots.ts`) contains `User-Agent: * / Allow: / / Disallow: /account / Sitemap`, with no bot-specific rules. Live test on 2026-10-03, `/` and `/dice-art`: **every agent got 200, text/html, the same byte size** (16,901 / 13,606 bytes compressed). That means no UA-based blocking, no challenge page and no cloaking.

| Agent | Governs | Result |
|---|---|---|
| OAI-SearchBot | ChatGPT Search citations | 200, allowed |
| ChatGPT-User | user-triggered fetches in ChatGPT | 200 |
| GPTBot | OpenAI **training** only (says nothing about ChatGPT Search) | 200, allowed |
| Claude-SearchBot | Claude search citations | 200, allowed |
| Claude-User | user-triggered fetches in Claude | 200 |
| ClaudeBot | Anthropic **training** only | 200, allowed |
| PerplexityBot / Perplexity-User | Perplexity index / user fetches | 200 / 200 |
| Googlebot (Google-Extended has no user agent of its own; it is only a robots.txt token) | Search + AI Overviews/AI Mode (Googlebot). Google-Extended = Gemini/Vertex training and grounding | 200. No Google-Extended rule, so allowed |
| Bingbot | Bing, Copilot, and indirectly ChatGPT | 200 |
| Applebot (Applebot-Extended = Apple Intelligence training only) | Siri/Spotlight | 200 |
| CCBot, cohere-ai, Amazonbot, meta-externalagent, Bytespider, DuckAssistBot | training / misc | 200 |

Caveat (**not verified**): a spoofed user agent from a residential IP does not exercise Cloudflare's verified-bot / "Block AI bots" rules. Check **Cloudflare → AI Crawl Control** to confirm real GPTBot, OAI-SearchBot, ClaudeBot and PerplexityBot hits return 200, and to see their crawl volume.

## 2. Discovery files
| Path | Status |
|---|---|
| `/llms.txt`, `/llms-full.txt`, `/.well-known/llms.txt` | 404 |
| `/ai.txt`, `/.well-known/ai.txt` | 404 (Spawning convention, niche; optional) |
| Content-Signal in robots.txt | absent (Cloudflare managed robots.txt is not enabled) |
| RSL 1.0 (`License:` in robots, `/license.xml`, `rel=license` RSL) | absent. Not recommended for a free tool that wants visibility. |
| `/BingSiteAuth.xml` | 404. No `msvalidate.01` meta either. |
| IndexNow key file | none in `public/`, and nothing in the repo mentions IndexNow. Key name unknown, so **not verified**. |
| RSS/Atom (`/feed.xml`, `/rss.xml`, `/blog/rss.xml`) | 404 |
| `/.well-known/security.txt`, `/humans.txt` | 404 (cosmetic) |
| DNS TXT/CNAME (Bing DNS verification) | **not verified**: this network's resolver intercepts DNS (authoritative answers came back without the `aa` flag). |

## 3. Findings (severity, evidence, fix)

### GEO-1 HIGH: The competitor's "best dice art generators" page defines Diceify (3/5), and Diceify has no answer page
Evidence: diceartgenerator.io `/blog/best-dice-art-generators/` ("Compared (2026)", dated Jan 15 2026, no byline, no methodology) scores itself 5/5, DiceArt.me 4/5 and "Diceify.art" 3/5. Its table says "Project Info: Basic, PDF Export: No, Privacy: Upload". Its cons: "No PDF export, Limited customization options, No project information". It also publishes a dice buying guide (claims bulk dice cost "$0.01–0.02 per die"), a how-to and templates. On 2026-10-02, Diceify did not appear at all in a Brave-backed search for "best dice art generator".
Several of those claims are wrong or out of date according to the codebase:
- **Project info**: the editor shows the grid size, total dice and the exact black/white split (`DiceStats`), plus build progress ("X / Y dice placed").
- **Customization**: grid 20–120 rows, 3 color modes (black / white / both), contrast 0–100, brightness (gamma 0.5–1.5), edge sharpening 0–100, rotation of 6/3/2 faces, crop with rotation.
- **Privacy**: the dice pipeline runs in the browser, and anonymous drafts stay on the device (localStorage + IndexedDB). Photos are uploaded only when a signed-in user saves to the cloud.
- **True gap**: there is no PDF export. Diceify offers SVG blueprints (paid) and social image downloads (free).

Fix: publish `/best-dice-art-generator` (or `/compare`), a dated comparison with a byline (John Mikhail) and a stated method (same photo, same grid, every tool). Include a feature table (price, grid range, color modes, tuning controls, dice counts shown, step-by-step builder, export formats, where the photo is processed, account needed) covering Diceify, diceartgenerator.io, DiceArt.me, DiceMosaic and Dice Art Studio. Concede the PDF gap honestly, because self-serving 5/5 tables get discounted. Add the same output image from each tool. Separately, ask diceartgenerator.io to correct the factual errors on privacy and project info. Effort: about 1 day. Impact: ChatGPT and Perplexity "best X" answers.

### GEO-2 HIGH: Weak entity identity (no sameAs, no Wikidata, no "Diceify is…" sentence, Dicify confusion)
Evidence: the Organization JSON-LD on every page is `{name, url, logo}` with no `sameAs`. The footer links to tiktok.com/@diceify.art, instagram.com/diceify.art and reddit.com/r/DicePortraits, but the schema doesn't. The founder's YouTube video "Umm Kulthum in dice" (z4UUXeYqJZw) sits on his personal channel @johnfwilliam and is embedded only on `/blog/why-i-built-diceify`. Wikidata and Wikipedia return no results for "Diceify". The homepage's visible text never says what Diceify is: the definition lives only in the meta description and WebApplication JSON-LD. "Dicify" is a different project (the capstone in the *Learning TensorFlow.js* book), and AI answers mix the two up.
Fix:
1. Add one visible sentence near the hero, for example: "Diceify (diceify.art) is a free, browser-based dice art generator that turns a photo into a buildable black-and-white dice pattern with exact dice counts and a step-by-step builder." Repeat it verbatim in the footer and in llms.txt.
2. Organization: add `sameAs` (Instagram, TikTok, Reddit, YouTube), `founder` (Person John Mikhail with `sameAs` to YouTube/LinkedIn), `foundingDate`, and `alternateName` ["Diceify.art"]. Give the WebApplication a stable `@id` and reference it.
3. Create a Wikidata item (instance of: web application; official website; founder; social IDs). Wikidata's notability bar is lower than Wikipedia's.
4. Disambiguate once, for example in the FAQ: "Diceify (with an e) is not related to the 'Dicify' TensorFlow.js book project."
Effort: about 2 h of code plus 1 h for Wikidata.
**Not verified**: who owns r/DicePortraits and how big it is, Instagram/TikTok follower counts, and third-party mentions (Reddit, YouTube and search were blocked).

### GEO-3 HIGH: Bing / IndexNow, which ChatGPT and Copilot depend on
Evidence: no `BingSiteAuth.xml`, no `msvalidate.01` meta, no IndexNow key file. DNS verification is **not verified**. Bing Webmaster Tools can also be verified by importing from GSC, which leaves nothing on the site, so check the BWT account directly. Bing sent 58 sessions in 90 days. Desktop rankings for "dice art generator" are 12–22.
Fix: verify in BWT (Import from GSC), submit the sitemap, and check the AI Performance / Copilot citation reports if they're available. Turn on **Cloudflare Crawler Hints** (Caching → Configuration), which sends IndexNow pings automatically with no code. Alternatively, add a `public/<key>.txt` and submit changed URLs after each deploy. Effort: 30 min.

### GEO-4 MEDIUM-HIGH: Questions with no owned, quotable numbers (weight, cost, first-party data)
Evidence: /dice-art now owns die size, finished size, dice per square foot (363 at 16 mm / 645 at 12 mm), glue and build time. Still missing: **weight** (only "Big pieces get heavy"), **bulk dice cost / total project cost** (no figures, while the competitor publishes $0.01–0.02 per die), **frame/mounting weight limits**. AI answers quote Dice Art Studio for dice counts.
Fix: add a short "What does it cost and weigh?" section with **measured, dated first-party numbers**. For example, weigh 100 of your own 16 mm and 12 mm dice and record real bulk prices with vendor and date, then work out the totals for each grid in the existing table (add "Weight" and "Dice cost" columns). For reference only (**not verified**), a 16 mm acrylic die is roughly 4–5 g, which puts a 50×50 piece at about 10–12 kg of dice. Publish your own measurement, not this estimate. Gallery: caption each piece with its grid, dice count and physical size (the file names already hold the grids: dali 51×51 = 2,601 dice, frida 54×54 = 2,916, salah 61×61 = 3,721, kobe 71×71 = 5,041, sharbatgula 52×52 = 2,704, ummkulthum 58×58 = 3,364), and add a sentence or two about each build. Effort: half a day.

### GEO-5 MEDIUM: Freshness and authorship
Evidence: the blog has 2 posts (2023-11-21, 2024-01-24) and nothing since. `/blog/why-i-built-diceify` is "Discovered – not indexed". In blog JSON-LD, `dateModified` = `datePublished`. /dice-art is fine on dates (visible "Last updated: October 3, 2026", `dateModified` 2026-10-03, hardcoded constants rather than build-time dates), but its author is the Organization. The meta author is "Diceify Team". The sitemap has no lastmod for `/`, `/dice-art`, `/gallery` or `/blog` (the 2026-10-02 fix may not be live).
Fix: make the /dice-art author a Person (John Mikhail, with a short bio and links). Publish 1–2 dated pieces per quarter with real build photos: a build log with timings and measured weight, a "best photos for dice art" guide (competitor has one), and a buying guide. Embed the YouTube build video on /dice-art with VideoObject. Add an RSS feed. Effort: ongoing.

### GEO-6 MEDIUM: Homepage FAQ and /dice-art disagree, and the FAQ is hard to extract
Evidence: 40×40 build time is "a full day or two" on `/` but "a full day" on /dice-art. The two pages also define "What is dice art" differently (59 words vs 42). The homepage FAQ answers are in the SSR HTML, but the questions are `<button aria-expanded>`, not headings. Trafilatura's boilerplate-stripped text ends at "Frequently asked questions" and extracts **zero** FAQ answers. The homepage hero has no passage that can be quoted on its own.
Fix: use one source of truth for shared answers (the /dice-art `ANSWERS` pattern). Render FAQ questions as `<h3>` inside the button (or use `<details><summary>`), and keep answers in the DOM. Effort: 1–2 h.

### GEO-7 LOW-MEDIUM: Structure and multi-modal gaps on /dice-art
The 12-shade scale is only SVG, so add a text line giving the order (black 6 … white 6). Add a `<caption>` to the dice table. The H2s "How it works: brightness mapping" and "How to make your own" could be phrased as questions. There is no video on the page. Every page uses the same og:image, while /dice-art could use the comparison image. Effort: 1 h.

### GEO-8 LOW: llms.txt missing
Google has said it does not use llms.txt for Search or AI Overviews, and no major AI search engine has confirmed using it. It is cheap and harmless, though, and some agents and tools do fetch it. Add `public/llms.txt` (proposed body below). Effort: 15 min.

### GEO-9 LOW: Content-Signal / training opt-outs (business decision)
robots.txt has no Content-Signal. Content-Signal is an advisory convention proposed by Cloudflare, and no major AI vendor has publicly committed to honoring it. If you want one, `Content-Signal: search=yes, ai-input=yes, ai-train=<your choice>` keeps search and grounding allowed. `MetadataRoute.Robots` can't emit custom lines, so swap `app/robots.ts` for a static `public/robots.txt`. **Do not** block OAI-SearchBot, Claude-SearchBot, PerplexityBot, Googlebot or Bingbot. Blocking GPTBot, ClaudeBot, CCBot, Google-Extended or Applebot-Extended only affects training (Google-Extended also affects Gemini grounding). The cheapest option is to leave everything allowed, which is the current state.

### GEO-10 LOW: /editor is thin for crawlers without JS
It has about 66 words ("Loading workspace…") and gets 297 organic sessions. Add a short static intro (what the editor does, the steps, free limits) outside the client app.

## Top 5 changes (impact / effort)
1. Honest comparison page plus a correction request to diceartgenerator.io (GEO-1): high impact, about 1 day.
2. Entity package: visible definition, sameAs/founder schema, Wikidata, Dicify disambiguation (GEO-2): high impact, about 3 h.
3. BWT verification plus Cloudflare Crawler Hints (IndexNow) (GEO-3): high impact for ChatGPT and Copilot, 30 min.
4. First-party weight and cost data plus gallery captions with dice counts (GEO-4): medium-high impact, half a day.
5. Person author, regular dated build content, video on /dice-art (GEO-5): medium impact, ongoing.

## Proposed `/llms.txt`
```
# Diceify

> Diceify (diceify.art) is a free, browser-based dice art generator. It turns a photo into a buildable mosaic pattern of standard six-sided black and white dice, shows the exact number of dice of each color, and guides you through the build row by row. Not related to "Dicify", the TensorFlow.js book project.

Key facts:
- Dice art is a mosaic of six-sided dice: each die is one pixel, and the face turned up sets its shade. Black and white dice together give 12 shades.
- Dice needed = columns × rows: 20×20 = 400, 30×30 = 900, 40×40 = 1,600, 50×50 = 2,500, 100×100 = 10,000.
- Finished size = dice per side × die size: a 50×50 portrait is 80 cm (31.5 in) per side with 16 mm dice, 60 cm (23.6 in) with 12 mm dice. One square foot holds ~363 dice at 16 mm (645 at 12 mm).
- Build time: a 20×20 portrait (400 dice) takes 2–4 hours; a 40×40 (1,600 dice) about a full day.
- Diceify grids run from 20 to 120 rows; controls: color mode (black, white, both), contrast, brightness, edge sharpening, crop.
- The photo is processed in the browser; drafts made without an account stay on the device.
- Plans: Explorer (free: generate, download images, builder for the first 5 rows), Creator ($19 one-time, 30 days of full access), Studio ($36/year). Paid plans unlock the full builder and SVG blueprints.

## Guides
- [Dice art: the complete guide](https://diceify.art/dice-art): what dice art is, how many dice you need, finished size, which dice and glue to use, step-by-step build
- [Dice art gallery](https://diceify.art/gallery): portraits and mosaics made with Diceify

## Tool
- [Dice art editor](https://diceify.art/editor): upload, crop, tune and build (requires JavaScript)
- [Pricing and FAQ](https://diceify.art/#pricing)

## Stories
- [Why I built Diceify](https://diceify.art/blog/why-i-built-diceify): John Mikhail, founder
- [Dice portraits for my nieces](https://diceify.art/blog/jeremy-dice-portraits-nieces): a community build

## Optional
- [Privacy](https://diceify.art/privacy)
- [Terms](https://diceify.art/terms)
- Social: https://www.instagram.com/diceify.art/ · https://www.tiktok.com/@diceify.art · https://www.reddit.com/r/DicePortraits
```
(Before shipping, confirm the privacy wording and the plan details against the live pricing.)

## What works
- Static SSR HTML on every marketing page. Every AI crawler user agent tested gets 200 with identical content, and robots.txt allows all of them.
- /dice-art opens each section with its answer and has specific, quotable numbers: a dice-count and size table in cm and in, dice per square foot, die-size guidance, glue methods, build hours. Its FAQ JSON-LD is generated from the visible text, so the two never drift. Article, HowTo and BreadcrumbList schema are present. There is a visible "Last updated" date that matches `dateModified`.
- AI answers already quote the /dice-art and FAQ numbers word for word (from the 2026-10-02 vetting), and ChatGPT already sends referral traffic.
- Descriptive alt text, and a black / white / both image comparison that explains the 12-shade idea visually.
- Brand queries ("diceify", "dicefy") rank #1, and mobile ranks 3–4 for "dice art generator", "dice portrait" and "photo to dice art".
- A real founder story with a named person and a named community author with a URL, which are experience signals worth building on.

## Not verified
Real AI-crawler traffic and Cloudflare bot settings · Bing Webmaster status and DNS verification · IndexNow key or Crawler Hints state · r/DicePortraits ownership and size, social follower counts, third-party mentions · live ChatGPT/Perplexity/Copilot/AIO answers for "best dice art generator" · whether the gallery images are photos of physical builds or digital renders (600×600 webp) · Dice Art Studio's page content.

## Structured findings (AI Search Readiness, for audit-data.json)
```json
{"category":"AI Search Readiness","score":63,
 "dimensions":{"citability":68,"structure":75,"multimodal":50,"authority":35,"technical":82},
 "platforms":{"google_aio":66,"chatgpt":55,"perplexity":50,"bing_copilot":45},
 "findings":[
  {"id":"GEO-1","severity":"high","title":"Competitor comparison rates Diceify 3/5 with inaccurate claims; no own comparison page","effort":"1d"},
  {"id":"GEO-2","severity":"high","title":"No sameAs/Wikidata/visible entity definition; Dicify confusion","effort":"3h"},
  {"id":"GEO-3","severity":"high","title":"No Bing verification artifact or IndexNow","effort":"30m"},
  {"id":"GEO-4","severity":"medium","title":"Weight/cost questions unowned; gallery lacks dice-count captions","effort":"0.5d"},
  {"id":"GEO-5","severity":"medium","title":"Stale blog (2023/2024); Organization author on /dice-art","effort":"ongoing"},
  {"id":"GEO-6","severity":"medium","title":"Homepage FAQ not extractable as headings; numbers differ from /dice-art","effort":"2h"},
  {"id":"GEO-7","severity":"low","title":"SVG-only shade scale, no table caption, no video on /dice-art","effort":"1h"},
  {"id":"GEO-8","severity":"low","title":"llms.txt 404","effort":"15m"},
  {"id":"GEO-9","severity":"low","title":"No Content-Signal (optional)","effort":"15m"},
  {"id":"GEO-10","severity":"low","title":"/editor thin without JS","effort":"1h"}],
 "crawler_access":{"all_tested_user_agents":"200","robots":"allow all, Disallow /account"},
 "llms_txt":"missing"}
```
