# Content Architecture: Semantic Topic Clusters (diceify.art)

Agent: seo-cluster · Date: 2026-10-03 · Inputs: `data/CONTEXT.md` (GSC/GA4), saved HTML in `data/raw/`, 20 WebSearch SERP pulls (14 used in the matrix), 2 competitor page fetches (diceartgenerator.io/blog, diceart.me buyer's guide), repo (`features/marketing/blog/data.ts`, `core/dice/document.schema.ts`).

## TL;DR

- **Demand is mostly tool intent, and `/` already wins it.** "dice art generator", "dice mosaic generator", "photo to dice art", "dice portrait" and the head term "dice art" are all answered by the same 4–5 tool homepages (diceify.art/, diceart.me/, diceartgenerator.com/.io, diceideas.com). Keep **`/` as the only page aimed at "generator" queries**. Don't write new pages for these. They would cannibalize `/`.
- **The long-tail "plan / buy / build" questions are unowned.** The SERPs for dice count/size, bulk dice cost, glue and printable patterns contain **zero dice-art pages** apart from one diceart.me buyer's guide. Google fills them with dice-probability calculators, generic tile-mosaic glue pages and paper fold-up dice. Search volume is small (GSC: "how to make dice art" is about 100 impressions in 6 months). The payoff is mainly **AI-answer citations** (ChatGPT already quotes /dice-art numbers word for word), topical depth against diceartgenerator.io, and builder conversions.
- **Architecture:** three hubs. `/dice-art` is the informational pillar, `/` is the tool/commercial hub and `/gallery` is the inspiration hub. Under them sit 4 clusters with **9 new pages**: 6 to write first, 3 later. The 2 existing blog posts get absorbed into the clusters.
- **Don't chase:** "dice art kit" (shopping), "dice painting" (re-inking RPG dice), "picture dice" (stock photos and photo dice), "dice template pdf" (paper dice), "art dice" (prompt-dice products), "dicify" (unrelated brands), "custom dice portrait" (commissions), and AI "dice image generators".

## 1. Method and caveats

- SERPs came from the WebSearch tool, which is **not Google**. It returns about 9–10 results per query. `standard` mode returned off-topic results for the head terms (museum-shop "Art Dice" products), so the matrix uses the `extended` mode pulls. Treat the overlap scores as **directional**. Run DataForSEO/Google SERPs before you commit budget beyond the first 6 spokes.
- No keyword-volume tool was available. Relative demand comes from GSC impressions in CONTEXT.md.
- URLs were normalized to host+path. Domain overlap is also shown, because in a niche this small the same 4–5 dice-art domains make up the entire relevant universe.
- **The methodology threshold doesn't fit this niche.** It requires a spoke to share 4+ URLs with its cluster peers. Every long-tail SERP here is a content vacuum (0–1 dice-art URLs), so overlap can neither confirm nor reject a grouping. Long-tail spokes are grouped by **intent plus the order of the build task** (plan → buy → build → finish), and the head terms by GSC landing-page data.

## 2. SERP overlap matrix (shared top-10 URLs; diagonal = 10)

| Key | Keyword (SERP pulled) | Diceify URLs in SERP |
|---|---|---|
| K1 | dice art generator (online free photo) | `/`, `/editor` |
| K2 | how to make dice art | `/`, `/dice-art` |
| K3 | dice art | `/` |
| K4 | dice portrait | `/`, `/dice-art` |
| K5 | dice mosaic generator | `/` |
| K6 | best dice art generator | `/` |
| K7 | dice art ideas / famous dice portraits | `/`, `/dice-art`, `/gallery` |
| K8 | how many dice for dice art (size calculator) | none (SERP = dice-probability calculators + diceart.me buyer's guide + diceartgenerator.com) |
| K9 | bulk 16 mm dice for dice art (cost) | none (SERP = dice retailers + diceart.me buyer's guide) |
| K10 | best glue for dice art | none (SERP = generic tile/glass mosaic glue) |
| K11 | dice art kit | none (SERP = Etsy, Amazon, Michaels, Kickstarter PicDice) |
| K12 | dice painting | `/` (SERP = re-inking RPG dice, paint-by-numbers) |
| K13 | picture dice | none (SERP = stock photos, custom photo dice) |
| K14 | dice art template / pattern pdf | none (SERP = printable paper fold-up dice) |

```
URL overlap   K1  K2  K3  K4  K5  K6  K7  K8  K9 K10 K11 K12 K13 K14
K1  generator 10   2   2   2   3   2   1   1   0   0   0   1   1   0
K2  how-to     2  10   3   3   3   2   2   0   0   0   0   1   1   0
K3  dice art   2   3  10   2   3   2   1   0   0   0   0   2   1   0
K4  portrait   2   3   2  10   2   2   3   0   0   0   0   1   0   0
K5  mosaic gen 3   3   3   2  10   3   1   1   0   0   0   1   1   0
K6  best gen   2   2   2   2   3  10   1   1   0   0   0   1   0   0
K7  ideas      1   2   1   3   1   1  10   0   0   0   0   1   0   0
K8  how many   1   0   0   0   1   1   0  10   1   0   0   0   0   0
K9  bulk dice  0   0   0   0   0   0   0   1  10   0   0   0   0   0
K10 glue       0   0   0   0   0   0   0   0   0  10   0   0   0   0
K11 kit        0   0   0   0   0   0   0   0   0   0  10   0   0   0
K12 painting   1   1   2   1   1   1   1   0   0   0   0  10   0   0
K13 picture    1   1   1   0   1   0   0   0   0   0   0   0  10   0
K14 template   0   0   0   0   0   0   0   0   0   0   0   0   0  10
```
Domain-level overlap among K1–K6 is 2–4. All of it comes from diceify.art, diceart.me, diceartgenerator.com/.io and diceideas.com.

**How to read the matrix:**
- **K1/K3/K5 (+ "photo to dice art"): one target, `/`.** They score 2–3 at URL level ("interlink"), but every shared URL is a tool homepage, and GSC shows `/` ranking for all of them (positions 2.9–4.4 on mobile). Treat them as "same post".
- **K2 how-to and K4 portrait** are the only head-ish queries where `/dice-art` also appears. `/dice-art` owns "how to make dice art", "what is dice art" and "dice artwork".
- **K6 "best dice art generator" (2–3 with K1/K5) means interlink, not merge.** It's a comparison modifier with mixed SERPs (vondy/nightcafe AI image tools plus generator homepages). diceartgenerator.io runs `/blog/best-dice-art-generators/`, which rates Diceify 3/5. It needs its own page, linked from `/`.
- **K7 ideas (3 with K4)** belongs to `/gallery`, which already shows up in this SERP.
- **K8–K10:** 0–1 overlap with everything, and almost no dice-art URLs. These are separate spokes in a vacuum, and also the questions CONTEXT lists as unowned.
- **K11–K14:** 0–2 overlap, and the intent doesn't match (shopping, re-inking, stock photos, paper dice). Exclude them (see §6).

## 3. Keyword universe and intent (50 variants; navigational excluded from clustering)

| # | Keyword | Intent | Assigned to |
|---|---|---|---|
| 1–9 | dice art generator · dice mosaic generator · photo to dice art · dice art maker · dice portrait generator · dice art generator free/online · turn photo into dice art · dice art creator/app · dice art converter | Tool (transactional) | `/` |
| 10 | dice art (head) | Mixed: tool + inspiration + "art dice" products | `/` primary, `/dice-art` secondary |
| 11 | dice portrait | Mixed: tool + news + commissions | `/` (GSC m pos 3.4) |
| 12 | diceify / dicefy | Navigational | excluded (pos 1) |
| 13–19 | what is dice art · how to make dice art · how does dice art work · dice artwork · dice art vs pixel art · black and white dice art · how long does dice art take | Informational (broad/how) | `/dice-art` pillar (the build-time question also goes to S6) |
| 20–24 | how many dice for dice art · dice art size/dimensions · dice per square foot · how heavy is dice art · dice art grid size | Informational (planning) | **S1** size calculator |
| 25–26 | best photos for dice art · dice art photo tips | Informational (how) | **S3** best photos |
| 27–32 | what size dice for dice art · best dice for dice art · bulk 16 mm dice · how much does dice art cost · dice art supplies · (dice art kit, as one H2 only) | Commercial-investigational | **S2** buying dice |
| 33–35 | best glue for dice art · how to glue dice to a board · dice art resin | Informational (how) | **S4** glue and build |
| 36 | how to frame / hang dice art | Informational (how) | **S5** frame and hang |
| 37 | dice art build log / timelapse / how long | Informational (experience) | **S6** build log |
| 38–39 | best dice art generator · diceartgenerator / Dice Art Studio alternative | Commercial (compare) | **S7** comparison |
| 40 | dice art contrast / settings / resolution | Informational (concept) | **S9** settings explained |
| 41 | dice art ideas · dice art examples · dice portrait examples | Inspiration | `/gallery` |
| 42 | famous dice art · dice portrait artist · Dice Ideas tiger / Tobias Wong | Inspiration (informational) | **S8** famous dice art |
| 43 | dice portrait gift | Inspiration / commercial | `/blog/jeremy-dice-portraits-nieces` (existing) |
| 44–50 | dice art kit · dice painting · picture dice · dice template pdf · art dice · dicify · custom dice portrait (commission) · AI dice image generator | Off-intent | **do not chase** (§6) |

## 4. Architecture: three hubs, four clusters, nine new pages

```
                         /  (TOOL HUB: dice art generator, photo to dice art, dice mosaic generator, dice portrait)
                         |---- C3 Tools & settings: S7 best generators compared · S9 settings explained
                         |
 /dice-art (PILLAR: what is / how to make dice art)
   |---- C1 Plan your piece:  S3 best photos · S1 size calculator · S2 buying dice
   |---- C2 Build & finish:   S4 glue & build · S5 frame & hang · S6 build log (blog)
                         |
 /gallery (INSPIRATION HUB: dice art examples/ideas)
   |---- C4 Inspiration & stories: S8 famous dice art (new) · Jeremy's nieces (existing) · Why I Built Diceify (existing)
```
URL convention: put evergreen guides under `/dice-art/<slug>` (breadcrumb Home › Dice Art Guide › X, schema `isPartOf` the pillar). Stories and case studies go under `/blog/<slug>`. This needs a `dice-art/[slug]` route next to the existing `blog/[slug]`. That's an implementation choice for the user.

### New spokes, in priority order (first six = do now)

| Pri | ID | Title (working) | URL | Primary / secondary queries | Intent → template | Words | Numbers and facts to own |
|---|---|---|---|---|---|---|---|
| 1 | S1 | Dice Art Size Calculator: How Many Dice, How Big, How Heavy | `/dice-art/size-calculator` | how many dice for dice art · dice art size · dice per square foot · dice art weight · 50×50 dice portrait size | Info (planning) → `explainer` + static calculator tables | 1,300–1,600 | Dice per sq ft **363 @16 mm, 645 @12 mm, 929 @10 mm** (per m²: 3,906 / 6,944 / 10,000). Size tables for **all 5 editor aspect ratios** (1:1, 3:4, 4:3, 2:3, 16:9) across 20–120 rows, e.g. 45×60 = 2,700 dice = 72×96 cm at 16 mm. **Weight**: dice-only estimate 2,500 × ~4.5 g ≈ 11 kg (25 lb) at 16 mm, about 4.8 kg at 12 mm, plus board (18 mm ply 80×80 cm ≈ 6 kg). **Weigh 100 of your own dice before publishing** and print the measured gram figure, since first-party data is the citable asset. Frame allowance. Black:white split varies by photo (homepage example: 4,564 black / 2,135 white, about 68/32). |
| 2 | S2 | Buying Dice for Dice Art: Which Size, Where to Buy in Bulk, What It Costs | `/dice-art/buying-dice` | best dice for dice art · what size dice for dice art · bulk 16 mm dice · how much does dice art cost · dice art supplies | Commercial-investigational → `explainer` (buyer's guide) | 1,400–1,800 | 16 vs 12 vs 10 mm trade-off. Pips not numerals. One batch per color, because size and pip style vary. Size tolerance (game vs precision dice; diceart.me claims ±0.5 vs ±0.1 mm, verify). Dated price snapshot per 1,000 (e.g. a 1,000-pc 16 mm bag at about $106 was seen, verify at writing). **Total cost table by grid size.** Spares %. An "**Is a dice art kit worth it?**" H2 that compares a kit (e.g. PicDice 2,000+ dice) with DIY cost, which picks up informational kit queries without a kit page. |
| 3 | S4 | How to Glue Dice Art: Adhesives, Boards and Two Build Methods | `/dice-art/how-to-glue-dice-art` | best glue for dice art · how to glue dice to wood · dice art resin · dice art board | Info (how) → `how-to` | 1,300–1,700 | Adhesive table (PVA/Weldbond, wood glue, E6000, epoxy, construction adhesive like Liquid Nails, resin flood coat): open time, cure, clear-drying, cleanup, risk. Board choice and thickness vs weight. **Diceify's own resin-clouding failure** (already mentioned on /dice-art) as first-hand evidence. Dry-lay vs glue-as-you-go. Jeremy's 2×4 bracing. |
| 4 | S7 | Best Dice Art Generators Compared (2026) | `/best-dice-art-generators` | best dice art generator · dice art generator comparison · diceartgenerator alternative · Dice Art Studio alternative | Commercial (compare) → `comparison` | 1,500–1,800 | Feature matrix with the date checked: shades/color modes, max grid (Diceify 20–120 rows), aspect ratios, step-by-step builder, export formats (**be honest that Diceify has no PDF**, SVG blueprints are paid), price, sign-up, mobile. Cover diceartgenerator.io/.com, diceart.me, Dice Art Studio (itch.io, Windows, up to 512×512), DiceMosaic (Android), lmarzen/dice-mosaic (CLI). Disclose that you're the maker, and name when a competitor is the better fit. This answers the 3/5 rating on the query instead of leaving the narrative to diceartgenerator.io. |
| 5 | S3 | Best Photos for Dice Art: Pick, Crop and Tune a Photo That Reads in Dice | `/dice-art/best-photos` | best photos for dice art · dice art photo tips · what pictures work for dice art | Info (how/list) → `listicle` | 1,200–1,500 | Before/after grids from the actual generator: tight vs loose crop, high vs low contrast, busy vs plain background, 30 vs 60 vs 100 rows, color mode both vs black. Why low resolution is fine (area averaging). Competitor parity: diceartgenerator.io has the same post. |
| 6 | S6 | Building a 50×50 Dice Portrait: 2,500 Dice, Hours, Cost and Weight (Build Log) | `/blog/50x50-dice-portrait-build-log` | dice art build · how long does dice art take · dice portrait timelapse | Info (experience) → `how-to` (case study) | 1,200–1,800 + photos/video | **Measured** hours, dice/hour, $ spent, kg, glue used, mistakes. This is the first-party source that S1/S2/S4/S5 cite. **Measure first (week 1), publish when done.** Named author, dated, photos of each stage. |
| 7 | S5 | How to Frame and Hang Dice Art | `/dice-art/framing-and-hanging` | how to hang dice art · dice art frame · dice art mounting | Info (how) → `how-to` | 1,200–1,400 | Weight → hardware (French cleat / Z-bar ratings). Frame/shadow-box depth = die (16 mm) + board (6–18 mm) + clearance. Glazing or not. Dusting. |
| 8 | S8 | Famous Dice Art: The Artists and Portraits Behind the Trend | `/blog/famous-dice-art` | famous dice art · dice portrait artist · dice ideas portraits | Inspiration (informational) → `listicle` | 1,200–1,500 | Dice Ideas (Ben Hoblyn & Ross Montgomery, 30,000-dice tiger), Tobias Wong portrait (13,138 dice, one per day he lived), Mauricio Jojoa (Sonoma County Fair Best of Show), plus a "make your own" bridge to /gallery and the editor. Describe and link to the artists' work. Don't re-host their images. |
| 9 | S9 | Dice Art Settings Explained: Grid Size, Contrast, Gamma, Sharpening, Color Mode | `/dice-art/settings-explained` | dice art contrast · dice art resolution · dice art grid size | Info (concept) → `explainer` | 1,200–1,500 | The pipeline in plain words (grayscale → area-average → sharpen → gamma → contrast → 12-shade map, from `core/README.md`). Visual of each slider's effect. Ranges (rows 20–120, gamma 0.5–1.5). Doubles as the "limited customization" rebuttal for S7. |

### Existing pages: role and required changes

| Page | Role | Target queries | Changes |
|---|---|---|---|
| `/` | Tool hub (money page) | dice art generator, photo to dice art, dice mosaic generator, dice portrait, dice art | **Only page that uses "generator" in title, H1 and internal anchors.** All generator anchors sitewide point here, never to `/editor`. That's a mild fix for the bimodal desktop "dice art generator" ranking (a weaker page surfaces some days). FAQ "How many dice?" → S1. FAQ "How long?" → S6. Footer "Guides" column → /dice-art, S1, S2, S4, S7. |
| `/dice-art` | Informational pillar | what is dice art, how to make dice art, dice artwork, black and white dice art | Keep the numbers AI already quotes. Add a ToC and one 120–200-word summary per cluster, each linking its spokes (mandatory links in §7). Trim "What size dice" and FAQ "bulk" to summaries that hand off to S2. Grow from about 1,200 to **2,200–2,800 words**. That's still below the 2,500–4,000 spec's upper range, which is fine for a niche pillar; don't pad. Add `ItemList` of cluster pages (seo-schema). |
| `/gallery` | Inspiration hub | dice art examples, dice art ideas, dice portrait examples | From 67 words to about 300–500. Add a 150–250-word intro and a **data caption per piece** (grid W×H · N dice · black/white counts · X×Y cm at 16 mm · color mode), which turns 13 images into citable facts. Add "Make one like this" → editor, plus links to S1, S3, S8. GSC: 5.7k impressions at 0.35% CTR suggests image-led queries. Captions help both. |
| `/blog` | Stories hub | (none, sitelink only) | List S6 and S8 when they ship. One intro line linking the pillar. |
| `/blog/jeremy-dice-portraits-nieces` | C4 member + C2 bridge | dice portrait gift | Add 3–4 contextual links (pillar, S4 at "Liquid Nails", S2, /gallery). It currently links only /blog and /editor. |
| `/blog/why-i-built-diceify` | C4 member + brand/E-E-A-T | Diceify story | "Discovered – not indexed". Add contextual inbound links (S7 disclosure, pillar "Further reading" already). Add outbound links to /, the pillar and S7 ("frustration with existing tools"). |
| `/editor` | App | none | Unchanged. CTA buttons can target it, but text anchors with "generator" go to `/`. |

## 5. Product and content gaps that aren't spokes (open for the user)

- **PDF export** and **templates** are product decisions. The competitor scores Diceify down for "no PDF export". Content can't fix that, so S7 should say it plainly. Ready-made "templates" (famous portraits that open in the editor) would be a gallery feature, not an article. Flag them only, and don't scope them in.
- **Interactive calculator on S1:** static tables are enough to rank and get cited. A small client widget is optional, so ask first.
- **"Dicify" confusion:** the "dicify" SERP has no dice-art intent at all (RPG stat-block tool, DICEOMANCER card, AliExpress store, Gant Laborde's TF.js book). The confusion lives in AI answers, not Google. Handle it with entity signals (Organization `sameAs`, llms.txt) rather than content. No page.

## 6. Queries NOT to chase

| Query | SERP evidence | Why not | What to do instead |
|---|---|---|---|
| dice art kit | Etsy market pages, Amazon/Michaels 20-sided wood kit, Kickstarter PicDice, q-workshop; 0 overlap with any other keyword | Shopping intent for physical products Diceify doesn't sell | One H2 in S2, "Is a dice art kit worth it?" (DIY vs kit cost) |
| dice painting | Re-inking RPG dice (SkullSplitter, Dice Dragons, BGG), paint-by-numbers, Art Dice prompts, 1stdibs | Different craft. `/` appears only incidentally | Nothing |
| picture dice | Shutterstock/iStock/Unsplash/Adobe, custom photo-printed dice, Bầu cua cá cọp | Stock photos and photo-dice products | Nothing |
| dice art template / pattern pdf / printable dice template | Paper fold-up dice templates (timvandevall, pacdora, templateroller) | Paper cube templates, not mosaic patterns | If templates ever ship as a product, target "dice art patterns" on the gallery, not "template pdf" |
| art dice | Museum-shop prompt dice (Two Tumbleweeds), pollutes the "dice art" head SERP | Product name collision | Nothing; the head term is still won by `/` |
| dicify | RPG tool, game card, AliExpress store | Unrelated brands | Entity signals only (§5) |
| custom dice portrait (commission) | Etsy listing, Dice Ideas commissions | Buyers want a finished piece | Optional "DIY gift" angle already covered by Jeremy's post |
| AI dice art / dice image generator | vondy, nightcafe, promeai | AI image generation, not buildable mosaics | Nothing; S7 can note the difference in one line |

## 7. Cannibalization check

| Pair | Risk | Resolution |
|---|---|---|
| `/` vs `/dice-art` on "dice art" | Medium. Both get impressions; /dice-art has 6.4k impressions at 0.76% CTR | `/` = tool ("generator", "photo to dice art"). `/dice-art` = guide ("what is", "how to make"). The /dice-art title/H1 must never say "generator". Generator anchors go to `/` only |
| `/` vs `/editor` on "dice art generator" (desktop bimodal) | Medium | `/editor` title already has no "generator". Point every "dice art generator" text link at `/`. Don't noindex `/editor` (297 organic landings) |
| `/` vs S7 | Low (K1–K6 overlap 2) | S7 is keyed to "best … generators / compared / alternatives" |
| `/dice-art` "How many dice" section vs S1 | Medium | Pillar keeps the summary table (already AI-quoted) plus a link. S1 holds aspect ratios, weight, frames and per-m² figures. S1 primary = "how many dice for dice art", pillar primary = "what is dice art" |
| `/dice-art` "What size dice" + bulk FAQ vs S2 | Low–medium | Pillar summary in 2–3 sentences, then hand off to S2 |
| S1 vs S2 (both mention 16/12 mm) | Low | S1 = output (how big/heavy for a die size). S2 = input (which die to buy, where, cost) |
| S4 vs S5 | Low | S4 ends at "glued board". S5 starts at "finished board on the wall" |
| S6 vs S4/S1 | Low | S6 is a dated first-person case study (experience). Spokes cite it as their data source |
| `/gallery` vs S8 on "dice art ideas" | Low–medium (K7 SERP shows /gallery) | Gallery owns "dice art examples/ideas" (Diceify-made pieces). S8 owns "famous dice art / dice artists" (third-party artists) |
| S3 vs S9 | Low | S3 = choosing and cropping the photo. S9 = what the sliders do |

No two pages share a primary keyword. Result: **0 conflicts** once the anchor rule above is applied.

## 8. Internal link matrix (adjacency list)

Existing navbar/footer links (/, /dice-art, /gallery, /blog, /editor) aren't repeated here. All links are **contextual body links** unless the placement says otherwise. Place mandatory links in the first relevant body section, not only in a "related" box.

| # | From | To | Anchor text | Type | Placement |
|---|---|---|---|---|---|
| 1 | `/dice-art` | `/dice-art/size-calculator` | dice art size calculator | mandatory | 'How many dice…' section, under the table |
| 2 | `/dice-art` | `/dice-art/buying-dice` | buying dice for dice art | mandatory | 'What size dice…' section + FAQ 'Where can I buy dice in bulk?' |
| 3 | `/dice-art` | `/dice-art/best-photos` | how to pick a photo for dice art | mandatory | Step 1 'Pick your image' |
| 4 | `/dice-art` | `/dice-art/how-to-glue-dice-art` | how to glue dice art | mandatory | Step 4 'Glue and build' |
| 5 | `/dice-art` | `/dice-art/framing-and-hanging` | framing and hanging dice art | mandatory | new short 'Finish and hang' paragraph after step 4 |
| 6 | `/dice-art` | `/blog/50x50-dice-portrait-build-log` | our 50×50 build log | mandatory | FAQ 'How long does it take to build?' |
| 7 | `/dice-art` | `/best-dice-art-generators` | dice art generators compared | mandatory | 'How it works' section (after 'A dice art generator does the matching…') |
| 8 | `/dice-art` | `/blog/famous-dice-art` | famous dice art | mandatory | 'What is dice art?' (one line on Dice Ideas / Tobias Wong) |
| 9 | `/dice-art` | `/dice-art/settings-explained` | what each setting does | mandatory | Step 2 'Generate the pattern' |
| 10 | `/dice-art/size-calculator` | `/dice-art` | complete dice art guide | mandatory | intro |
| 11 | `/dice-art/buying-dice` | `/dice-art` | how dice art works | mandatory | intro (12 shades → why black AND white) |
| 12 | `/dice-art/best-photos` | `/dice-art` | dice art guide | mandatory | intro |
| 13 | `/dice-art/how-to-glue-dice-art` | `/dice-art` | step-by-step dice art guide | mandatory | intro |
| 14 | `/dice-art/framing-and-hanging` | `/dice-art` | dice art guide | mandatory | intro |
| 15 | `/blog/50x50-dice-portrait-build-log` | `/dice-art` | how to make dice art | mandatory | intro |
| 16 | `/best-dice-art-generators` | `/` | Diceify's free dice art generator | mandatory | Diceify row of the comparison table |
| 17 | `/best-dice-art-generators` | `/dice-art` | how dice art generators work | recommended | 'How we compared' section |
| 18 | `/dice-art/settings-explained` | `/` | dice art generator | mandatory | intro |
| 19 | `/dice-art/settings-explained` | `/dice-art` | brightness mapping | recommended | grid-size section |
| 20 | `/blog/famous-dice-art` | `/gallery` | dice art gallery | mandatory | closing section |
| 21 | `/blog/famous-dice-art` | `/dice-art` | what dice art is and how it works | recommended | intro |
| 22 | `/` | `/best-dice-art-generators` | compare dice art generators | recommended | footer 'Guides' column (not body) |
| 23 | `/gallery` | `/blog/famous-dice-art` | famous dice art | mandatory | intro paragraph |
| 24 | `/dice-art/best-photos` | `/dice-art/size-calculator` | choose a grid size | recommended | 'Crop tighter than you think' section |
| 25 | `/dice-art/best-photos` | `/dice-art/settings-explained` | contrast and gamma settings | recommended | 'Tune before you commit' section |
| 26 | `/dice-art/size-calculator` | `/dice-art/buying-dice` | how many dice to buy | recommended | 'Black vs white counts' section |
| 27 | `/dice-art/size-calculator` | `/dice-art/framing-and-hanging` | hanging a heavy dice portrait | recommended | weight table |
| 28 | `/dice-art/size-calculator` | `/dice-art/best-photos` | photos that read well in dice | recommended | 'Pick the grid for the photo' section |
| 29 | `/dice-art/buying-dice` | `/dice-art/size-calculator` | dice count and size calculator | recommended | 'How many to order' section |
| 30 | `/dice-art/buying-dice` | `/dice-art/how-to-glue-dice-art` | glue and board | recommended | 'What else you need' section |
| 31 | `/dice-art/how-to-glue-dice-art` | `/dice-art/buying-dice` | which dice to buy | recommended | materials list |
| 32 | `/dice-art/how-to-glue-dice-art` | `/dice-art/framing-and-hanging` | frame and hang it | recommended | closing |
| 33 | `/dice-art/how-to-glue-dice-art` | `/blog/50x50-dice-portrait-build-log` | full 50×50 build log | recommended | 'Dry-lay vs glue-as-you-go' (first-hand result) |
| 34 | `/dice-art/framing-and-hanging` | `/dice-art/size-calculator` | weight table | recommended | 'How heavy is it?' |
| 35 | `/dice-art/framing-and-hanging` | `/dice-art/how-to-glue-dice-art` | board and adhesive | recommended | 'Mounting depends on the board' |
| 36 | `/blog/50x50-dice-portrait-build-log` | `/dice-art/size-calculator` | size calculator | recommended | 'Planning' section |
| 37 | `/blog/50x50-dice-portrait-build-log` | `/dice-art/buying-dice` | where we bought the dice | recommended | 'Cost' section |
| 38 | `/blog/50x50-dice-portrait-build-log` | `/dice-art/how-to-glue-dice-art` | glue we used | recommended | 'Gluing' section |
| 39 | `/blog/50x50-dice-portrait-build-log` | `/dice-art/framing-and-hanging` | how we hung it | recommended | 'Hanging' section |
| 40 | `/blog/50x50-dice-portrait-build-log` | `/` | turned the photo into a dice pattern | recommended | 'Generating the pattern' section |
| 41 | `/best-dice-art-generators` | `/blog/why-i-built-diceify` | why we built Diceify | optional | Diceify row, 'about this comparison' disclosure |
| 42 | `/best-dice-art-generators` | `/dice-art/settings-explained` | what the settings do | recommended | 'Customization' row/criteria |
| 43 | `/dice-art/settings-explained` | `/best-dice-art-generators` | how Diceify compares to other generators | recommended | closing |
| 44 | `/dice-art/settings-explained` | `/dice-art/best-photos` | choosing the photo | recommended | intro |
| 45 | `/blog/famous-dice-art` | `/blog/jeremy-dice-portraits-nieces` | Jeremy's portraits for his nieces | recommended | 'Make your own' section |
| 46 | `/blog/jeremy-dice-portraits-nieces` | `/dice-art` | dice art guide | recommended | intro |
| 47 | `/blog/jeremy-dice-portraits-nieces` | `/dice-art/how-to-glue-dice-art` | gluing dice to plywood | recommended | where Liquid Nails is mentioned |
| 48 | `/blog/jeremy-dice-portraits-nieces` | `/dice-art/buying-dice` | buying dice in bulk | recommended | materials paragraph |
| 49 | `/blog/jeremy-dice-portraits-nieces` | `/gallery` | more dice portraits | optional | closing |
| 50 | `/blog/why-i-built-diceify` | `/` | free dice art generator | recommended | closing CTA paragraph |
| 51 | `/blog/why-i-built-diceify` | `/best-dice-art-generators` | other dice art tools | recommended | 'frustration with existing tools' paragraph |
| 52 | `/blog/why-i-built-diceify` | `/dice-art` | how dice art works | recommended | Um Kulthum build paragraph |
| 53 | `/gallery` | `/dice-art/size-calculator` | finished size | recommended | caption template 'W×H dice · N dice · X×Y cm at 16 mm' |
| 54 | `/gallery` | `/dice-art/best-photos` | best photos for dice art | recommended | intro paragraph |
| 55 | `/gallery` | `/blog/jeremy-dice-portraits-nieces` | Jeremy's dice portraits | optional | Portraits section |
| 56 | `/` | `/dice-art/size-calculator` | dice art size calculator | recommended | FAQ 'How many dice do I need?' |
| 57 | `/` | `/blog/50x50-dice-portrait-build-log` | a full build, hour by hour | recommended | FAQ 'How long does it take to build?' |
| 58 | `/blog` | `/blog/50x50-dice-portrait-build-log` | (post card) | mandatory | post list |
| 59 | `/blog` | `/blog/famous-dice-art` | (post card) | mandatory | post list |
| 60 | `/blog` | `/dice-art` | the complete dice art guide | recommended | hub intro |
| 61 | `/dice-art/framing-and-hanging` | `/blog/50x50-dice-portrait-build-log` | how we hung our 50×50 | optional | 'Real example' |
| 62 | `/dice-art/buying-dice` | `/blog/50x50-dice-portrait-build-log` | what our 2,500 dice cost | optional | 'Real example' |
| 63 | `/dice-art/size-calculator` | `/blog/50x50-dice-portrait-build-log` | weighed on a real build | optional | weight table note |
| 64 | `/dice-art/best-photos` | `/gallery` | dice art examples | optional | 'What works' section |
| 65 | `/blog/famous-dice-art` | `/dice-art/best-photos` | pick a photo | optional | 'Make your own' |
| 66 | `/best-dice-art-generators` | `/dice-art/best-photos` | photo tips | optional | 'Tips whichever tool you use' |

Inbound contextual links per new page: S1 7 · S2 5 · S3 6 · S4 5 · S5 4 · S6 7 · S7 4 · S8 3 · S9 3 (every spoke has 3 or more). `/blog/why-i-built-diceify` gains 1 new contextual inbound, on top of its existing /blog, homepage and pillar links, which helps its "Discovered – not indexed" status. Anchor diversity: no anchor is more than 40% of a target's inbound links, except `/`, whose exact-match "dice art generator" anchor is deliberate (2 of 4 new). That's acceptable for the money page with its many nav links.

## 9. Pre-delivery validation

| Check | Result |
|---|---|
| No two posts share a primary keyword | PASS (§7) |
| Every spoke has 3 or more planned incoming links | PASS (min 3: S8, S9) |
| Every spoke links to its hub (pillar `/dice-art`; S7/S9 → `/`; S8 → `/gallery`) | PASS |
| Pillar links to every spoke | PASS (9 mandatory links from `/dice-art`) |
| No orphans; everything within 2 clicks of `/` | PASS (/ → /dice-art → spoke; /blog lists S6/S8) |
| Template matches intent | PASS (§4 table) |
| Word counts: spokes 1,200–1,800 | PASS. Pillar 2,200–2,800 sits **below the 2,500 spec floor on purpose**. Raise it only if the cluster summaries need it |
| 2–5 clusters with 2–4 posts each | PASS (C1 3, C2 3, C3 2, C4 3 incl. 2 existing) |
| SERP overlap of 4+ with cluster peers | **NOT MET / not measurable.** Long-tail SERPs are vacuums (0 dice-art URLs), so grouping uses intent and task sequence (§1). Re-verify with Google SERPs (DataForSEO) |

## 10. Structured data

### cluster-plan (schema per hub-spoke-architecture.md; volumes unknown = null)
```json
{
  "version": "2.2.5",
  "seed_keyword": "dice art",
  "created_at": "2026-10-03",
  "pillar": {"title": "Dice Art: Everything You Need to Know", "keyword": "how to make dice art / what is dice art", "volume": null, "template": "ultimate-guide", "wordCount": 2500, "url": "/dice-art", "status": "written"},
  "hubs": [
    {"url": "/", "role": "tool hub", "keywords": ["dice art generator", "photo to dice art", "dice mosaic generator", "dice portrait", "dice art"]},
    {"url": "/gallery", "role": "inspiration hub", "keywords": ["dice art examples", "dice art ideas"]}
  ],
  "clusters": [
    {"name": "Plan your piece", "hub": "/dice-art", "posts": [
      {"id": "S3", "title": "Best Photos for Dice Art", "keyword": "best photos for dice art", "volume": null, "template": "listicle", "wordCount": 1350, "url": "/dice-art/best-photos", "status": "planned", "priority": 5},
      {"id": "S1", "title": "Dice Art Size Calculator: How Many Dice, How Big, How Heavy", "keyword": "how many dice for dice art", "volume": null, "template": "explainer", "wordCount": 1450, "url": "/dice-art/size-calculator", "status": "planned", "priority": 1},
      {"id": "S2", "title": "Buying Dice for Dice Art: Which Size, Where to Buy in Bulk, What It Costs", "keyword": "best dice for dice art", "volume": null, "template": "explainer", "wordCount": 1600, "url": "/dice-art/buying-dice", "status": "planned", "priority": 2}
    ]},
    {"name": "Build & finish", "hub": "/dice-art", "posts": [
      {"id": "S4", "title": "How to Glue Dice Art", "keyword": "best glue for dice art", "volume": null, "template": "how-to", "wordCount": 1500, "url": "/dice-art/how-to-glue-dice-art", "status": "planned", "priority": 3},
      {"id": "S5", "title": "How to Frame and Hang Dice Art", "keyword": "how to hang dice art", "volume": null, "template": "how-to", "wordCount": 1300, "url": "/dice-art/framing-and-hanging", "status": "planned", "priority": 7},
      {"id": "S6", "title": "Building a 50x50 Dice Portrait (Build Log)", "keyword": "how long does dice art take", "volume": null, "template": "how-to", "wordCount": 1500, "url": "/blog/50x50-dice-portrait-build-log", "status": "planned", "priority": 6}
    ]},
    {"name": "Tools & settings", "hub": "/", "posts": [
      {"id": "S7", "title": "Best Dice Art Generators Compared (2026)", "keyword": "best dice art generator", "volume": null, "template": "comparison", "wordCount": 1650, "url": "/best-dice-art-generators", "status": "planned", "priority": 4},
      {"id": "S9", "title": "Dice Art Settings Explained", "keyword": "dice art contrast settings", "volume": null, "template": "explainer", "wordCount": 1350, "url": "/dice-art/settings-explained", "status": "planned", "priority": 9}
    ]},
    {"name": "Inspiration & stories", "hub": "/gallery", "posts": [
      {"id": "S8", "title": "Famous Dice Art: The Artists and Portraits Behind the Trend", "keyword": "famous dice art", "volume": null, "template": "listicle", "wordCount": 1350, "url": "/blog/famous-dice-art", "status": "planned", "priority": 8},
      {"id": "B2", "title": "How I Made Dice Portraits for My Nieces", "keyword": "dice portrait gift", "volume": null, "template": "case-study", "wordCount": 487, "url": "/blog/jeremy-dice-portraits-nieces", "status": "written"},
      {"id": "B1", "title": "Why I Built Diceify", "keyword": "diceify story", "volume": null, "template": "case-study", "wordCount": 495, "url": "/blog/why-i-built-diceify", "status": "written"}
    ]}
  ],
  "links": "see §8 (66 edges)",
  "serp_matrix": {"keywords": ["dice art generator","how to make dice art","dice art","dice portrait","dice mosaic generator","best dice art generator","dice art ideas","how many dice for dice art","bulk dice for dice art","glue for dice art","dice art kit","dice painting","picture dice","dice art template pdf"], "scores": "see §2 matrix", "source": "WebSearch extended (non-Google), directional"},
  "scorecard": {"coverage": 0.86, "linkDensity": 4.1, "orphanPages": 0, "cannibalization": 0, "contentGaps": 5}
}
```
(coverage = 43 of the 50 variants have an assigned page, the 7 excluded don't; linkDensity = 66 edges / 16 pages; contentGaps = the 5 unowned questions: die size, finished size/sq ft, weight, glue/mounting, bulk cost.)

### audit-data.json, "Content Architecture" findings
```json
[
  {"id": "CA-1", "severity": "high", "title": "Unowned planning/buying/build questions (size, dice per sq ft, weight, glue/mounting, bulk cost)", "evidence": "SERPs for these return 0 dice-art pages except one diceart.me buyer's guide; AI answers have quoted Dice Art Studio (itch.io) for dice counts (CONTEXT.md)", "recommendation": "Publish S1 size calculator, S2 buying dice, S4 glue, S5 frame/hang backed by S6 measured build log"},
  {"id": "CA-2", "severity": "high", "title": "No comparison page on 'best dice art generator'; competitor's page rates Diceify 3/5", "evidence": "diceartgenerator.io/blog/best-dice-art-generators/; K6 SERP", "recommendation": "Publish S7 honest comparison (dated feature matrix, discloses maker, admits no PDF export)"},
  {"id": "CA-3", "severity": "medium", "title": "Flat architecture: 4 content pages, blog posts link only to /blog and /editor", "evidence": "data/raw: 11 unique internal links on /, 2 per blog post, gallery 67 words", "recommendation": "Hub-and-spoke: /dice-art pillar (C1, C2), / tool hub (C3), /gallery inspiration hub (C4); 66-edge link matrix"},
  {"id": "CA-4", "severity": "medium", "title": "'dice art generator' anchors/targets split across /, /editor (and pillar)", "evidence": "Desktop ranking bimodal (pos ~3 vs 20-46); /editor ranks pos 28 with 296 impr", "recommendation": "Only / uses 'generator' in title/H1/anchors; all generator text links point to /"},
  {"id": "CA-5", "severity": "medium", "title": "Gallery thin (67 words) with no per-piece data", "evidence": "/gallery 5.7k impr at 0.35% CTR", "recommendation": "Intro + data caption per piece (grid, dice counts, size at 16 mm); links to S1/S3/S8"},
  {"id": "CA-6", "severity": "low", "title": "Off-intent seed terms", "evidence": "dice art kit = shopping; dice painting = re-inking; picture dice = stock photos; template pdf = paper dice; dicify = other brands", "recommendation": "Do not create pages; kit handled as one H2 in S2"},
  {"id": "CA-7", "severity": "info", "title": "SERP-overlap thresholds not verifiable in this niche", "evidence": "Long-tail SERPs contain 0-1 dice-art URLs; WebSearch backend is not Google", "recommendation": "Re-check overlap with Google SERP data before scaling past the first 6 spokes"}
]
```

Sources (SERP and competitor checks): [diceartgenerator.io blog](https://diceartgenerator.io/blog) · [diceartgenerator.io how-to](https://diceartgenerator.io/blog/how-to-make-dice-art/) · [diceart.me buyer's guide](https://www.diceart.me/blogs/best-dice-for-dice-art-buyers-guide) · [diceartgenerator.com](https://diceartgenerator.com/) · [Dice Art Studio](https://myojostudio.itch.io/dice-art-studio) · [lmarzen/dice-mosaic](https://github.com/lmarzen/dice-mosaic) · [Dice Ideas](https://diceideas.com/) · [Fox News on Dice Ideas](https://www.foxnews.com/lifestyle/artist-friends-viral-tiktok-realistic-portraits-made-entirely-dice) · [Make: Tobias Wong portrait](https://makezine.com/?p=15105) · [Bohemian: Mauricio Jojoa](https://bohemian.com/dice-artist-mauricio-jojoa-wins-top-honors/) · [Mr. Chips 1,000-pc 16 mm bag](https://mrchips.net/products/board-game-dice-1-000-pcs-bag) · [Kickstarter PicDice](https://www.kickstarter.com/projects/1476154118/picdice) · [Mosaic Art Supply glues](https://mosaicartsupply.com/mosaic-glues/) · [SkullSplitter re-inking](https://www.skullsplitterdice.com/blogs/andrars-rumblings/re-inking-your-dice-101-marker-paint-or-crayon) · [timvandevall paper dice](https://timvandevall.com/printable-paper-dice-template/)
