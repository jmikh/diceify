# SXO (Search Experience) analysis: diceify.art (2026-10-03)

Scope: `/`, `/dice-art`, `/gallery`, `/editor` against 9 queries from GSC. Method: SERP-backwards. For each query I classified the top results by page type, compared the Diceify URL that ranks, derived personas from the SERP signals, and scored each page from each persona's point of view.
**SXO Gap Score is separate from the SEO Health Score.**

Evidence sources: live HTML via `render_page.py --mode never` (no Chromium) + `parse_html.py`; Lighthouse screenshots in `screenshots/`; GSC/GA4 numbers from `data/CONTEXT.md` and `findings/google.md`; live SERPs from Brave Search (Google could not be fetched, see Limitations), the WebSearch tool and live Google Autocomplete (`suggestqueries.google.com`); competitor pages fetched the same way; WHOIS and Wayback for competitor ages.
Sanity check: Brave puts Diceify in roughly the same positions that GSC reports for Google ("dice art generator" #3 on Brave vs 3.0 mobile in GSC; "dice mosaic generator" #2 vs 3.8/4.9). So Brave is a usable proxy for which page types rank. It says nothing about Google's SERP features.

---

## 1. Headline findings (lead with the mismatches)

| # | Sev | Finding |
|---|---|---|
| 1 | **HIGH** | **/gallery is the wrong kind of page for the demand it gets.** It earns 5,727 impr/90 d at 0.35% CTR. For "dice art" it shows at pos 6.0 with 899 impr and **0 clicks**. A zero-click URL at a fixed position on a head term looks like Google's **image block**: GSC counts image-block impressions to the host page, and an image click that stays in Google Images does not count as a click. The searchers are in **inspiration mode**. Autocomplete shows "dice art images", "dice art ideas", "dice artwork". Brave shows a Videos module and a Reddit module on every query, led by r/DIY "portrait of a friend out of 13,000 dice" (52K votes) and "Making a Mural with Only Dice" (1.55M views). What the gallery offers instead: 46–67 words, 13 **flat digital renders** captioned only with names, and no photo of a physical build, even though its copy says "built by hand". It has no sizes or dice counts and no "make one like this" link. On mobile the LCP is 6.1 s because the LCP image is lazy-loaded. |
| 2 | **MEDIUM (HIGH on desktop)** | **The homepage is a landing page; the "generator" SERP rewards a tool page.** "dice art generator": 9 of the top 10 on Brave are tools, and "dice mosaic generator": 10 of 10. The two exact-match competitors, **diceartgenerator.io and diceartgenerator.com, were both registered on 22–23 Jan 2026** (WHOIS; no Wayback captures). Both put a **drag-and-drop upload `<input type=file>` inside the hero** of the URL that ranks. Their hero copy: "100% Free · No Sign-up · Instant Preview · 2,500 dice · 50×50 · 60 cm · ~4 h", and "exact dice counts, printable blueprints". Diceify's `/` has **0 file inputs**; the tool is one click away on a client-rendered `/editor`. Desktop "dice art generator" slid month by month from 3.1 (Apr) to ~21 (Aug/Sep), starting about 3 months after those domains launched. |
| 3 | **MEDIUM** | **Three URLs compete for the same intents (cannibalisation), which explains the bimodal desktop rankings.** For "dice art", `/` (4.4/7.5), `/gallery` (6.0) and `/dice-art` (6.0) all get impressions. `/gallery` also gets 236 impressions for "dice art generator" (pos 6.4), and `/editor` sits at pos 28. **The homepage FAQ repeats 5 of its 6 questions on /dice-art** ("What is dice art?", "How many dice…", "black, white or both", "How long…", "dice art vs pixel art"). The /dice-art body also says "A dice art generator turns the photo…". On Brave, the homepage, not the guide, is the result shown for "how to make dice art", using the FAQ's "20×20 … 2 to 4 hours" text. |
| 4 | **MEDIUM** | **/dice-art matches the "how to" intent but does not look like what wins there.** "how to make dice art" ranks 5 of 7 tools plus 2 step guides (diceartgenerator.io's HowTo guide), with **7 videos** and 4 Reddit threads in modules. /dice-art has strong text: 1,223 words, a dice-count/size table, die size, glue and FAQ (updated 2026-10-03). But the first viewport has **no image, no CTA, no table of contents and no video**, and the guide shows renders only. A real build video already exists: *"Umm Kulthum in dice"* (youtube.com/watch?v=z4UUXeYqJZw, John Mikhail). It is embedded only in `/blog/why-i-built-diceify`, which is "Discovered – not indexed", and it has no VideoObject markup. |
| 5 | **HIGH mismatch → deprioritise** | **"dice painting", "dice art kit", "picture dice", and teacher "art dice" are different intents.** See §3. Don't build pages for them. At most add a "what to buy" materials block. |
| 6 | LOW (trust) | The gallery JSON-LD says `copyrightNotice: "© 2024 Diceify. All rights reserved."` on renders of third-party photographs, for example the "Afghan Girl" portrait (a famous copyrighted photo) and photos of athletes. This is not an SEO factor, but it weakens credibility and carries some rights risk. Replacing these with user or own builds fixes both problems. |

---

## 2. SERP analysis per query (Brave live SERP + Google Autocomplete)

Page-type taxonomy: Tool, Landing, Blog/Guide, Product, Hybrid, Comparison. "UGC" = Reddit/Pinterest/Instagram/HN inspiration, classed as Blog for consensus.

| Query (GSC) | Top-10 page-type mix | Dominant type (confidence) | SERP modules (Brave) | Google Autocomplete | Diceify URL / type | Mismatch |
|---|---|---|---|---|---|---|
| **dice art generator** (m 3.0 / d 17.4; m CTR 21%) | diceideas, diceart.me, **Diceify**, DiceMosaic (Play app), Visual Paradigm dice effect, dicemaniax generator, dicemosaicgenerator, NightCafe, kweic, (DiceBear, irrelevant) | **Tool 90%** | Videos (5), Reddit (2) | app, online free, app free, maker, **best dice art generator (free)**, ai | `/` Landing (tool 1 click away) | **MEDIUM**, HIGH on desktop vs drop-zone EMDs |
| **dice mosaic generator** (m 3.8 / d 4.9) | diceart.me, **Diceify**, diceideas, dicemosaicgenerator, dicemaniax, kweic, GitHub lmarzen, adrianomoura (p5.js, PNG/SVG/TXT export), diceartgenerator.com | **Tool 100%** | Videos (6, incl. PicDice kit), Reddit (4) | free, art, art kit, gallery | `/` | MEDIUM (holding: competitors here are hobby/GitHub tools) |
| **photo to dice art** (2.9) | diceart.me, **Diceify**, diceart blog, diceartgenerator.com, diceart tutorial, Visual Paradigm, diceideas, dicemaniax, GitHub Image2Dice, diceart blog | **Tool 70%**, Blog 30% | Reddit, Videos | — | `/` | ALIGNED-ish (MEDIUM, same root as above) |
| **dice portrait** (m 3.4; /dice-art 4.8 at 0% CTR) | diceideas, diceart.me ("Give the most personal birthday gift imaginable — a custom dice portrait"), HN, r/DIY, r/pics, r/oddlysatisfying, dicemaniax, **Diceify**, Visual Paradigm, dicemaniax custom; later Etsy commission $2,100, PicDice Kickstarter | **Tool 50%**, UGC 40%, Product 10% | Videos (3), Reddit/HN (9 threads) | generator, art, template, generator online free, kit, app, tutorial | `/` (ok); `/dice-art` (guide) | MEDIUM for /dice-art: shows up, gets no clicks |
| **dice art** (1,750 impr; m 4.4 / d 7.5; CTR 3–5%) | Amazon *Art Dice* (prompt dice), Two Tumbleweeds *Art Dice*, diceideas, unwindfiberarts *Art Dice*, **Diceify**, Pinterest "art dice games", Instagram @diceideas, TinkerLab art dice, diceart.me, ART CAMP kids class | **Fractured**: Product 30%, Tool 30%, UGC 20%, Blog 20%. **60% of results are a different meaning** (*Art Dice* creativity-prompt dice) | Videos (6), Reddit (4); GSC suggests a Google **image block** (gallery 899 impr / 0 clicks) | generator, artwork, artist, kit, portrait, ideas, game, **artist profile** (Dice.com job-site noise), **images** | `/`, `/gallery`, `/dice-art` all show | `/` MEDIUM; **/gallery HIGH** (thin collection vs image/inspiration intent) |
| **how to make dice art** (~100 impr / 6 mo) | diceideas, diceart.me, dicemosaicgenerator, **diceartgenerator.io how-to guide (HowTo schema)**, Photoshop-actions tutorial, **Diceify `/`** (FAQ snippet), diceideas custom | Tool 71%, Guide 29% | **Videos (7)**: Insider Art "Mosaic Portraits Made From Dice", "Making a Mural with Only Dice" (1M+), framing, kit tutorial; Reddit (4) | step by step, how to do dice art (+ Dice.com "artist account" noise) | `/` instead of `/dice-art` | MEDIUM: wrong URL surfaces; guide lacks video and process photos |
| **dice painting** (231 impr, pos 7.6, **0.4% CTR**) | r/rpg "painting dice", diceart.me, r/DIY 13k dice, r/DnD dice painting, r/DiceMaking best paint, BoardGameGeek, diceideas, **Diceify** (snippet pulled from the Jeremy teaser "…painted with their favorite colors"), dnddice "Paint Thy Numbers", Dice Dragons re-inking | **Forum/how-to on painting or re-inking dice 60%** | Videos (re-inking), forums | ideas, on canvas, easy, painting dice numbers, dnd dice painting, diamond painting | `/` | **HIGH: deprioritise** |
| **dice art kit** (35 impr, pos 9.6) | Michaels d20 wood "art kit", **PicDice Kickstarter (DIY dice-mosaic kit, 2,000+ dice)**, Amazon d20 kit, HipFlaskPlus, diceideas, **Diceify**, dicemaniax, diceart.me, TinkerLab, DIY Sprout; Etsy at #11 | **Product 40% + Shopping module** (Etsy $6.50–29.99, Amazon, Michaels) | Shopping, Videos | for adults, set, **dice mosaic art kit**, diy dice art kit | `/` | **HIGH: deprioritise**; add a materials list only |
| **picture dice** | diceideas, Adobe Stock, iStock, diceart.me, **Diceify**, dicemaniax, Unsplash, Shutterstock, Visual Paradigm, Amazon custom photo dice (+ the WebSearch tool: classroom picture-dice templates from lessonpix, toolsforeducators, storyboardthat) | Stock-photo libraries 40%, Tool 50%; split intent | **Images module**, Videos | generator, game, online, roller | `/` | HIGH: deprioritise ("picture dice generator" is the only aligned slice) |

**Competitor page facts (fetched today):**
- diceartgenerator.io: title "Free AI Dice Art Generator | Make Dice Mosaics & Portraits"; upload input at ~20% of the body; SoftwareApplication + Offer + FAQPage + Breadcrumb schema.
- diceartgenerator.com: upload input at ~13% of the body; 1,178 words.
- diceart.me: tool, templates, gallery and blog, with gift positioning.
- diceideas.com: commissions plus a blueprint tool, 424K Instagram followers.
- dicemaniax: shop with a generator page that sells the placement instructions.

None of the dedicated tool sites asks you to click away from the ranking URL before you can upload. Diceify is the exception.

---

## 3. Queries to deprioritise (mismatch, not opportunity)

| Query | Why | Do |
|---|---|---|
| dice painting | Searchers want to paint or re-ink dice (RPG forums) or buy paintings of dice. Diceify matches only on the phrase "painted with their favorite colors" in the Jeremy teaser. | Nothing. Don't add "dice painting" copy. The 0.4% CTR drags down the site's average CTR but does not hurt rankings. |
| dice art kit / dice mosaic art kit | Shopping intent: Michaels/Amazon/Etsy plus PicDice, a boxed kit with 2,000+ dice. Diceify sells no kit. | Add a "What you need to buy" block on /dice-art (dice count by grid, 16 mm pips, a board, glue) that links to the editor's exact counts. A kit or affiliate offer is a business decision for the user, not an SEO fix. |
| picture dice | Stock photos and classroom paper-dice templates. | Ignore. "picture dice generator" is a tiny tail that `/` already covers. |
| "art dice" / teacher prompt dice | Two Tumbleweeds-style prompt dice (60% of the "dice art" SERP on Brave). | Ignore. Don't chase the *Art Dice* product meaning. |
| "dice artist (profile)" | Dice.com job-site navigational noise in autocomplete. | Ignore. |
| "dice art" as a blue-link target for /gallery | Fractured head term; the gallery's real shot is the image block. | Make the gallery images worth clicking through (§6), not the title. |

---

## 4. Desktop vs mobile gap: hypotheses, ranked

Facts:
- "dice art generator" is at pos 3.0 on mobile (21% CTR) and 17.4 on desktop (6.9%). Desktop is bimodal day to day: about 3 on some days, 20–46 on others.
- Desktop position by month: 3.1 (Apr) → 7.4 → 9.4 → 12 → 21 (Aug/Sep). Mobile held at 4–5.4.
- GA4 engagement on `/` is **similar** across devices (64% mobile, 68% desktop), so the landing page itself is not failing desktop users after the click.

1. **New exact-match tool competitors won the desktop "generator" SERP (most likely).** Both "diceartgenerator" domains were registered on 22–23 Jan 2026. Their heroes contain the upload box, and they publish a "best dice art generators" comparison that rates Diceify 3/5 ("no PDF export, limited customization"). Autocomplete shows "best dice art generator (free)", which is comparison behaviour, mostly done in desktop tabs. A gradual monthly slide fits a competitor gaining ground better than a penalty does.
2. **Click signals are measured per device, and Diceify's brand pull is a mobile phenomenon.** Google's interaction data is segmented by device (NavBoost, per the DOJ trial testimony and the 2024 API-doc leak). The January viral spike and the TikTok/Instagram accounts (@diceify.art) mean many mobile searchers already recognise "Diceify". That is why mobile CTR at pos 3 is 21%, roughly double a typical pos-3 CTR, and those clicks keep reinforcing mobile. Desktop searchers don't know the brand, compare tools side by side, and are the ones who print patterns. Diceify's free tier offers the "Builder Studio first 5 rows" and paid "Full resolution SVG blueprints", while competitors promise free "printable blueprints". Desktop users who hit that gate go back to the SERP. **Validate:** a PostHog funnel by `$device_type` for organic sessions: `/` → editor open → upload → `paywall_shown` (feature) → session end / return. Also compare desktop vs mobile CTR for "dice art generator" on the days the homepage is at 3.
3. **The bimodal days are URL rotation / cannibalisation.** On "bad" days Google's desktop pick for the query is not `/`: `/gallery` (6.4 avg for this query) and `/editor` (pos 28) are the alternatives. Three URLs carry overlapping "dice art / generator / FAQ" signals (Finding 3). **Validate:** GSC query "dice art generator", device = desktop, Pages tab by date; check which URL holds the impressions on the 20–46 days.
4. **Desktop SERP features push results down (unverified).** Google often shows more modules on desktop (image block, video carousel, possibly an AI Overview). Brave shows Videos on all 9 queries. I could not see Google's own SERP (see Limitations), so this stays a hypothesis.
5. **Caveat:** the whole slide happened on the **pre-revamp site**; the new site went live 2026-10-02. Re-measure desktop "dice art generator" by device 4–6 weeks after the cutover before acting on hypothesis 2.

**The fixes that cover hypotheses 1–3 together:** an in-hero upload on `/`, one plain "what's free" line, consolidating the generator intent on `/`, and the "Diceify vs other dice art generators" consideration content (optional, see §7).

---

## 5. User stories (each tied to SERP signals)

1. **Gift maker (decision).** As someone making a birthday or memorial gift, I want to turn a photo of my kid, partner or pet into a dice portrait and know the dice count, finished size, cost and build time, because the gift is personal and has a deadline. I'm blocked by not knowing whether it will look like them and what it will take.
   *Signals:* diceart.me ranks for "dice portrait" with "Give the most personal birthday gift imaginable"; Etsy dice-portrait commission at $2,100; autocomplete "dice portrait template / kit / generator online free"; Diceify's own "Turn loved ones into dice art" and the Kobe tribute.
2. **Tool comparer (consideration).** As a hobbyist who found five free generators, I want to know which one gives me a free printable pattern and exact counts, because I won't pay before I know the build is feasible. I'm blocked by comparison fatigue and unclear free-tier limits.
   *Signals:* autocomplete "best dice art generator (free)", "dice art generator app free / online free"; 9 of 10 tools in the SERP, with GitHub tools offering free SVG/PNG export; the competitor listicle rating Diceify 3/5 for "no PDF export".
3. **Inspiration browser (awareness).** As someone who saw a dice portrait on TikTok or Reddit, I want to see real finished pieces at scale and how they were made, because I'm deciding whether I could do this myself. I'm blocked by digital mockups that don't show the real object.
   *Signals:* autocomplete "dice art images / ideas / artwork"; Videos modules ("Mosaic Portraits Made From Dice | Insider Art", "Making a Mural with Only Dice" 1.55M views); r/DIY 13,000-dice thread (52K votes); GSC /gallery 899 impressions, 0 clicks.
4. **Teacher / classroom (awareness).** As an art or maths teacher, I want a low-cost dice activity for a class, because I need hands-on lessons. I'm blocked because most "dice art" results are prompt dice, and nothing shows how to run a class dice mosaic.
   *Signals:* Two Tumbleweeds *Art Dice* "for adults, artists & teachers… classroom"; TinkerLab and ART CAMP kids' dice projects; autocomplete "art dice for kids"; classroom "picture dice" templates. Mostly a *different product* (low weight).
5. **Kit buyer (decision).** As a buyer, I want a box with dice, board and pattern, because I don't want to source 2,000 dice myself. I'm blocked because Diceify sells no kit.
   *Signals:* autocomplete "dice art kit for adults / dice mosaic art kit / diy dice art kit"; Michaels, Amazon, Etsy and PicDice Kickstarter ("2,000+ dice, boards, tools") plus a Shopping module.

---

## 6. Persona scores (Relevance / Clarity / Trust / Action, 25 each)

Weights are an estimated share of Diceify's GSC demand: Tool comparer 35%, Gift maker 30%, Inspiration browser 25%, Teacher 5%, Kit buyer 5%.

| Persona | `/` | `/dice-art` | `/gallery` | `/editor` |
|---|---|---|---|---|
| Gift maker | **74** (21/18/14/21) | 60 (20/15/13/12) | 36 (10/12/7/7) | 68 (20/16/10/22) |
| Tool comparer | **60** (18/15/11/16) | 48 (12/12/12/12) | 32 (8/10/8/6) | 63 (20/14/9/20) |
| Inspiration browser | 60 (16/17/12/15) | 50 (13/12/12/13) | **47** (17/14/8/8) | 25 (5/5/5/10) |
| Teacher | 42 (8/10/12/12) | 45 (11/13/12/9) | 29 (6/10/7/6) | 40 (8/10/8/14) |
| Kit buyer | 32 (6/8/12/6) | 41 (12/12/11/6) | 18 (3/6/6/3) | 34 (8/10/8/8) |

Rating bands: 80+ Excellent · 60–79 Good · 40–59 Needs work · <40 Critical mismatch.

Evidence behind the key cells:
- **`/` × Gift maker (74):** The H1 "Turn loved ones into dice art" and the Kids/Pets/Couples lens demo are exactly this persona. On desktop, the demo shows "87×77 grid · 4,566 / 2,135" above the fold. On **mobile, the first viewport is text only** (home-mobile.jpg), and the before/after proof sits below the fold. Trust is "Join 5,000+ creators" plus a blog card; there is no photo of a finished, framed gift and no named quote near the CTA.
- **`/` × Tool comparer (60):** The title says "Free Dice Art Generator", but there is no upload in the hero. The free limits ("Builder Studio works for the first 5 rows") and paid SVG blueprints only show in the pricing block far down the page. Nothing answers "why Diceify vs the others". No ratings or export samples.
- **`/gallery` × Inspiration browser (47):** Right page type, wrong substance. You get 13 renders, names only, no build photos, sizes, counts or makers, and no per-item "make one like this". The only CTA ("Want to create your own?") is at the bottom. The mobile grid is still empty for several seconds (LCP 6.1 s).
- **`/dice-art` × Gift maker (60):** The answers are there (size table: 50×50 = 2,500 dice = 80 cm at 16 mm; glue; time), but there is **no CTA, image or TOC in the first viewport** (dice-art-mobile/desktop.jpg), and there is no author.
- **`/editor`:** It works for people who arrive ready to act (297 organic landings, 100% engaged). To crawlers it is "Loading workspace…" (51 words), so it cannot be the ranking URL for "generator". Keep that role on `/`.

**Weakest high-weight persona:** Inspiration browser on /gallery (47), followed by Tool comparer on `/` (60).
**Systemic issue:** **Trust** is the lowest dimension on every page. Diceify shows renders where the SERP rewards real objects (Reddit and YouTube builds), and it shows no named makers, no testimonials at the CTAs and no author on the guide. The best trust asset Diceify owns, a photo of hands placing real dice next to the phone builder (`/images/blog/why-i-built-diceify.webp`) and the build video, is hidden in an unindexed blog post.
**Second systemic issue:** **Action** on `/dice-art` and `/gallery`. Neither has a CTA above the fold, and neither has a site header CTA (only "Back to Home").

---

## 7. Fixes (ordered by impact)

| # | Sev | Page | Change | SERP evidence it answers |
|---|---|---|---|---|
| F1 | HIGH | `/gallery` | **Change the page type to "Dice art ideas & real builds".**<br>• Lead with 2–3 *photos* of physical pieces: the Umm Kulthum build photo and the YouTube build video with VideoObject markup, plus Jeremy's nieces.<br>• Group items by idea: Kids, Couples, Pets, Icons, Abstract.<br>• Caption each item with grid, total dice, black/white split, finished size at 16 mm and estimated build hours (the data is already in the file names, e.g. `kobe-71x71` = 5,041 dice ≈ 114 cm).<br>• Give each item a "Make one like this" link to `/editor`.<br>• Add a 150–300-word intro covering ideas, popular sizes and what makes a good photo.<br>• Load the first 4–6 cards eagerly with `fetchpriority=high`.<br>• Change the "built by hand" copy and the "© All rights reserved" ImageObject license unless the pieces really were built and are really yours. | Image block (899 impr, 0 clicks); Videos and Reddit modules; "dice art ideas / images" |
| F2 | HIGH | `/` | **Put a real upload drop zone in the hero** (`<input type=file>`). On desktop it goes in the right column with the lens demo; on mobile it goes under "Start creating". The photo hands straight into the editor's crop step. Add one line beside it: "Free: preview, exact black/white dice counts, PNG download, first 5 rows of the builder. No sign-up." On mobile, add a small before/after thumbnail above the fold. | Tool 90–100% of generator SERPs; EMD competitors' in-hero upload; "free / online / app" autocomplete |
| F3 | HIGH | `/` + `/dice-art` | **De-duplicate the FAQs.** The homepage FAQ becomes tool and plan questions: "Is Diceify free?", "Can I print the pattern?", "Does it work on my phone?", "Is my photo uploaded?", "What do I get with Creator ($19)?", "Can I build a 100×100 piece?". Definitional questions live only on `/dice-art`. Use the anchor text "dice art generator" when linking to `/` from `/dice-art`, `/gallery` and the blog. | URL rotation on "dice art", "dice art generator", "how to make dice art" |
| F4 | HIGH | `/dice-art` | **Answer first, then the format the SERP rewards:**<br>• A two-sentence answer under the H1 ("A dice portrait is a grid of black and white six-sided dice… a 50×50 piece uses 2,500 dice and is 80 cm wide").<br>• A jump-link TOC.<br>• A "Make your own (free)" button and a real build photo in the first viewport.<br>• The YouTube build video in "How to make your own", with VideoObject markup.<br>• Process photos (base, glue, row by row).<br>• A "What to buy" block that covers the kit intent.<br>• A named author (John Mikhail) with a byline. | Videos (7) and Reddit on "how to make dice art"; HowTo-style competitor guide; 0% CTR on "dice portrait" |
| F5 | MEDIUM | `/` | Answer the **comparison** step on the page. Add a short "Why Diceify" strip: what is free, 12-shade black+white mapping, the row-by-row builder that highlights the next die, the mobile builder, and cloud projects. Optionally add an honest `/compare` ("Dice art generators compared") page. Whether to offer a **free printable/PDF pattern for small grids** is the user's call; it is the gap the competitor review names. | "best dice art generator (free)"; competitor listicle rates Diceify 3/5 |
| F6 | MEDIUM | titles/snippets | See below. | |
| F7 | LOW | `/editor` | Keep it indexable (it gets real landings), but don't optimise it for "generator". Optionally add a static, crawlable 3-step intro and a "what's free" line above the app shell. | `/editor` pos 28 competing with `/` |
| F8 | LOW | all | Bring `/blog/why-i-built-diceify` into the index: it holds the only build photo and video. Link it from `/dice-art` and `/gallery`, then request indexing. | Trust gap across all personas |

**Titles and snippets aimed at the actual SERP** (keep each under ~60 characters / ~155 characters):
- `/`. Title: `Free Dice Art Generator: Photo to Dice Portrait | Diceify`. Meta: `Upload a photo, get a dice portrait in seconds: exact black & white dice counts, finished size and a row-by-row build guide. Free, no sign-up.`
- `/dice-art`. Title: `Dice Art Guide: How Many Dice, Size Chart & How to Make It`. Meta: `A 50×50 dice portrait uses 2,500 dice and is 80 cm wide with 16 mm dice. Size chart, which dice and glue to use, build time, plus a free pattern generator.`
- `/gallery`. Title: `Dice Art Ideas: Portraits & Mosaics with Dice Counts | Diceify`. Meta: `Real dice portraits of kids, couples, pets and icons, each with its grid, black/white dice count and finished size. Pick one and make your own, free.`

---

## 8. SXO Gap Score (per page, 100 points; separate from SEO Health)

| Dimension | `/` (generator intent) | `/dice-art` (how-to / "dice art") | `/gallery` (inspiration / image) | `/editor` (tool URL) |
|---|---|---|---|---|
| Page type (15) | 10: landing page, tool one click away | 12: hybrid guide fits mixed tool+how-to | 6: thin collection vs inspiration/real-build intent | 13: is the tool |
| Content depth (15) | 11: 722 words, FAQ, pricing | 12: 1,223 words, size table, glue, FAQ | 2: 46–67 words | 2: 51 words to crawlers |
| UX signals (15) | 10: CTA above fold; no upload; mobile hero without visual; TTI 9.9 s (mobile, lab) | 8: no CTA/TOC/image in viewport; underline a11y fail | 5: LCP 6.1 s (lazy LCP); no CTA | 10: app works, no sign-up |
| Schema (15) | 12: WebSite, Org, WebApplication+Offer, FAQPage, ImageGallery; no `sameAs` | 13: Article, FAQ, HowTo, Breadcrumb; no VideoObject | 11: ImageGallery (13 ImageObject, license fields) | 9: WebApplication |
| Media (15) | 9: 47 images + interactive lens demo; no video, no real-build photo | 7: 7 images, renders + 3 comparison images; no video | 7: 13 renders, no photos, no srcset | 2 |
| Authority (15) | 7: "5,000+ creators", 2 stories; no reviews; rated 3/5 by competitor | 7: no author; Jeremy anecdote | 3: "built by hand" claim unsupported | 3 |
| Freshness (10) | 6: revamp live 10-02; blog cards dated 2023/2024 | 9: updated 2026-10-03 | 3: no date, 2024 assets | 5 |
| **SXO Gap Score** | **65** | **68** | **37** | **44** |

---

## 9. Limitations

- **Google's own SERP could not be observed.** google.com returned an error page to the fetcher (with and without `gbv=1`), Startpage was blocked and DuckDuckGo returned a CAPTCHA. Page-type mix comes from **Brave Search (live)**, the WebSearch tool and **live Google Autocomplete**. Google's AI Overview, image block, PAA, shopping ads and desktop vs mobile layouts are **not verified**. The image-block reading of /gallery is an inference from GSC (fixed position, 0 clicks).
- No direct GSC/GA4/PostHog access from this agent. Query→page numbers come from `data/CONTEXT.md` and `findings/google.md`. The device-funnel hypotheses (§4 #2–3) need the validation queries listed there.
- There is no Chromium, so pages were fetched with `render_page.py --mode never` (raw HTML; marketing pages are static, so this matches what users get). `/editor`'s in-app UX was not exercised. The screenshots are single-viewport Lighthouse captures.
- Ranking history reflects the **pre-revamp site** (cutover 2026-10-02); the page judgments are of the new site.
- Persona weights and scores are analyst estimates, not measured.

Cross-skill follow-ups:
- `/seo content`: E-E-A-T (author bylines, real build photos).
- `/seo schema`: VideoObject, per-item ImageObject captions, Organization `sameAs`.
- `/seo page /gallery`: thin content.
- No local intent was found, so `/seo local` is not needed.

Generate a PDF report? Use `/seo google report`.

---

## 10. Structured findings (for audit-data.json → "Search Experience")

```json
{
  "category": "Search Experience",
  "sxo_gap_scores": {"/": 65, "/dice-art": 68, "/gallery": 37, "/editor": 44},
  "serp_consensus": {
    "dice art generator": {"dominant": "Tool", "confidence": 0.9, "diceify_type": "Landing", "mismatch": "MEDIUM (HIGH desktop)"},
    "dice mosaic generator": {"dominant": "Tool", "confidence": 1.0, "diceify_type": "Landing", "mismatch": "MEDIUM"},
    "photo to dice art": {"dominant": "Tool", "confidence": 0.7, "diceify_type": "Landing", "mismatch": "MEDIUM"},
    "dice portrait": {"dominant": "Tool", "confidence": 0.5, "diceify_type": "Landing + Guide", "mismatch": "MEDIUM"},
    "dice art": {"dominant": "Fractured (Product/Tool/UGC)", "confidence": 0.3, "diceify_type": "Landing + Gallery + Guide", "mismatch": "HIGH for /gallery"},
    "how to make dice art": {"dominant": "Tool+Guide (video-heavy)", "confidence": 0.71, "diceify_type": "Landing shown instead of Guide", "mismatch": "MEDIUM"},
    "dice painting": {"dominant": "Forum how-to (painting dice)", "confidence": 0.6, "mismatch": "HIGH - deprioritise"},
    "dice art kit": {"dominant": "Product + Shopping", "confidence": 0.4, "mismatch": "HIGH - deprioritise"},
    "picture dice": {"dominant": "Stock images / Tool split", "confidence": 0.5, "mismatch": "HIGH - deprioritise"}
  },
  "findings": [
    {"id": "SXO-1", "severity": "High", "page": "/gallery", "title": "Gallery is a thin render collection; demand is image/inspiration (real builds)", "evidence": "dice art -> /gallery pos 6.0, 899 impr, 0 clicks; 46-67 words; 13 renders, no build photos; LCP 6.1 s mobile", "fix": "Rebuild as 'Dice art ideas & real builds' with build photos/video, per-item grid/dice/size captions, 'Make one like this' links, eager first row"},
    {"id": "SXO-2", "severity": "Medium", "page": "/", "title": "Homepage is a landing page; generator SERPs are 90-100% tools with in-hero upload", "evidence": "0 file inputs on /; diceartgenerator.io/.com (registered 2026-01-22/23) upload in hero; desktop pos 3.1 (Apr) -> ~21 (Aug/Sep)", "fix": "In-hero drop zone handing off to editor crop step + one-line 'what's free'"},
    {"id": "SXO-3", "severity": "Medium", "page": "/, /dice-art, /gallery, /editor", "title": "Intent cannibalisation drives bimodal desktop rankings", "evidence": "3 URLs rank for 'dice art'; /gallery 6.4 and /editor 28 for 'dice art generator'; 5 of 6 homepage FAQ questions duplicated on /dice-art", "fix": "Tool/plan FAQ on /, definitional FAQ only on /dice-art, 'dice art generator' anchors to /"},
    {"id": "SXO-4", "severity": "Medium", "page": "/dice-art", "title": "Guide lacks first-viewport answer, CTA, TOC, video and real build photos", "evidence": "how-to SERP: 7 videos + Reddit; existing build video z4UUXeYqJZw only in unindexed blog post; 'dice portrait' 267 impr 0% CTR", "fix": "Answer-first intro, TOC, CTA, embed video with VideoObject, process photos, author byline, 'What to buy' block"},
    {"id": "SXO-5", "severity": "Medium", "page": "/", "title": "Comparison step unanswered; free-tier limits unclear vs free 'printable blueprint' competitors", "evidence": "autocomplete 'best dice art generator free'; competitor listicle rates Diceify 3/5 'no PDF export'", "fix": "'Why Diceify' strip; optional /compare page; user decision on free printable pattern for small grids"},
    {"id": "SXO-6", "severity": "Info", "page": "/", "title": "Deprioritise mismatched queries", "evidence": "dice painting 0.4% CTR (painting/re-inking dice SERP); dice art kit = Product+Shopping; picture dice = stock images/classroom templates", "fix": "No new pages; materials list on /dice-art only"},
    {"id": "SXO-7", "severity": "Low", "page": "/gallery", "title": "Trust/rights: renders of third-party photos marked '(c) Diceify All rights reserved' and 'built by hand'", "evidence": "ImageObject copyrightNotice; Afghan Girl, athlete portraits", "fix": "Replace with own/user builds (with permission) or soften the claims"}
  ],
  "desktop_mobile_hypotheses": [
    "New exact-match tool competitors (Jan 2026) with in-hero upload displaced Diceify on desktop 'generator' SERPs",
    "Device-segmented click signals: mobile brand familiarity from TikTok/Instagram (21% CTR at pos 3) vs desktop comparison shoppers hitting the export gate",
    "URL rotation among /, /gallery, /editor on desktop (bimodal days)",
    "More SERP modules on desktop (unverified)",
    "Slide occurred on the pre-revamp site; re-measure 4-6 weeks after 2026-10-02"
  ]
}
```

## Sources
- Brave Search SERPs (fetched 2026-10-03): https://search.brave.com/search?q=dice+art, …q=dice+art+generator, …q=dice+portrait, …q=dice+mosaic+generator, …q=how+to+make+dice+art, …q=dice+painting, …q=dice+art+kit, …q=picture+dice, …q=photo+to+dice+art
- Google Autocomplete: https://suggestqueries.google.com/complete/search?client=firefox&q=…
- Competitors: https://diceartgenerator.io/, https://diceartgenerator.io/blog/how-to-make-dice-art/, https://diceartgenerator.com/, https://www.diceart.me/, https://diceideas.com/, https://dicemaniax.com/pages/dice-art-generator, https://www.kickstarter.com/projects/1476154118/picdice
- Build video: https://www.youtube.com/watch?v=z4UUXeYqJZw
