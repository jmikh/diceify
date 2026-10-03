# Content Quality and E-E-A-T: diceify.art

Audit date: 2026-10-03. Sources: the saved live HTML in `data/raw/` (text pulled with BeautifulSoup and trafilatura, scripts and styles removed), `data/CONTEXT.md` (GSC, GA4, competitor notes), the claude-seo tools `content_quality.py`, `parse_html.py` and `metadata_template.py`, a static fetch of Jeremy Klammer's original post, and the repo source where it confirms a finding (`core/billing/plans.ts`, `app/(marketing)/layout.tsx`, `components/Footer.tsx`).
Framework: Google Search Quality Rater Guidelines (Sept 11, 2025). The E-E-A-T weights below are this audit's own scoring model; Google publishes no numeric weights.

---

## 1. Scores

| Score | Value |
|---|---|
| **Content Quality** | **54 / 100** |
| **On-Page SEO** (titles, metas, headings, internal linking) | **62 / 100** |
| E-E-A-T (weighted) | 48 / 100 |
| AI citation readiness | 62 / 100 |

### E-E-A-T breakdown

| Factor (weight) | Score | Evidence |
|---|---|---|
| Experience (20%) | 55 | Plus: the founder story and a YouTube video of the Um Kulthum build; Jeremy's real build (plywood, 2×4 backing, Liquid Nails, 20-30 test photos, 100+ hours); "That happened on one of our own builds" on /dice-art. Minus: every gallery image is a **digital render**, not a photo of a built piece. The only photo of a physical build (`/images/blog/why-i-built-diceify.webp`) appears only as a blog-card thumbnail. Neither post has an image in its body. |
| Expertise (25%) | 60 | /dice-art is technically accurate. The size math checks out: 50×50 at 16 mm = 80 cm / 31.5 in, 363 dice/ft² at 16 mm, 645 at 12 mm. The brightness-mapping explanation is correct. Minus: the guide's Article `author` is the Organization (no named expert), there is no author bio anywhere, build times disagree between pages, and the Jeremy post has a size error (see M1). |
| Authoritativeness (25%) | 35 | 2 posts, nothing new since Jan 2024. Organization schema has no `sameAs` or `founder`. A competitor page publicly rates Diceify 3/5. Brand gets confused with "Dicify". No press or third-party citations are shown. Plus: TikTok, Instagram and r/DicePortraits are linked in the homepage footer, and ChatGPT sends some referrals. |
| Trustworthiness (30%) | 45 | The Terms contradict the pricing card on a paid plan (H1). The Privacy Policy names an analytics vendor the site doesn't use and leaves out the one it does use (H2). The "built by hand" claim sits on renders (H3). Privacy, Terms and Contact are linked only from the homepage (M4). No legal entity or state is given ("laws of the United States"). Copyright years are stale (© 2025 footer, © 2024 schema). Plus: Stripe checkout, HTTPS, a support email, a refund policy. |

Weighted: 0.20×55 + 0.25×60 + 0.25×35 + 0.30×45 = **48**.

### Word count vs page-type floors (body text, scripts removed)

| Page | Words | Floor | Verdict |
|---|---|---|---|
| / | 728 | 500 (home) | OK |
| /dice-art | 1,190 | ~1,500 (guide) | Dense and on-topic. The missing weight, cost and hanging sections would bring it to about 1,500 naturally. |
| /gallery | **57** | 300+ for a gallery hub | **Thin.** 13 images with name-only captions. |
| /blog | 115 | hub | Thin hub: 2 cards, no dates shown. |
| /blog/why-i-built-diceify | 489 | 1,500 (blog) | Short. GSC: "Discovered – currently not indexed". |
| /blog/jeremy-dice-portraits-nieces | 477 | 1,500 (blog) | Short. Body is a rewrite of an external post. |
| /editor | 55 ("Loading workspace…") | app | Acceptable for an app shell, as long as the homepage is the page that ranks for "generator" (see M5). |
| /privacy, /terms | 623 / 1,095 | n/a | Length OK, accuracy not (H1, H2). |

Word count is not a ranking factor. These floors are coverage checks only.

### Readability (Flesch Reading Ease from a heuristic syllable counter, so treat as approximate)

| Page | Flesch | Grade | Avg sentence |
|---|---|---|---|
| /dice-art | 81 | ~5 | 13.7 words. Excellent. |
| why-i-built | 83 | ~4.5 | 11.4. Excellent, conversational. |
| jeremy | 61 | ~10 | 22.0. Fine. |
| homepage FAQ | ~47 | ~13 | ~26. Long answers, e.g. the 33-word "Using Diceify's builder speeds things up significantly because…". Splitting them would also make them easier to quote. |
| privacy / terms | 48 / 45 | 10-12 | Normal for legal text. |

`content_quality.py` found no filler and no AI-pattern phrases on any page (filler 0, ai_pattern 0). The "repetitive" flag comes from nav and carousel markup, not from the prose.

### Templated metadata (`metadata_template.py`, 10 URLs)
`site_risk: low`, `templated_ratio: 0.0`, `shared_cta_phrases: {}`. There is no bulk or templated metadata. Six pages got the secondary flag `brand_suffix_in_description`. These are false positives: "Diceify" is the subject of each sentence, not a pasted suffix. The one real duplicate is /account, which reuses /editor's exact title and description and canonicalizes to /editor. Its impact is low because robots.txt disallows /account.

---

## 2. Findings

### HIGH

**H1. The Terms contradict the pricing shown on the homepage (Trust).**
- Homepage pricing card: *"Creator 30 Days $19 one-time … 30 days of full access to complete your masterpiece … Access expires after 30 days"*. `core/billing/plans.ts` matches: `accessDays: 30`.
- /terms §4.4: *"The Creator Pass is a one-time purchase that grants permanent access to all premium features for the lifetime of the Service."* §5.1: *"Creator Pass purchases are non-refundable as they provide permanent access."*
- /terms §4.1: Explorer has *"limitations, such as the number of projects they can save"*, but the homepage says *"Unlimited projects in the cloud"* on every plan (no project limit since G1).
- **Fix:** Rewrite §4.4 to say "30 days of full access from purchase; does not renew". Rewrite the §5.1 refund wording to match. Remove the project-count limit from §4.1. Bump "Last updated". On a page that takes payment, a mismatch like this is the biggest single Trust problem for a rater or a user.

**H2. The Privacy Policy no longer describes the site (Trust).**
- §2.4: *"We use Google Analytics and Vercel Analytics…"*. The site runs on Cloudflare, not Vercel. It uses PostHog, which loads its session recorder (the codebase has `NO_CAPTURE_CLASS` masking for user photos), plus the Cloudflare Insights beacon. Neither is disclosed. Supabase (auth, database, storage) isn't named as a processor either.
- *"Last updated: January 23, 2025"*. The policy is older than the Supabase migration and the PostHog rollout.
- **Fix:** List the processors (Supabase, Stripe, Google Analytics 4, PostHog including session replay and what gets masked, Cloudflare). State the retention period and the legal entity. Update the date.

**H3. Digital renders are presented as hand-built pieces, and no real builds are shown (Experience/Trust).**
- /gallery intro: *"Portraits, mosaics, and abstract designs, all created with Diceify and built by hand."*
- /dice-art: *"Here are some dice portraits and mosaics created with Diceify, each one built by hand from a generated pattern:"*
- Gallery ImageGallery JSON-LD: *"Each piece is built by hand from a generated pattern."*
- I opened the image files: `salah-61x61.webp`, `abstract/pikachu.webp` and the others are flat, computer-generated dice grids. The only photo of a physical build (`blog/why-i-built-diceify.webp`: a hand placing dice, with the phone builder overlaid) appears only as a 2-card thumbnail.
- **Fix:** (a) Correct the copy to "patterns generated with Diceify" unless a piece really was built. (b) Add a **"Real builds"** section at the top of /gallery: the founder's Um Kulthum build, Jeremy's finished portraits (with permission; his site has photos), and community builds from r/DicePortraits or Instagram (with permission and credit). (c) Label each tile "Built" or "Digital preview". Photos of real finished pieces are the strongest Experience signal this niche has, and the main reason people search "dice art".

**H4. Nobody visible stands behind the site (no About page, no author bio) (Expertise/Authority/Trust).**
- The founder appears only as a byline: *"By John Mikhail • January 24, 2024"*. There is no bio, no photo, no link.
- The /dice-art Article schema has `"author": {"@type":"Organization","name":"Diceify"}`. Organization schema has no `founder`, no `sameAs`, no `foundingDate`.
- Terms: *"governed by … the laws of the United States"*. No entity name, no state.
- **Fix:** Create an `/about` page covering who built Diceify, since when (2020, COVID), the Um Kulthum build with photos and the video, how the algorithm works, contact details, and the legal entity. Link it from the footer and from every byline. Add `Person` schema for John Mikhail (`url: /about`, `sameAs`: GitHub, LinkedIn, YouTube, TikTok, Instagram). Make him the `author` of /dice-art. Add `founder` and `sameAs` (TikTok, Instagram, YouTube, r/DicePortraits) to Organization. This also helps separate "Diceify" from "Dicify" for AI answer engines.

**H5. /gallery is thin and its CTR is 0.35% (5,727 impressions, position 9.3).**
- All visible text besides the H1 and intro: *"Portraits / Salvador Dali / Frida Kahlo / Mona Lisa / … / Abstract / Pikachu / Sun / Tile Pattern / Tile Design / Woman / Want to create your own?"* That is 57 words.
- The meta description promises *"photos of celebrities, loved ones, and creative designs"*, but there are no "loved ones" on the page (all subjects are celebrities, artworks or characters).
- The grid sizes are already in the filenames (`dali-51x51`, `frida-54x54`, `salah-61x61`, `kobe-71x71`, `sharbatgula-52x52`, `ummkulthum58x58`) but never shown on the page.
- **Fix:** Give each tile a data caption, e.g. *"Salvador Dalí · 51×51 grid · 2,601 dice (B / W split) · 82 cm (32 in) square at 16 mm · Digital preview"*. Add a 150-250-word intro on which subjects work (close-cropped faces, strong contrast, one subject) and why each example works. Add the "Real builds" section from H3 and a "Kids / Pets / Couples" section reusing the homepage hero pairs (these exist in `/images/hero/`). Add an "Open a similar grid in the editor" CTA. Put the grid, dice count and size into each ImageObject `description` or `caption`. Fix the LCP image, which is lazy-loaded (see CONTEXT).

**H6. The blog is stale, makes promises it doesn't keep, and one of its 2 posts isn't indexed (Freshness/Authority).**
- Newest post: 2024-01-24. Oldest: 2023-11-21. Neither the /blog listing nor the homepage "Stories from the community" cards show a date.
- /blog: *"Discover inspiring stories, tutorials, and creative ideas from our community"*. The blog has no tutorials and one community story.
- `/blog/why-i-built-diceify`: GSC "Discovered – currently not indexed". It is 489 words with no body images. The YouTube embed (`z4UUXeYqJZw`) has no VideoObject, transcript or chapters.
- **Fix:** Publish 1-2 posts a month built on first-hand data (ideas in §4). Show dates on cards. Expand "Why I Built Diceify" with the build photo, the grid size and dice count, hours spent, the resin failure in photos, a VideoObject with key moments, and a short transcript summary.

**H7. Questions people ask about dice art go unanswered (competitor and AI answers own them).**
Status in the live HTML:

| Gap | Status | Evidence |
|---|---|---|
| Die size | **Covered** (added Oct 3) | *"Use 16 mm six-sided dice with pips … 12 mm dice fit the same grid into a piece three-quarters the width."* |
| Finished size / dice per ft² | **Covered** | Size table plus *"One square foot holds about 363 dice at 16 mm (645 at 12 mm)."* (verified correct) |
| Weight | **Missing** | Only *"Big pieces get heavy"* |
| Glue / mounting / hanging | **Partial** | Glue types and both methods covered. Frame building, hanging hardware, sealing and cleaning are not. |
| Bulk dice cost | **Missing** | *"Amazon, gaming supply stores, and educational supply stores all sell packs of 100–1,000."* No prices, no cost per die, no total for a portrait. |
| Exports / PDF | **Missing** | Homepage lists *"Full resolution SVG blueprints"* and *"Social-ready image downloads"*, but no page explains what you get. The competitor's 3/5 rating cites "no PDF export … no project information". |
| Templates / ready patterns | **Missing** | No page. |
| Comparison page | **Missing** | No page. A competitor ranks its own "best dice art generators" list. |

Fixes are in §4.

### MEDIUM

**M1. A size error in the Jeremy post (factual accuracy).**
- *"Each finished piece measures 35 × 47 inches"* and *"Used frames sized 26×32 inches to fit a 35×47 dice grid."* A 35×47-inch piece can't fit a 26×32-inch frame. 35×47 is the **dice grid** (1,645 dice). At 16 mm that is about 22 × 30 in. Jeremy's original post has the same ambiguity ("35 x 47 in"), and the rewrite copied it.
- **Fix:** *"Each portrait is a 35×47 dice grid (1,645 dice), mounted in a 26×32-inch frame."* Confirm the die size with Jeremy and add the finished size.

**M2. The Jeremy post's byline is inaccurate (authenticity).**
- The title is first person (*"How I Made Dice Portraits for My Nieces"*) and the byline and `Person` schema say Jeremy Klammer. The body is third person written by Diceify (*"Jeremy Klammer wanted to make something special…"*) and ends *"This article is based on Jeremy Klammer's original blog post."* /dice-art links to it as *"How Jeremy Made Dice Portraits for His Nieces"*.
- **Fix:** Retitle to third person. Make the byline "Diceify team, based on Jeremy Klammer's post" and keep the source link. Or ask Jeremy for a first-person Q&A, which is better: new quotes count as first-hand experience.

**M3. Build-time figures disagree across pages.**
- Homepage FAQ: *"A medium 40×40 piece (1,600 dice) can take a full day or two."*
- /dice-art: *"A 40×40 piece (1,600 dice) is a full day."*
- Jeremy (1,645 dice): *"Each piece took over 100 hours to complete."*
- **Fix:** Use one source of truth, for example: "Placing dice: about N dice/hour with the builder; planning, frame, glue and finishing add X." Better still, publish a placement rate measured from real builds (see §4, "Diceify build data"). Explain that Jeremy's 100 hours included testing photos, building the frame and painting.

**M4. Seven of the eight non-home pages have no nav and no footer (internal linking and Trust).**
- Only `index.html` contains `<nav>` and `<footer>`. /dice-art, /gallery, /blog, both posts, /privacy and /terms have only "← Back to Home". Privacy, Terms and Contact aren't reachable from any of them. `app/(marketing)/layout.tsx` says this is on purpose: *"Only the landing page has a navbar and footer."*
- Each blog post has 2 internal links (/blog and /editor). They don't link to /dice-art, /gallery or each other.
- **Fix:** Move `components/Footer` (and ideally a compact nav) into `app/(marketing)/layout.tsx`. In each post, link contextually to /dice-art (size table, glue section), /gallery and the other post.

**M5. Two pages compete for "dice art" and an anchor points "dice art generator" at the wrong page (cannibalization).**
- The only exact-match "dice art generator" anchor on the site is on /dice-art and links to **/editor**: *"A dice art generator does the matching automatically"*. The other /editor links are "Diceify" ×2, "step-by-step builder" and "Start creating".
- Desktop "dice art generator" swings between position ~3 and 20-46 from day to day (CONTEXT). That fits Google alternating between / and a weaker URL (/editor at position 28, or /dice-art).
- The homepage FAQ repeats 5 of its 6 questions on /dice-art: what is it, how many dice, black/white/both, how long, vs pixel art. Only 10% of the wording overlaps (5-gram), so this is topical duplication, not copied text. Still, both pages answer the same informational questions.
- **Fix:** Point "dice art generator" anchors at `/`. Use "open the editor" or "start building" for /editor links. Cut the homepage FAQ to generator and product questions (free vs paid, exports, photo tips, accounts, build-mode help) and let /dice-art own the informational ones. Link from the homepage FAQ to the matching /dice-art sections.

**M6. Titles and meta descriptions are weak for /dice-art (0.76% CTR) and /gallery (0.35% CTR).**
At positions 7-9, a 0.3-0.8% CTR is well below normal. Likely causes, which should be checked against GSC page×query data first:
(a) **Host crowding.** On the same "dice art" queries the homepage ranks higher (~4.4) and takes the click.
(b) **Image-led SERP** for "dice art".
(c) **Snippets with no specific hook.** The /dice-art description is a table of contents (*"What dice art is, how it works, how many dice you need…"*). The /gallery description is 178 characters, gets truncated, and promises "loved ones" the page doesn't show.

Rewrites. Note that the root template in `lib/seo.ts` appends " | Diceify" (10 characters), so the lengths below include it.

| Page | Current | Proposed title (with suffix) | Proposed description |
|---|---|---|---|
| / | Diceify — Free Dice Art Generator for Portraits & Mosaics (57). Description is 172 chars and truncated. | Keep the title. | "Turn any photo into dice art for free. Pick a grid from 20 to 120 rows, get the exact count of black and white dice, then build it row by row." (142) |
| /dice-art | Dice Art — The Complete Guide to Dice Portraits & Mosaics \| Diceify (67) | **Dice Art: How to Make It, Dice Count & Size Chart \| Diceify** (59) | "A 50×50 dice portrait uses 2,500 dice and is 80 cm (31.5 in) wide with 16 mm dice. Size chart, which dice and glue to buy, and 4 build steps." (141) |
| /gallery | Dice Art Gallery \| Portraits & Abstract Mosaics \| Diceify (57) | **Dice Art Examples: Portraits With Dice Counts \| Diceify** (55). Only after the captions from H5 ship. | "Dice art examples with grid size and dice count for each, from a 51×51 Dalí (2,601 dice) to a 71×71 Kobe Bryant (5,041 dice). Make yours free." (142) |
| /blog | Blog \| Diceify (og:title "Blog") | **Dice Art Blog: Builds, Tips & Gift Ideas \| Diceify** (50). Set og:title too. | "Real dice art builds: how they were made, how many dice they took, and what went wrong. Plus tips for planning, gluing and hanging your own piece." (146) |
| why-i-built | Why I Built Diceify \| Diceify | **Why I Built Diceify: My Um Kulthum Dice Portrait \| Diceify** (58) | "I tried to build a dice portrait of Um Kulthum and kept losing my place. Here is the build, the resin mistake, and the tool I made to fix it." (adjust once the grid size is confirmed) |
| jeremy | How I Made Dice Portraits for My Nieces \| Diceify | **Dice Portrait Gifts: Jeremy's 1,645-Dice Builds \| Diceify** (57) | "Jeremy Klammer built two 35×47 dice portraits for his nieces' birthdays: 20–30 test photos each, a plywood base, Liquid Nails and 100+ hours." (141) |

Keep "Dice Art" at the start of the /dice-art title so the head term stays in place, and add the how-to and numbers angle that the homepage doesn't cover.

**M7. Dates are stale across the site (freshness).**
Footer: *"© 2025 Diceify. Made for makers."* (`components/Footer.tsx`, hardcoded; it's 2026). Schema `copyrightNotice: "© 2024 Diceify. All rights reserved."` and `copyrightYear: 2024` (`features/marketing/components/Gallery.tsx`). Privacy is dated Jan 2025. The sitemap has no lastmod on /, /dice-art or /gallery.
**Fix:** Generate the year at build time. Update the schema years. Give each sitemap entry a real lastmod (for example /dice-art 2026-10-03, which is genuine: `DATE_MODIFIED` is a hand-set constant, not the build date).

**M8. Social-proof claim with no source.**
Hero: *"Join 5,000+ creators building with real dice"*. Nothing on the site backs the number, and it hasn't changed since earlier versions.
**Fix:** Tie it to a real, dated count (e.g. "N photos turned into dice patterns since 2020") from Supabase or PostHog, or soften it. Quality raters treat unverifiable counts as a minor trust negative. A verifiable count is also a quotable fact.

**M9. Blog posts have no media in the body and no VideoObject.**
Both posts have 0 `<img>` in the article body. The embedded build video has no schema, chapters or transcript.
**Fix:** Add 3-5 captioned photos per post. Add a VideoObject (name, description, thumbnailUrl, uploadDate, duration, embedUrl) plus a short "what happens in the video" list.

### LOW

- **L1. Homepage headings carry no meaning.** The H2s *"6 faces." / "2 colors." / "12 shades."* are fragments, and the pricing H2 *"Choose Your Creative Journey"* says nothing. Merge the three into one H2, "How dice art works: 6 faces × 2 colors = 12 shades", and rename pricing to "Pricing: free, $19 Creator Pass or Studio from $3/month".
- **L2. Weak social metadata.** og:title on /blog is just "Blog". Blog posts use the generic `og-card.jpg` instead of their own cover image (`/images/blog/*.webp`).
- **L3. Inconsistent entity spelling.** "Um Kulthum" in the blog and "Umm Kulthum" in gallery alt text and captions. Pick one spelling (Wikipedia uses "Umm Kulthum") so AI engines resolve one entity.
- **L4. Gallery IP and likeness.** Pikachu (Nintendo / The Pokémon Company), "Afghan Girl" (Steve McCurry / National Geographic photo), Kobe Bryant and Mo Salah, all tagged `© 2024 Diceify. All rights reserved.` in ImageObject. Prefer public-domain artworks (Mona Lisa, Van Gogh, Vermeer) and user-submitted builds, and drop the copyright claim on derivatives of third-party works.
- **L5. No llms.txt.** /llms.txt returns 404. It's optional and Google doesn't use it, but a short file pointing to /dice-art, /about, pricing and the size table costs nothing.
- **L6. twitter:creator handle.** `@diceify` vs the social handles `@diceify.art`. Check that the X handle exists.
- **L7. Duplicate metadata on /account.** It reuses /editor's title and description. Low impact because robots.txt disallows it, but a distinct "Account | Diceify" title costs nothing.

---

## 3. AI citation readiness: 62 / 100

**Working:**
- /dice-art opens with a quotable definition: *"Dice art is a mosaic made from ordinary six-sided dice. Each die is one pixel of the picture, and the face turned up sets its shade."*
- Question-form H2s ("How many dice do you need, and how big will it be?", "What size dice should you use?").
- A grid → dice → cm/in table, and checkable facts (363 / 645 dice per ft², 12 shades, 20-120 rows).
- FAQPage (10 Q) and HowTo with supplies and tools. FAQ rich results are retired, but the Q/A structure still helps parsing.
- The homepage hero shows a concrete worked example: *"87 × 77 grid · 4,564 black · 2,135 white"*.

**Missing:**
- **Numbers AI answers currently take from others:** weight, cost, dice per hour. Dice Art Studio (itch.io) is quoted for dice counts.
- **Named author or expert** on the guide.
- **Original data** that nobody else has (see "Diceify build data" below).
- **Entity disambiguation** (Diceify vs Dicify; `sameAs`).
- **The gallery** has no machine-readable facts per piece.

**Ready-to-ship quotable sentences** (fill in measured values; don't publish estimates as measurements):
- "A 16 mm die weighs about __ g, so a 50×50 portrait (2,500 dice) weighs about __ kg before the board." Weigh 100 of your own dice and say that you did.
- "At $__ per 100 dice (bulk 16 mm, prices checked Oct 2026), a 50×50 portrait costs about $__ in dice."
- "With Diceify's builder, people place a median of __ dice per hour (n = __ builds)."

---

## 4. Proposed new sections and pages

1. **New /dice-art sections** (the page stays the hub for informational queries):
   - *How much does dice art weigh?* Grams per die (measured) × dice count, plus the base. Add a weight column to the existing size table and recommend hanging hardware (French cleat or D-rings rated for 2× the weight).
   - *How much does dice art cost?* A dated price survey per 100 dice (16 mm vs 12 mm, black vs white) and a cost column in the table. Note that the editor already shows the black and white counts, which is what to buy.
   - *Framing, sealing and hanging.* Board thickness, 2×4 backing (Jeremy), edge frame, whether to seal, dusting.
   - *What you get from Diceify.* Free: the pattern, social image and builder for 5 rows. Paid: full builder and SVG blueprint. Whether a printable PDF exists is a product decision for you; if it ships, document it here and on the homepage. This answers the competitor's "no PDF export, no project information".
   - Rename "How to make your own" to **"How to make dice art (4 steps)"**, matching the query.
2. **/about** (H4): founder, story, real build photos and video, contact, legal entity, `Person` and `Organization` schema with `sameAs`.
3. **Templates page** (e.g. `/dice-art-templates`): ready-made public-domain patterns (Mona Lisa, Girl with a Pearl Earring, Van Gogh, a heart, a smiley) with grid, dice counts, size, and "open in editor". At 5-15 hand-curated entries this is a normal page. If it grows into many generated pages, apply the `seo-programmatic` uniqueness rules first.
4. **Comparison page** (e.g. `/best-dice-art-generator` or "Diceify vs …"): an honest, dated table of black+white 12-shade support, grid range (20-120), build mode, cloud saves, exports, price and account requirement. Cite competitors fairly and say where they win. See `seo-competitor-pages`. Today the only comparison Google and AI engines can find is the competitor's, which gives Diceify 3/5.
5. **"Diceify build data"** post or page: anonymized aggregates from your own data (median grid size, median dice count, black/white ratio, placement rate). No competitor can copy it, and it is exactly what AI engines quote.
6. **Blog backlog (first-hand, 1-2 a month):**
   - "We weighed 1,000 dice: how heavy is dice art?"
   - "What a 50×50 dice portrait really costs (Oct 2026 prices)"
   - "Black-only vs black-and-white dice: the same portrait built both ways"
   - "Dice portrait gift guide: sizes, costs and lead times"
   - A community spotlight from r/DicePortraits each month (with permission and credit)
7. **Gallery rebuild** (H3, H5): the "Real builds" section first, data captions, built vs preview labels, and Kids / Pets / Couples sections.

---

## 5. What works

**Content Quality: what works**
- /dice-art is a strong guide: answer-first, short sentences (Flesch ~81), accurate numbers, a real size table, both glue methods with a failure story, and a genuine "Last updated: October 3, 2026".
- Two real first-hand stories (the founder's COVID build with video, Jeremy's gifts) with specific details: Liquid Nails, 2×4 backing, 20-30 test photos, the fingerprint tradition.
- No filler or AI-pattern phrasing (`content_quality.py`: 0 filler, 0 AI patterns). The writing has a clear voice.
- Black-only vs white-only vs both comparison images (same 50×50 photo) that teach the core idea visually.
- The homepage carries a concrete worked example and transparent pricing.

**On-Page SEO: what works**
- Every indexable page has a unique, keyword-led title, mostly ≤60 characters. Homepage: "Free Dice Art Generator for Portraits & Mosaics".
- One H1 per page. /dice-art uses question-form H2s that match real queries, plus anchored HowTo step URLs.
- Self-canonicals, a breadcrumb list on /dice-art, /gallery and the posts, and descriptive alt text on every content image.
- No templated or bulk metadata (`templated_ratio 0.0`, no shared CTA phrases).
- /dice-art links to /gallery and both posts in a "Further reading" block, and the homepage links to every marketing page.

**What holds the scores down:**
- **Content Quality:** Trust contradictions (H1, H2), renders labeled as hand-built (H3), no named author or About page (H4), a thin gallery (H5), a stale blog (H6), and the unanswered weight, cost and export questions (H7).
- **On-Page SEO:** no nav or footer on subpages, 2-link blog posts, the mis-pointed "dice art generator" anchor and the FAQ overlap, and truncated or generic descriptions on the two low-CTR pages.

---

## 6. Structured findings (for audit-data.json, category "Content Quality")

```json
{
  "category": "Content Quality",
  "scores": {"content_quality": 54, "on_page_seo": 62, "eeat": 48, "experience": 55, "expertise": 60, "authoritativeness": 35, "trustworthiness": 45, "ai_citation_readiness": 62},
  "metadata_template": {"site_risk": "low", "templated_ratio": 0.0, "shared_cta_phrases": {}},
  "findings": [
    {"id": "H1", "severity": "high", "title": "Terms contradict pricing (Creator Pass 30 days vs 'permanent'; Explorer project limits vs 'unlimited')", "url": "/terms", "fix": "Align terms 4.1/4.4/5.1 with plans.ts (accessDays 30, unlimited projects)"},
    {"id": "H2", "severity": "high", "title": "Privacy policy names Vercel Analytics, omits PostHog (session replay), Cloudflare, Supabase; dated Jan 2025", "url": "/privacy", "fix": "List actual processors, replay masking, entity; update date"},
    {"id": "H3", "severity": "high", "title": "Gallery renders described as 'built by hand'; no real build photos in main content", "url": "/gallery", "fix": "Correct copy/schema; add Real builds section; label previews"},
    {"id": "H4", "severity": "high", "title": "No About page, author bio, founder/sameAs; guide authored by Organization", "url": "sitewide", "fix": "Create /about, Person schema, author on /dice-art, Organization founder+sameAs"},
    {"id": "H5", "severity": "high", "title": "/gallery thin (57 words), CTR 0.35% at pos 9.3", "url": "/gallery", "fix": "Data captions (grid, dice, size), intro, sections, new title/description"},
    {"id": "H6", "severity": "high", "title": "Blog stale (2 posts, newest 2024-01-24), no dates on cards, why-i-built not indexed", "url": "/blog", "fix": "1-2 first-hand posts/month, dates, expand founder post with media + VideoObject"},
    {"id": "H7", "severity": "high", "title": "Content gaps: weight, cost, mounting/hanging, exports/PDF, templates, comparison", "url": "/dice-art", "fix": "New sections + templates page + comparison page"},
    {"id": "M1", "severity": "medium", "title": "Jeremy post: '35 × 47 inches' should be a 35×47 dice grid (frame is 26×32 in)", "url": "/blog/jeremy-dice-portraits-nieces"},
    {"id": "M2", "severity": "medium", "title": "Jeremy post byline/schema say Jeremy wrote it; body is a third-person rewrite", "url": "/blog/jeremy-dice-portraits-nieces"},
    {"id": "M3", "severity": "medium", "title": "Build-time figures inconsistent (home vs /dice-art vs Jeremy)", "url": "/, /dice-art"},
    {"id": "M4", "severity": "medium", "title": "No nav/footer on 7 of 8 non-home pages; blog posts have 2 internal links", "url": "sitewide"},
    {"id": "M5", "severity": "medium", "title": "Exact-match 'dice art generator' anchor points to /editor; homepage FAQ overlaps /dice-art (5 of 6 Q)", "url": "/dice-art, /"},
    {"id": "M6", "severity": "medium", "title": "Weak/over-length titles and descriptions on low-CTR pages", "url": "/dice-art, /gallery, /, /blog"},
    {"id": "M7", "severity": "medium", "title": "Stale dates: footer (c) 2025, schema (c) 2024, sitemap lacks lastmod", "url": "sitewide"},
    {"id": "M8", "severity": "medium", "title": "Unsubstantiated 'Join 5,000+ creators'", "url": "/"},
    {"id": "M9", "severity": "medium", "title": "Blog posts: no body images; video lacks VideoObject/transcript", "url": "/blog/*"},
    {"id": "L1", "severity": "low", "title": "Homepage fragment H2s and vague pricing H2", "url": "/"},
    {"id": "L2", "severity": "low", "title": "og:title 'Blog'; posts use generic og-card", "url": "/blog"},
    {"id": "L3", "severity": "low", "title": "Um Kulthum / Umm Kulthum spelling inconsistent", "url": "sitewide"},
    {"id": "L4", "severity": "low", "title": "Gallery uses third-party IP/likenesses tagged (c) Diceify", "url": "/gallery"},
    {"id": "L5", "severity": "low", "title": "No llms.txt (optional)", "url": "/llms.txt"},
    {"id": "L6", "severity": "low", "title": "twitter:creator @diceify vs @diceify.art", "url": "sitewide"},
    {"id": "L7", "severity": "low", "title": "/account duplicates /editor title+description", "url": "/account"}
  ]
}
```
