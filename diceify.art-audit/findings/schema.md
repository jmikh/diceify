# Schema / Structured Data audit: diceify.art (2026-10-03)

Source: saved HTML in data/raw/. All blocks are server-rendered static JSON-LD (components/JsonLd.tsx, correct). Every block parses, uses `https://schema.org`, absolute URLs, ISO dates. No Microdata/RDFa.

## Detection
| Page | Blocks |
|---|---|
| every page incl. 404 and /s/* | WebSite (+ nested Organization as `publisher`) from app/layout.tsx |
| / | WebApplication (Offer 0), FAQPage (6 Q), ImageGallery (7 ImageObject) |
| /dice-art | Article (author Organization, image, dateModified 2026-10-03), FAQPage (10 Q), HowTo (4 steps), BreadcrumbList |
| /gallery | ImageGallery (13 ImageObject), BreadcrumbList |
| /blog, /privacy, /terms | WebSite only |
| /blog/why-i-built-diceify, /blog/jeremy-... | Article (Person author), BreadcrumbList |
| /editor (and /account) | WebApplication "Diceify Builder" (Offer 0) |
| 404 | WebSite |

## Findings

### High
1. **No standalone Organization / no @id graph.** Organization exists only as an anonymous nested `publisher` of WebSite, and is re-declared (with different logo URLs and varying fields) inside Article.publisher, WebApplication.creator/publisher, ImageGallery.copyrightHolder and 20+ ImageObject.creator. Google reads it, but there is no single entity for Knowledge Graph / LLM entity resolution. Fix: one Organization node `@id: https://diceify.art/#organization`, referenced by `{"@id": ...}` everywhere. File: app/layout.tsx (emit one `@graph` with WebSite + Organization), then replace inline Organizations in app/(marketing)/page.tsx, dice-art/page.tsx, blog/[slug]/page.tsx, features/marketing/components/Gallery.tsx, app/(editor)/layout.tsx.
2. **Organization has no `sameAs`** although Instagram (instagram.com/diceify.art) and TikTok (tiktok.com/@diceify.art) exist (components/Footer.tsx). Brand confusion with "Dicify" makes this the most valuable disambiguation signal. Also add `@handle` Twitter if @diceify (used in lib/seo.ts twitter creator) is real.
3. **Inconsistent / non-ideal logo.** Logo is favicon-192x192.png on most pages (valid size, >=112px) but `logo-full.svg` in blog Article.publisher; Google does not support SVG logos. Use one square PNG (ideally 512x512, android-chrome-512x512.png exists) everywhere. The logo carries creator/copyright/license fields, which is overkill for a Logo and adds ~400 bytes x every ref; keep license fields only on content images.

### Medium
4. **Blog Articles lack `image`** (Google-recommended; also the og image is a generic card). Add the og-card or a per-post image. /dice-art Article has an image (good).
5. **Blog `dateModified` = `datePublished`** (app/.../blog/[slug]/page.tsx line 72 uses post.date). Posts are 2023/2024, so freshness signal is stale; set only when really edited. /dice-art `dateModified: 2026-10-03` equals today's audit date, make sure it reflects actual content change, not a build-time constant.
6. **Author for E-E-A-T.** Blog: Person authors OK (Jeremy has a url; John Mikhail has none). Add `url` (e.g. an /about page or LinkedIn via sameAs) to John's Person node. /dice-art (the money page) has Organization as author; a named Person (John Mikhail, with sameAs) with `reviewedBy`/author is better for a how-to guide.
7. **WebApplication vs plans.** Homepage Offer says price 0 USD, which is true for the free tier but hides paid plans (Creator $19 / 30 days, Studio $9/mo or $36/yr; core/billing/plans.ts PRICING). Use `offers` as an array/AggregateOffer with the real tiers (snippet below), generated from PRICING so prices never drift. WebApplication is acceptable (it is a browser app); `SoftwareApplication` is the Google-supported rich-result type but WebApplication is a subtype and also accepted. Note the Google Software App rich result REQUIRES `aggregateRating` or `review` plus `offers`; there is none, so no rich result is possible. Do NOT fabricate ratings. Only add AggregateRating from genuine user reviews, if you later collect them.
8. **WebApplication lacks recommended fields**: `featureList`, `screenshot`, `image`, `browserRequirements`, `isAccessibleForFree`. /editor duplicates a second WebApplication with a different name ("Diceify Builder") and url; the editor page is a client shell of 66 words, so declare it as the same entity (`@id`) or drop it, and `operatingSystem` differs ("Any" vs "Web Browser"). Make it one entity on `/` and reference it.
9. **HowTo on /dice-art** is deprecated (rich results removed Sept 2023). No SERP value. Valid markup, harmless; recommended to remove to keep the page lean (the page copy already carries the steps). Info/low risk to keep.
10. **FAQPage on / (6 Q) and /dice-art (10 Q).** Rich results retired May 7 2026; GSC shows none. Valid markup, answers match visible content (homepage answers differ in wording from /dice-art: same questions "What is dice art?" with two different answers is a content-consistency smell for LLMs). Recommendation (Info): keep on /dice-art only if you accept benefit is unconfirmed for AI; it costs ~6 KB. Remove the homepage FAQPage or align its answers with /dice-art. Do not add FAQPage elsewhere.

### Low
11. **WebSite**: no `potentialAction`/SearchAction. Correct and fine, the site has no search; do not add one. Add `@id` (`https://diceify.art/#website`) and `inLanguage: "en"`; `publisher` should be an `@id` ref.
12. **404 page (and /s/* fallback, /privacy, /terms, /blog) carry WebSite.** Harmless since it is in the root layout, but the 404 asserting a WebSite entity is noise. Acceptable; cleanest is to move it into `(marketing)/page.tsx` only (WebSite is only needed on the home page per Google). Pages like /blog, /privacy, /terms would then have no schema, fine.
13. **BreadcrumbList** valid on /dice-art, /gallery and posts: positions 1..n, name+item URL, last item has item URL (allowed). Home item is `https://diceify.art` without trailing slash, consistent with canonical (GSC canonical is `/`, so consider adding slash site-wide). /blog index and /editor have no breadcrumb (optional). GSC confirms Breadcrumbs detected. Pass.
14. **ImageGallery / ImageObject**: Valid; GSC detects Image Metadata. Each ImageObject has contentUrl, creator, creditText, copyrightNotice, license, acquireLicensePage, which is the full Google image-license set. Issues: "© 2024" hard-coded and stale (use current year or drop copyrightNotice year); `representativeOfPage:false` is unnecessary; gallery images depict Dali, Kobe Bryant, Frida Kahlo, Salah, Mona Lisa: claiming "© Diceify" and `creator` is fine for your dice rendering but be aware of likeness rights; ImageGallery is not a Google rich-result type, the value is the nested ImageObjects. Home ImageGallery `url` is a fragment (`/#gallery`), and its image names differ from /gallery for the same files (fine). Gallery has 13 images but page is thin (67 words): captions/visible text would strengthen it.
15. **Article headline** "Dice Art — The Complete Guide to Dice Portraits & Mosaics" 57 chars (<110) pass. Blog headlines pass. `articleSection: "Community Stories"` on the founder story is odd. `mainEntityOfPage` correct.
16. **No VideoObject** (no video on the site; TikTok/Instagram exist; if a build-time-lapse is embedded on a page add VideoObject with thumbnailUrl/uploadDate). **speakable**: not worth adding (news-only, limited to US). **Product/Offer for plans**: do via the Offer array on WebApplication, not Product pages (no merchant listing eligibility for SaaS). **Person/about**: add /about page or Person node linked from Organization `founder`.

## Validation per block
| Block | Result |
|---|---|
| WebSite | Pass (warn: no @id, nested org) |
| Organization (nested) | Pass for Logo; warn: no sameAs, dupes |
| WebApplication / | Valid; warn: price-only offer, no rating (not eligible for rich result) |
| WebApplication /editor | Valid; warn: duplicate entity, publisher lacks logo |
| Article /dice-art | Pass (has image, dates, author, publisher) |
| Article blog x2 | Pass minus warnings: no image, stale dateModified, SVG logo |
| FAQPage x2 | Valid; no Google benefit since 2026-05-07 (Info) |
| HowTo | Valid; deprecated (Info, remove) |
| BreadcrumbList x4 | Pass |
| ImageGallery x2 | Pass (stale year) |
Errors: 0. Warnings: ~10. No placeholder text, no relative URLs, no http contexts.

## Ready-to-paste snippets

### 1. Root layout graph (app/layout.tsx replaces websiteJsonLd)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://diceify.art/#organization",
      "name": "Diceify",
      "url": "https://diceify.art",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://diceify.art/#logo",
        "url": "https://diceify.art/android-chrome-512x512.png",
        "contentUrl": "https://diceify.art/android-chrome-512x512.png",
        "width": 512,
        "height": 512
      },
      "image": { "@id": "https://diceify.art/#logo" },
      "founder": { "@id": "https://diceify.art/#john" },
      "sameAs": [
        "https://www.instagram.com/diceify.art/",
        "https://www.tiktok.com/@diceify.art"
      ]
    },
    {
      "@type": "Person",
      "@id": "https://diceify.art/#john",
      "name": "John Mikhail",
      "jobTitle": "Founder",
      "url": "https://diceify.art/blog/why-i-built-diceify",
      "worksFor": { "@id": "https://diceify.art/#organization" }
    },
    {
      "@type": "WebSite",
      "@id": "https://diceify.art/#website",
      "name": "Diceify",
      "url": "https://diceify.art",
      "description": "Free dice art generator for portraits and mosaics. Turn any photo into buildable dice patterns.",
      "inLanguage": "en",
      "publisher": { "@id": "https://diceify.art/#organization" }
    }
  ]
}
```
(Better still: only on `/`; other pages reference the `@id`s.) Add a real `url` for John (LinkedIn etc. in `sameAs`) when available.

### 2. Homepage WebApplication with tiers (app/(marketing)/page.tsx; build from PRICING)
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": "https://diceify.art/#app",
  "name": "Diceify",
  "url": "https://diceify.art",
  "description": "Diceify is a free dice art generator that turns photos into dice portraits and mosaics. Upload any image, tune contrast and detail, then follow step-by-step instructions to build your design by hand.",
  "applicationCategory": "DesignApplication",
  "operatingSystem": "Any (web browser)",
  "browserRequirements": "Requires JavaScript",
  "isAccessibleForFree": true,
  "image": "https://diceify.art/images/og-card.jpg",
  "featureList": ["Photo to dice pattern", "Contrast and detail tuning", "Black and white dice (12 shades)", "Step-by-step builder with progress tracking", "SVG export (paid plans)"],
  "publisher": { "@id": "https://diceify.art/#organization" },
  "offers": [
    { "@type": "Offer", "name": "Explorer (free)", "price": "0", "priceCurrency": "USD", "url": "https://diceify.art/#pricing" },
    { "@type": "Offer", "name": "Creator (30 days access)", "price": "19", "priceCurrency": "USD", "url": "https://diceify.art/#pricing" },
    { "@type": "Offer", "name": "Studio (monthly)", "price": "9", "priceCurrency": "USD",
      "priceSpecification": { "@type": "UnitPriceSpecification", "price": "9", "priceCurrency": "USD", "billingDuration": "P1M", "unitCode": "MON" }, "url": "https://diceify.art/#pricing" },
    { "@type": "Offer", "name": "Studio (yearly)", "price": "36", "priceCurrency": "USD",
      "priceSpecification": { "@type": "UnitPriceSpecification", "price": "36", "priceCurrency": "USD", "billingDuration": "P1Y", "unitCode": "ANN" }, "url": "https://diceify.art/#pricing" }
  ]
}
```
Verify the amounts against PRICING and that "SVG export" matches the pricing UI. Delete the separate /editor WebApplication or point it at `{"@id":"https://diceify.art/#app"}` via `mainEntity`/`isPartOf`.

### 3. Blog Article (app/(marketing)/blog/[slug]/page.tsx)
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Why I Built Diceify",
  "description": "The story behind Diceify, a COVID project born out of frustration with existing dice art tools, and a tribute to Um Kulthum.",
  "image": ["https://diceify.art/images/og-card.jpg"],
  "datePublished": "2024-01-24",
  "dateModified": "2024-01-24",
  "author": { "@type": "Person", "name": "John Mikhail", "@id": "https://diceify.art/#john" },
  "publisher": { "@id": "https://diceify.art/#organization" },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://diceify.art/blog/why-i-built-diceify" },
  "inLanguage": "en"
}
```
Add an optional `modified` and `image` field to blog/data.ts posts rather than reusing post.date (this is a content-model change; ask before doing).

### 4. /dice-art
Same Article, with `"author": {"@id": "https://diceify.art/#john"}`, `publisher` by @id; delete the HowTo block; keep or drop FAQPage per item 10.

## Missing opportunities (ranked)
1. Organization sameAs + single @id graph (cheap, entity/brand disambiguation).
2. Tiered Offers (accuracy; no rich result).
3. Article image + honest dateModified, Person author with URL.
4. Visible author/about page to back the Person node.
5. VideoObject only if a real video is added. No speakable, no Review/AggregateRating unless genuine.

## Schema score: 72 / 100
Deductions: no unified Organization/sameAs (-8), duplicated/inconsistent Organization and logo (-5), offer ignores tiers and duplicate editor entity (-5), deprecated HowTo and low-value FAQPage still shipped (-4), blog Article gaps (-4), stale copyright year (-2).

## What works
- All JSON-LD is server-rendered in static HTML (visible to non-JS crawlers, AI bots).
- Zero syntax errors, https context, absolute URLs, ISO dates, no placeholders.
- BreadcrumbList correct on all deep pages (GSC confirms).
- ImageObject carries the full license/credit/creator set; GSC confirms Image Metadata.
- /dice-art Article is complete (image, dates, publisher, mainEntityOfPage); FAQ answers match visible copy.
- JsonLd component escapes `<`, a good practice.
