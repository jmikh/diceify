# Step A2 — Pure core: sampling, mapping, generate, stats, fixtures

Scope (tiered plan): `core/dice/{types,mapping,sample,generate,stats,index}.ts` + tests, `scripts/gen-fixtures.ts`,
`core/dice/__fixtures__/*.json`, `core/README.md`, `core/purity.test.ts`. Old `lib/dice/*` untouched (still the
runtime path until B1). No behavior change for the app.

## Repo state found

- `lib/dice/generator.ts` is the reference: `mapToDice` thresholds (`both`: white 1..6 at ≥217/192/166/141/115/90,
  black 6..2 at ≥64/51/39/26/13, else black 1; `black`: ≥141/115/90/64/39 → 6..2 else 1; `white`: ≥`255*k/6`,
  k=5..1 → 1..5 else 6); gamma applied only when `gamma !== 1`, then contrast (clamped only inside its branch);
  `cols = Math.round(numRows * (W / H))`; sharpening kernel `[0,-f,0; -f,4f+1,-f; 0,-f,0]`, `f = strength/100`,
  interior pixels only, clamp 0..255. Grid orientation `y = rows - 1 - pixelRow` (y=0 bottom).
- `lib/store/useEditorStore.ts` defaults: numRows 30, 'both', contrast 0, gamma 1, edgeSharpening 0, rotations off.
- `sharp@0.34.5` is a runtime dep but nothing under `app/ components/ lib/` imports it → safe to move to dev.
- **`public/demo-portrait.jpg` is a 329-byte text placeholder, not an image** (sharp: "unsupported image format").
  Portrait fixtures use `public/images/monalisa.webp` (600×600, real image, shipped in the gallery) instead.
- `tsc -p core` (`types: []`) still resolves `node:fs` / `Buffer` in `*.test.ts` because vitest's typings reference
  `@types/node` — so fixture-loading tests can stay under `core/`. Nothing listening on :3000.

## Modules (all pure; `core` imports only `core`)

```ts
// core/dice/types.ts
type DiceFace = 1|2|3|4|5|6; type DiceColor = 'black'|'white'; type ColorMode = 'both'|'black'|'white'
interface Die { face: DiceFace; color: DiceColor; rotate90?: boolean }   // key present ONLY when true
interface DiceGrid { width: number; height: number; rows: Die[][] }      // rows[y][x], y=0 = bottom row
interface DiceParams { numRows; colorMode; contrast; gamma; edgeSharpening; rotate6; rotate3; rotate2 }
interface DiceStats { blackCount; whiteCount; totalCount }
interface Pixels { data: Uint8ClampedArray; width; height }             // RGBA, row-major, top-down
interface GridPos { x: number; y: number }
const DEFAULT_DICE_PARAMS: DiceParams

// core/dice/mapping.ts
toGray(r,g,b): number                      // 0.299r + 0.587g + 0.114b
applyGamma(gray, gamma): number            // gamma===1 ? gray : 255*(gray/255)^(1/gamma)
applyContrast(gray, contrast): number      // contrast<=0 ? gray : clamp(128+(gray-128)*(1+contrast/100), 0, 255)
type ThresholdStep = { min: number; face: DiceFace; color: DiceColor }
const THRESHOLDS: Record<ColorMode, readonly ThresholdStep[]>  // descending; last entry = catch-all (min 0)
mapBrightnessToDie(brightness, mode): { face; color }          // first step with brightness >= min
shouldRotate(face, params: Pick<DiceParams,'rotate6'|'rotate3'|'rotate2'>): boolean
mapGrayToDie(gray, params): Die            // gamma → contrast → threshold → rotate (the per-cell pipeline)

// core/dice/sample.ts
toGrayImage(px: Pixels): Float32Array                    // alpha ignored
axisWeights(size, n): { first: number; weights: number[] }[]   // cell i covers [i*size/n, (i+1)*size/n)
downsample(gray, w, h, cols, rows): Float32Array          // exact area average, see README for summation order
sharpen(gray, w, h, strength): Float32Array               // 3×3 kernel, 1-px border copied, clamp 0..255

// core/dice/generate.ts
computeGridSize(imageW, imageH, numRows): { cols; rows }  // rows=numRows, cols=max(1, round(numRows*(W/H)))
generateDiceGrid(px: Pixels, params: DiceParams): DiceGrid

// core/dice/stats.ts
computeStats(grid: DiceGrid): DiceStats

// core/dice/index.ts — re-exports types, geometry, mapping, sample, generate, stats
// core/dice/__fixtures__/format.ts — Fixture type, encodeDie, encodeGrid (test tooling, not re-exported)
```

Pipeline in `generateDiceGrid`: `toGrayImage` → `downsample` → (`edgeSharpening > 0` ? `sharpen`) → for pixel row
`r` (0 = top), grid `y = rows-1-r`, each cell `mapGrayToDie(small[r*cols+x], params)`.

Intermediate images are `Float32Array` (values stored as float32 between stages, accumulated in doubles). Sharpening
runs on the small gray image instead of the old RGB `Uint8ClampedArray`, so it no longer rounds to integers between
stages — the only intended numeric difference from `lib/dice/generator.ts` (the old browser `drawImage` resample was
never reproducible anyway).

## Fixtures

`core/dice/__fixtures__/<name>.json`:

```json
{ "name": "…", "width": 120, "height": 90, "rgbaBase64": "…", "params": { …full DiceParams… },
  "expected": { "width": 40, "height": 30, "rows": ["w3 b6r w1 …", …] } }
```

**Design change vs plan:** `expected.rows` is `string[]` — one space-separated line per grid row (row 0 = bottom),
dice encoded `w3` / `b6r` — instead of `string[][]`. Same information, files ~30% smaller, and
`JSON.stringify(f, null, 2)` already prints one row per line (no custom serializer needed for readable diffs).

| file | image | params | grid |
|---|---|---|---|
| `portrait-120x90-default` | monalisa.webp → 120×90 (cover) | defaults | 40×30 |
| `portrait-64x64-tuned` | monalisa.webp → 64×64 | both, contrast 40, gamma 1.3, sharpen 60, rotate6 | 30×30 |
| `portrait-64x64-white-24` | same 64×64 | white, numRows 24 | 24×24 |
| `gradient-256x16-{both,black,white}-16` | synthetic, pixel (x,y) = gray x | mode ×, numRows 16 | 256×16 (one cell per gray level → every threshold covered) |
| `checker-32x32-tuned-32` | synthetic 8×8 checker of 4-px blocks, grays 64/192 | tuned set, numRows 32 | 32×32 (1 cell/px: sharpen edges + border rule + clamping visible) |
| `checker-32x32-default` | same checker | defaults (numRows 30) | 30×30 (non-integer 1.067-px cells) |

`scripts/gen-fixtures.ts` (`npm run gen-fixtures` = `tsx scripts/gen-fixtures.ts`): decodes the portrait with sharp
(`.resize(w,h).raw().ensureAlpha()`), builds the synthetic images in code, runs `generateDiceGrid`, writes the JSON.
Regen must be idempotent (clean `git diff`). Package changes: `sharp` → devDependencies, add `tsx` (dev),
script `gen-fixtures`.

## Tests (vitest, node)

- `mapping.test.ts`: `toGray` weights; `applyGamma` identity at 1 / fixed points 0,255 / known value; `applyContrast`
  identity at ≤0, known value, clamps both ends, 128 fixed point; `THRESHOLDS` pinned to literal arrays; for every
  boundary `t` in every mode: `t` and `t+1` → upper step, `t-1` → lower step; 0 and 255 extremes; `shouldRotate`
  per flag × face; `mapGrayToDie` omits `rotate90` unless true.
- `sample.test.ts`: `toGrayImage` layout + alpha ignored; `axisWeights` sums to `size/n`, contiguous, in bounds
  (integer, non-integer, and upsampling ratios); `downsample`: constant → constant (non-integer ratio), 2×2 checker →
  1×1 mean, exact multiple → block means, analytic 3→2 case ([0,100,200] → [33.33, 166.67]); `sharpen`: strength 0 is
  identity (exact), borders untouched at 100, interior value matches the kernel by hand, clamps at 0 and 255, does not
  mutate input.
- `generate.test.ts`: `computeGridSize` pins (120×90/30 → 40×30, 64×64/30 → 30×30, 256×16/16 → 256×16,
  10×1000/30 → 1×30); orientation (top-dark/bottom-light 1×2 image → `rows[0]` is the light die); every
  `__fixtures__/*.json`: decode → generate → `encodeGrid` equals `expected.rows`, dims equal `computeGridSize`.
- `stats.test.ts`: counts on a hand-built grid, empty grid → zeros, total = black + white.
- `core/purity.test.ts`: dynamically imports every non-test `.ts` under `core/` (recursive); asserts
  `globalThis.document` and `globalThis.ImageData` are undefined in the test runtime.

## Verification

`npm run typecheck` → 0 · `npm test` → 0 (6 files, 93 tests) · `npm run lint` → 0 (0 errors, 89 warnings — same
set as A1, none under `core/` or `scripts/`) · `npm run build` → 0 (23 routes). Fixtures: 8 files, 248 KB combined;
`npm run gen-fixtures` after `git add` → empty `git diff`. ESLint `core/**` override verified on a probe file
(`document` → `no-restricted-globals` error, `react` import → `no-restricted-imports` error).
