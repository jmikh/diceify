# Sitemap audit: https://diceify.art (2026-10-03)

Source: live /sitemap.xml (data/raw/sitemap.xml.html), app/sitemap.ts, app/robots.ts, lib/seo.ts, app/(editor)/layout.tsx.

## Validation
| Check | Result |
|---|---|
| XML well-formed, sitemap namespace | PASS (python minidom) |
| Size / count (<=50k URLs, <=50MB) | PASS (7 URLs) |
| Declared in robots.txt | PASS (https://diceify.art/sitemap.xml) |
| All 7 URLs 200, index,follow, self-canonical | PASS (per CONTEXT.md; / re-checked 200) |
| Sitemap URLs vs robots.txt | PASS (no URL is disallowed; only /account is, and it is absent) |
| Deprecated tags priority/changefreq | FAIL (Info): on all 7 URLs, ignored by Google |
| lastmod valid W3C datetime | PASS format (`2024-01-24T00:00:00.000Z`), but see below |
| lastmod present | WARN: missing on 5 main pages |
| Missing pages | none; /privacy, /terms intentionally absent (fine) |
| Non-200 / redirected / noindexed entries | none |

## Findings

1. **Low/Info: priority + changefreq on every URL.** Google ignores both. They are not an error and not what produces GSC warnings, but they are noise. Remove.

2. **Medium: GSC "29 warnings" cannot be fully attributed from the data here; most likely a stale processed copy.** The live file has 7 URLs but GSC says "8 submitted"; 8 != 7 proves GSC's counters/warnings come from an older version of the file (last *submitted* 2026-03-10, before the recent seo fixes; the earlier app/sitemap.ts evidently emitted build-date lastmod on every URL per the comment in the code, and probably one more URL). The warnings are therefore most plausibly historical. The warning text is not in our data: open GSC > Sitemaps > sitemap.xml > "See page indexing"/details and read the message before concluding. Ranked hypotheses: (a) stale report from the old version (most likely, 8 vs 7); (b) the unreliable build-date lastmod era; (c) homepage loc without trailing slash; (d) 2023/2024 blog lastmod flagged as stale (GSC does not warn on this). changefreq/priority do not cause warnings.

3. **Low: homepage `https://diceify.art` vs Google canonical `https://diceify.art/`.** For a root URL these are the same URL (the browser/Google normalise the empty path to `/`), so this is not a real mismatch and not a warning source. Cosmetic fix only: emitting `https://diceify.art/` in the sitemap is harmless, but then keep it consistent with the canonical tag in lib/seo.ts (`path === '/' ? SITE_URL`). Recommendation: leave the canonical alone, change nothing here unless you want the cosmetic alignment (one-line change in both places).

4. **Medium: lastmod missing on the 5 main pages.** Omitting is the correct choice versus a fake build date, but it forfeits the freshness signal and leaves the two blog dates (Nov 2023, Jan 2024) as the only dates, which advertises a stale site. Better: give each static page a real hand-maintained `lastModified` that you bump only on meaningful content change (e.g. a `lastModified` constant per page in one module), and keep blog dates real. Do not generate from build time. Also emit blog lastmod as plain `YYYY-MM-DD` (Next outputs full ISO; both valid).

5. **Medium: /editor in the sitemap.** Metadata is self-canonical, index,follow, it ranks pos 28 with 8 clicks / 296 impr in 90 d, and 297 GA4 organic sessions land on it, so it does attract entries ("dice art builder/editor" queries). But it is a client-rendered shell: 66 non-JS words ("Loading workspace…"), and /account has identical title/description. Recommendation: keep it (it is a legitimate, indexed landing target and is not blocked), but do not rely on it; the real fix is to give /editor some static crawlable text (an intro paragraph, how-it-works) in the server HTML. Remove it from the sitemap only if you decide to noindex it. Also: /account is `index,follow` with the same title but is Disallowed in robots.txt; a disallowed page cannot show its noindex, so add `robots: noindex` metadata is ineffective while disallowed. Low priority; leave it out of the sitemap (already is).

6. **Medium: /blog/why-i-built-diceify "Discovered - currently not indexed".** It is in the sitemap and linked from /blog, so discovery works; this is a quality/priority decision (thin, dated 2024, 0 body images, 2 internal links, sitelink-less). A sitemap resubmit will not fix it. Improve content/internal links (link from the homepage and /dice-art), request indexing once after that.

7. **Info: image sitemap for the gallery.** Google deprecated most image-sitemap necessity; images are already discovered via on-page `<img>` and ImageGallery JSON-LD (13 ImageObjects, Image Metadata rich result already detected). Gains are marginal; optional. If wanted, add `<image:image>` entries under /gallery (and / if desired) with `<image:loc>` only (title/caption tags were deprecated in 2022). Next's MetadataRoute.Sitemap supports `images: string[]` (Next 14.2+; verify installed version). I would skip it: lowest priority.

8. **Info: resubmit / ping.** Google's sitemap ping endpoint was retired (2023); do not ping. After deploying the corrected file: GSC > Sitemaps > resubmit `sitemap.xml` once (also clears the stale 8/0 counter and re-evaluates warnings). The "0 indexed" counter is a known-laggy sitemap-report figure; trust URL Inspection (8 of 9 indexed).

## Corrected sitemap (as generated after the change)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://diceify.art</loc><lastmod>2026-10-02</lastmod></url>
<url><loc>https://diceify.art/dice-art</loc><lastmod>2026-10-02</lastmod></url>
<url><loc>https://diceify.art/gallery</loc><lastmod>2026-10-02</lastmod></url>
<url><loc>https://diceify.art/editor</loc><lastmod>2026-10-02</lastmod></url>
<url><loc>https://diceify.art/blog</loc><lastmod>2026-10-02</lastmod></url>
<url><loc>https://diceify.art/blog/why-i-built-diceify</loc><lastmod>2024-01-24</lastmod></url>
<url><loc>https://diceify.art/blog/jeremy-dice-portraits-nieces</loc><lastmod>2023-11-21</lastmod></url>
</urlset>
```
(Static-page dates are placeholders: use the date each page's content last meaningfully changed, e.g. the 2026-10-02 SEO edits only if the visible content changed. If you cannot maintain them honestly, omit lastmod on those pages as today.)

## app/sitemap.ts change
```ts
import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { blogPosts } from '@/features/marketing/blog/data'

// Bump a date ONLY when that page's visible content meaningfully changes. Never use the build date.
const staticPages: { path: string; lastModified: string }[] = [
  { path: '', lastModified: '2026-10-02' },
  { path: '/dice-art', lastModified: '2026-10-02' },
  { path: '/gallery', lastModified: '2026-10-02' },
  { path: '/editor', lastModified: '2026-10-02' },
  { path: '/blog', lastModified: '2026-10-02' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...staticPages.map(({ path, lastModified }) => ({ url: `${SITE_URL}${path}`, lastModified })),
    ...blogPosts.map((post) => ({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: post.date })),
  ]
}
```
Removes changeFrequency/priority. (Optional gallery images: add `images: [...]` to the /gallery entry.)

## Priority summary
1. Read the actual GSC warning text; resubmit after deploy (Medium).
2. Strip priority/changefreq (Info); real lastmod or none (Medium).
3. Add static text to /editor; strengthen the unindexed blog post (Medium).
4. Image sitemap: skip/optional. No ping.
