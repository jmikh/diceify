# Images audit: diceify.art (2026-10-03)

**Images score: 55 / 100** (alt text complete and format is modern, but every image is delivered oversized at a single size).

## Evidence (Lighthouse 12.8.2)
- `unoptimized: true` in `next.config.js` means `next/image` emits plain `<img src>` (no `srcset`, `sizes` is ignored). All 47 home images, 0 srcset.
- Source files are 600x600 webp at 140-175 KB each (dice patterns are high-frequency detail, so webp compresses poorly at this quality). Displayed at 174 CSS px (gallery mobile, 305 device px at DPR 1.75) and 221 px (desktop).
- `uses-responsive-images` waste: home 981 KiB m / 1,222 d; gallery 1,432 / 1,680; dice-art 336 / 314. `image-delivery-insight` savings: home 1,308 / 1,365 KiB; gallery 1,889 / 1,848; dice-art 361 / 344. Per image waste is 95-150 KB of each 140-175 KB file (about 70-85%).
- Image transfer: home 1.41 MB m, gallery 2.01 MB m, dice-art 376 KB m.
- Worst offenders by waste (home desktop): `jeremy-dice-portrait.webp` 157 KB (1024x638 blog image, 140 KB wasted), `frida-54x54.webp` 174 KB, `kobe-71x71.webp` 165 KB, `ummkulthum58x58.webp` 162 KB. Dice-art: `kids-50x50-white/both/black.webp` 143/120/110 KB at 560x560 shown at about 230-300 px.
- Hero: `kids-dice.webp` (138 KB) and `kids-photo.webp` (79 KB), both 1240x1096, shown at 541x478 desktop, fetched `High` at 333 ms. `couples`/`pets` variants are 156-186 KB each.

## Issues
1. **HIGH: no responsive delivery.** Fix below.
2. **HIGH: above-fold gallery image is `loading="lazy"`** (gallery LCP 6.1 s mobile): `GalleryCard` in `app/(marketing)/gallery/page.tsx` needs `priority` on the first row (see performance.md #1). Nothing else above the fold is lazy: home and dice-art LCP are text, the hero images have `fetchPriority="high"`. Home `offscreen-images` passes (score 1).
3. **MEDIUM: width/height missing on /dice-art and /gallery.** These use `next/image` with `fill`, so there is no intrinsic dimension attribute. Lighthouse `unsized-images` passes and CLS is 0 because the parent boxes are fixed (`aspect-square` + `relative`, `.gallery-page-card-image`), so this is not a CLS risk today. It would only matter if the wrapper CSS is removed. Hero `DiceLens` imgs do have width/height. To be thorough, either keep `fill` inside aspect-ratio wrappers (current, fine) or pass `width={600} height={600}` and drop `fill`. No change needed for CWV.
4. **MEDIUM: hidden "reveal" hero photo is `fetchPriority="high"`** (`features/marketing/components/DiceLens.tsx` line 91, 79 KB) and competes with the LCP resources on mobile. Make it `loading="lazy"`/no priority.
5. **LOW: blog images** `why-i-built-diceify.webp` 98 KB and `jeremy-dice-portrait.webp` 157 KB at 1024 px are used in small `BlogCard`s via `fill` with no `sizes`; the same fix applies.
6. Format: webp everywhere, which is good. AVIF would save a further ~20-30% on photos but gains are uncertain on dice patterns; try one file first. Alt text is complete (per orchestrator context); decorative images use `alt=""`.

## Recommended fix (static export, no server)
Option A (recommended): build-time variants + custom loader. Keep it in the repo, no runtime cost.
1. Script (sharp is already a devDependency) that writes `name-320.webp`, `name-480.webp`, `name-640.webp` next to each source (cards need up to about 305-390 device px; the 600 px original stays as the largest). Run in `prebuild`, output to `public/images/` or generated into `out/`. Use quality 72-78 and `effort: 5`. Expected sizes: ~25-40 KB at 320, ~50-70 KB at 480 for these dice images (estimate, not measured).
2. `next.config.js`: remove `unoptimized: true`; set
```js
images: {
  loader: 'custom',
  loaderFile: './lib/image-loader.ts',
  deviceSizes: [320, 480, 640],
  imageSizes: [], // optional; keep slots snapped to deviceSizes
},
```
3. `lib/image-loader.ts`: `export default ({ src, width }) => src.replace(/\.webp$/, `-${width}.webp`)` (only for `/images/*.webp`; return `src` untouched for others). With a custom loader `next/image` emits a real `srcset` + `sizes` in a static export, so the existing `sizes` props on gallery (`(max-width: 768px) 45vw, 280px`), dice-art (`(max-width: 768px) 30vw, 230px`) become effective. Fix the ones that are wrong: `Gallery.tsx` marquee `sizes="280px"` is fine; dice-art 4-up grid `sizes="350px"` should be `(max-width: 768px) 45vw, 350px`; BlogCard has no `sizes` (add one) and hero DiceLens uses a raw `<img>`, so add `srcSet` + `sizes="(max-width: 768px) 90vw, 541px"` with 640/1240 variants (generate a 640 hero too).
4. Expected savings: gallery 1.4-1.9 MB (about 75%), home 1.0-1.3 MB, dice-art about 300 KB; mobile LCP (gallery) and TTI improve most. Resulting mobile image weight is about 0.35-0.5 MB gallery, 0.3-0.45 MB home (estimates).
Option B: Cloudflare Image Resizing/Transformations via `/cdn-cgi/image/width=480,format=auto,quality=75/images/x.webp`. Needs Transformations enabled on the zone (free tier covers 5,000 unique transformations/month, then paid). Only works on the custom domain, not workers.dev previews, and the transform is lazy on first request. Simpler code (the same loader returns the cdn-cgi URL) but adds a dependency and per-image cold latency. Choose it only if variants-in-repo are unwanted.
Also: add the long-cache rule for `/images/*` (performance.md #2) and use content-hashed or renamed variants so replacements invalidate.

## What works
- All images webp; alt text complete; decorative images use `alt=""`.
- Hero images have intrinsic width/height and `fetchpriority="high"`; no CLS from images (CLS 0 on all runs except 0.032 hero text on desktop).
- Most below-fold images are lazy (44 of 47 on home), `offscreen-images` audit passes.
- Pixel sources are 600 px (not 4000 px camera files), so the fix is a simple downscale.
