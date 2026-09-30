# Step B1 — Browser adapters + pipeline on core

Scope (tiered plan): `lib/image/{decode,crop,rasterize}.ts`; `useDiceGeneration` rewritten as stages A/B/C on
`cropToPixels` (the single crop path); blueprint download + ProgressPreviewModal on `core/dice/svg`; delete
`lib/dice/*` and `lib/utils/image.ts`; grid orientation switch (`dice[x][y]` → `rows[y][x]`) for every consumer.
Not in scope: store split (B3), folder moves / CSS / brand (B5), the full builder port (B2).

## Repo state found

- Two crop paths: `CropperMain.performAutoCrop` (`cropper.getCanvas({ width: 2048, height: 2048/ratio })` →
  JPEG q0.95 data URL → `updateCrop(croppedImage, crop)`) for live edits, and `lib/utils/image.ts cropImage`
  (native size, rotation into bounding box) as the restore self-heal in `useDiceGeneration`. Grids differed after
  a reload because the two paths produced different pixel sizes.
- `useDiceGeneration` = `DiceGenerator` (browser `drawImage` sampling) + `DiceSVGRenderer.render` + a private
  `rasterizeSvg` with the logo pill (1080 long side). `ProgressPreviewModal` has a second rasterizer
  (`min(long*10, 1080)`, no logo) and reaches into `(renderer as any).getSvgDice`. `CommissionModal` does the same
  and is referenced only by its `page.tsx` mount and the `showCommissionModal` store flag (used nowhere else).
- Grid readers: `useBuildNavigation` (5 sites), `BuilderMain` (4 run scans + `renderWindow`), `ProgressPreviewModal`,
  `CommissionModal`, `useBlueprintDownload`, `useAutosave`/`ResetProgressModal` (width/height only).
- `lib/types/index.ts` duplicates `ColorMode/DiceParams/DiceStats/AspectRatio` from core and re-exports the old
  `DiceGrid`. `lib/dice/types.ts` also holds `DICE_GRAYNESS` (no importers). `lib/dice/{cache,renderer}.ts` have
  no importers outside `lib/dice`.
- No store error field exists (E2 adds one with Sentry). Nothing on :3000.

## `lib/image/` (browser adapters; may import core)

```ts
// decode.ts
loadImage(src: string): Promise<HTMLImageElement>
fitScale(width, height, maxSide): number            // min(1, maxSide / max(w, h)) — never upscales (pure, tested)
rotatedBounds(width, height, rotationDeg): { width, height }   // Math.round bounding box, as cropImage did (pure, tested)
drawRegion(img, region: { x, y, width, height, rotation }, maxSide): HTMLCanvasElement
   // ONE drawImage with translate/rotate/scale: rotate the source into its bounding box (cropper coordinate
   // space), crop `region` from it and scale by fitScale(region.w, region.h, maxSide). imageSmoothingQuality 'high'.
canvasToPixels(canvas): Pixels                      // getImageData → { data, width, height }
dataUrlToPixels(src, maxSide = 2048): Promise<Pixels>          // whole image, rotation 0
downscaleForUpload(file: File | Blob, maxSide = 2048, quality = 0.85): Promise<Blob>   // object URL → drawRegion → toBlob jpeg (for C3; trivial on the same helper)

// crop.ts
cropToPixels(src: string, crop: CropRegion, maxSide = 2048): Promise<Pixels>   // loadImage → drawRegion → canvasToPixels

// rasterize.ts
rasterizeSvg(svg: string, size: SvgSize, opts?: { logo?: HTMLImageElement | string }): Promise<string>
   // Blob URL → Image → canvas(size) → optional logo pill (top-right, 8.8 % height, 0.65 black rounded backdrop,
   // exactly the old useDiceGeneration math) → PNG data URL. Draw deferred through requestIdleCallback when present.
   // The SVG must already carry width/height (callers pass the same `size` to renderGridSvg/renderProgressSvg).
```

The single crop path: the cropper's coordinates are in the rotated image's bounding box, so `drawRegion` reproduces
`cropImage`'s geometry (rounded bounding box, centered rotation) without materialising the full-size rotated
canvas. `maxSide` only downscales (the old `getCanvas` always resampled to 2048 wide; a crop smaller than that is
now used at native resolution). Because live edits and restores both go through `cropToPixels(src, crop, 2048)`,
a draft reload yields exactly the same `Pixels`, hence the same grid and stats.

## Pipeline (`app/editor/hooks/useDiceGeneration.ts`)

One effect on `[originalImage, cropParams, diceParams]`, 300 ms debounce, `runId` guard, all three stages inside:

- **A** `cropToPixels(originalImage, cropParams, 2048)` memoised in a ref keyed
  `${originalImage.length}|${JSON.stringify(cropParams)}` — slider drags hit the cache, crop/upload changes miss.
- **B** `generateDiceGrid(px, diceParams)` + `computeStats(grid)` (sync) → `setDiceStats`, `setDiceGrid`.
- **C** `renderGridSvg(grid, rasterSize(w, h, 1080))` → `rasterizeSvg(svg, size, { logo })` → `setProcessedImageUrl`.

Self-heal is implicit (stage A is the derivation). Logo preloaded once via `loadImage('/logo-full.svg')`; until it
resolves the raster is unbranded (as before). Failures: `console.error` (no store field exists yet).

## Store / consumers

- `useEditorStore`: `croppedImage`, `setCroppedImage`, `updateCrop` removed (`updateCrop(crop)` would duplicate
  `setCropParams`, which already has the JSON-equality guard). `showCommissionModal` + setter removed.
  `DiceParams/DiceStats/DiceGrid/ColorMode/AspectRatio` now come from core via `lib/types` re-exports (no duplicate
  definitions; `WorkflowStep` stays there). `DEFAULT_DICE_PARAMS` imported from core.
- `CropperMain`: `getCanvas` dropped; `performAutoCrop` → `reportCrop` reads coordinates + rotation and calls
  `setCropParams`.
- `TunerMain`: loading trigger `croppedImage` → `cropParams`. `useProjectManager`: `setCroppedImage(null)` dropped.
- `useBlueprintDownload`: `renderGridSvg(grid)`.
- `ProgressPreviewModal`: `renderProgressSvg(grid, buildProgress, { showAll, ...size? })`; pro branch injects the
  standalone `<svg>` (fills its box); free branch `rasterizeSvg(svg, rasterSize(w, h, min(max(w, h) * 10, 1080)))`.
  Because `renderProgressSvg` uses `isCompleted` (current die not counted), the off-by-one the plan assigns to B2
  is fixed here as a side effect.
- `CommissionModal.tsx` deleted now (plus its mount in `page.tsx` and the store flag); `app/api/user/commission-interest`
  stays until E1 removes `app/api/**`.
- `useBuildNavigation` + `BuilderMain`: only the minimal changes to compile and keep the build step working —
  `dice[x][y]` → `rows[y][x]` and `renderWindow(grid, x0, x1, y0, y1)` → `renderWindowSvg(grid, { x0, x1, y0, y1 })`.
  B2 ports the scans/viewBox/window math to `core/dice/build`.

## Deleted

`lib/dice/{generator,svg-renderer,renderer,cache,types}.ts`, `lib/utils/image.ts`, `components/CommissionModal.tsx`.

## Tests

- `core/dice/svg.test.ts`: the legacy-equality test becomes an exact comparison against
  `core/dice/__fixtures__/svg-3x2.svg`, written from `renderGridSvg` while the old test still passed (so the
  "equals the old renderer" guarantee is frozen). The `@/lib/*` exemption for core tests stays in ESLint (comment
  updated) but is no longer used.
- `lib/image/decode.test.ts`: `fitScale` (never upscales, long side), `rotatedBounds` (0/90/180/45°, rounding) —
  the only pure parts; canvas work is not unit-testable under the node environment.

## Verification

`npm run typecheck && npm test && npm run lint && npm run build` → all 0 (see step log). Manual checks (plan):
upload→crop→tune preview; blueprint SVG opens; progress preview renders; draft reload yields identical stats
before/after.
