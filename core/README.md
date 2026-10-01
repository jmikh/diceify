# `core/` — pure dice engine

Plain TypeScript with no DOM, no React and no imports from the rest of the app (`core` imports only `core`).
It typechecks against `lib: ["es2022"]` (`tsc -p core`), and every module is loaded in plain Node by
`core/purity.test.ts`. This document is the algorithm spec, written so the engine can be ported (e.g. to Swift)
and validated against `core/dice/__fixtures__/*.json`.

## Data layout

- **`Pixels`** `{ data: Uint8ClampedArray, width, height }`: RGBA, 8 bits per channel, row-major, **top row
  first**. Alpha is ignored everywhere (no premultiplication). Index of pixel (x, y) is `(y * width + x) * 4`.
- **Gray images** between stages are `Float32Array`, row-major, top row first, one value per pixel in 0..255.
  Arithmetic happens in double precision; each stage's result is stored as float32 (IEEE round-to-nearest).
- **`DiceGrid`** `{ width, height, rows: Die[][] }`: **`rows[y][x]` with `y = 0` the BOTTOM row** (the build
  row number users see). Pixel row `r` of the downsampled image (0 = top) becomes grid row `y = height - 1 - r`.
- **`Die`** `{ face: 1..6, color: 'black' | 'white', rotate90?: true }` — `rotate90` is present only when true.
- **`DiceParams`** `{ numRows, colorMode: 'both' | 'black' | 'white', contrast: 0..100, gamma, edgeSharpening:
  0..100, rotate6, rotate3, rotate2 }`. Defaults: `DEFAULT_DICE_PARAMS` (70 rows, both, 25, 1, 5, all false).

## Pipeline (`generateDiceGrid(px, params)`)

1. `computeGridSize(W, H, numRows)`: `rows = numRows`, `cols = max(1, round(numRows * (W / H)))` — note the
   aspect ratio `W / H` is computed first, then multiplied (this order is what the fixtures pin).
2. `toGrayImage`: `gray = 0.299 * R + 0.587 * G + 0.114 * B` per pixel.
3. `downsample(gray, W, H, cols, rows)`: exact area average (below).
4. If `edgeSharpening > 0`: `sharpen(small, cols, rows, edgeSharpening)` (below).
5. Per cell, `mapGrayToDie`: `applyGamma` → `applyContrast` → `mapBrightnessToDie` → `shouldRotate`.

### Exact area average (`downsample`)

Cell `i` of `n` along an axis of `size` pixels covers the half-open interval `[i * size / n, (i + 1) * size / n)`
(`axisWeights`: `start = (i * size) / n`, `end = ((i + 1) * size) / n`, integer products first). Source pixel `p`
(from `floor(start)` while `p < end && p < size`) gets weight `min(p + 1, end) - max(p, start)`. Weights along an
axis sum to `size / n`; this also handles `n > size` (cells narrower than a pixel).

For each cell (outer loop over cell rows, inner over cell columns), with a single double accumulator:

```
total = 0
for each covered source row j (top → bottom):
    rowSum = 0
    for each covered source column i (left → right):
        rowSum += gray[row j][col i] * wx[i]
    total += rowSum * wy[j]
value = total / ((width / cols) * (height / rows))
```

### Sharpening (`sharpen`)

3×3 convolution on the small gray image with `f = strength / 100`:

```
[ 0   -f    0 ]
[-f  4f+1  -f ]
[ 0   -f    0 ]
```

Products are summed in kernel order (row by row, left to right, including the zero corners). The 1-pixel border
(`x = 0`, `y = 0`, `x = width - 1`, `y = height - 1`) is copied unchanged. Interior results are clamped to 0..255.
`strength = 0` is the exact identity. (The legacy browser implementation ran the same kernel on RGB bytes and
rounded to integers; this one runs on float gray, so results can differ by a threshold step at edge pixels.)

### Tone (`mapping.ts`)

- `applyGamma(gray, gamma)`: `gamma === 1 ? gray : 255 * (gray / 255) ^ (1 / gamma)`.
- `applyContrast(gray, contrast)`: `contrast <= 0 ? gray : clamp(128 + (gray - 128) * (1 + contrast / 100), 0, 255)`.
  Only the contrast branch clamps; gamma never leaves 0..255 for inputs in 0..255.

### Thresholds (`THRESHOLDS`, `mapBrightnessToDie`)

Steps are checked top to bottom; the first with `brightness >= min` wins; the last row is the catch-all.

| mode | brightness ≥ | die |
|---|---|---|
| both | 217 / 192 / 166 / 141 / 115 / 90 | white 1 / 2 / 3 / 4 / 5 / 6 |
| both | 64 / 51 / 39 / 26 / 13 / else | black 6 / 5 / 4 / 3 / 2 / 1 |
| black | 141 / 115 / 90 / 64 / 39 / else | black 6 / 5 / 4 / 3 / 2 / 1 |
| white | 255·5/6 (212.5) / 255·4/6 (170) / 255·3/6 (127.5) / 255·2/6 (85) / 255·1/6 (42.5) / else | white 1 / 2 / 3 / 4 / 5 / 6 |

### Rotation (`shouldRotate`)

`(rotate6 && face === 6) || (rotate3 && face === 3) || (rotate2 && face === 2)`. When true the die gets
`rotate90: true`; otherwise the key is absent.

### Stats (`computeStats`)

Counts dice by color over `rows`; `totalCount = blackCount + whiteCount`.

## Fixtures (`core/dice/__fixtures__/*.json`)

```json
{
  "name": "portrait-120x90-default",
  "width": 120, "height": 90,
  "rgbaBase64": "<width * height * 4 raw RGBA bytes, base64>",
  "params": { "numRows": 30, "colorMode": "both", "contrast": 0, "gamma": 1, "edgeSharpening": 0,
              "rotate6": false, "rotate3": false, "rotate2": false },
  "expected": { "width": 40, "height": 30, "rows": ["w3 b6r w1 …", "…"] }
}
```

`expected.rows[y]` is grid row `y` (row 0 = bottom), dice space-separated and encoded as color initial + face
+ `r` when rotated (`w3`, `b6r`). A port passes when, for every fixture, decoding `rgbaBase64` and running the
pipeline with `params` reproduces `expected` exactly. `core/dice/generate.test.ts` does this for the TypeScript
implementation.

Inputs: `public/images/monalisa.webp` resized to 120×90 and 64×64 (decoded with `sharp`), a 256×16 horizontal
gradient (pixel (x, y) has gray x, so one cell per gray level at 16 rows), and a 32×32 checkerboard of 4-px blocks
(grays 64 / 192). Regenerate with `npm run gen-fixtures` (`scripts/gen-fixtures.ts`); the output must be
byte-identical on rerun. Changing any formula or threshold above means regenerating the fixtures on purpose and
reviewing the diff.
