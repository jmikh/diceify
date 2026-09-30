# Step A3 — Pure core: build math, SVG, document, entitlements

Scope (tiered plan): `core/dice/{build,svg,document,document.schema}.ts`, `core/billing/{plans,entitlements,index}.ts`
+ tests; `zod` added as core's only external dependency. Old `lib/dice/*`, `lib/store`, `components/*` untouched
(B1/B2/B3 switch consumers). No behavior change for the app.

## Repo state found

- Build navigation lives in `components/Editor/Builder/useBuildNavigation.ts` (next/prev L52-68, diff scans
  L83-127, `canNavigate` L129-165, explorer limit L39-50: `floor(targetIndex / cols) >= 5` blocks, forward moves
  only) and `BuilderMain.tsx` (`ensureRendered` L72-97, `buildZoom` L100-167, run scans L441-460 / L527-548,
  hit-testing L331-344). The old grid is `dice[x][y]`; scans compare `face` and `color` only (`rotate90` ignored).
- `app/editor/hooks/useAutosave.ts` L69: `completedDice = y * gridWidth + x`. `components/ProgressPreviewModal.tsx`
  L61 marks `x <= progressX` as completed (counts the die being placed — off by one vs L69).
- `lib/dice/svg-renderer.ts`: `getSvgDice` (dot math inlined, same expressions as `getDotPositions(face, 100)`),
  `renderDefs` (`<symbol id='dice-{color}-{face}' viewBox='0 0 100 100'>`), `renderWindow` (SVG rows, inclusive,
  clamped, x-outer loop, `<use href='#dice-…' x y width='1' height='1'[ transform='rotate(90 cx cy)']/>`),
  `render` (x-outer/y-inner loop, black background, `style="width: 100%; …"`), `renderWithStats` (dead).
  `useDiceGeneration.ts` L32-44 replaces the `<svg …>` header with `width/height` at 1080 px long side.
- Legacy draft snapshot (`useAutosave.buildSnapshot`): `{ name, step, cropParams, diceParams, buildProgress,
  gridWidth, gridHeight, totalDice }`; older variants embed `originalImage`, use `projectName`, or keep progress
  under a separate localStorage key. Prisma `Project` columns in `prisma/schema.prisma` L59-90; load rules in
  `useProjectManager.ts` L202-252 (crop only when x/y non-null and width/height truthy; `||` defaults; step =
  build when progress > 0 else tune).
- Aspect options (`CropperPanel.tsx` L17-78): `1:1, 3:4, 4:3, 2:3, 16:9`; store default `'1:1'`. Slider bounds
  (`sliderConfigs.ts`): numRows 20..120, contrast 0..100, gamma 0.5..1.5, edgeSharpening 0..100.
- Billing: `lib/subscription.ts` PLAN_LIMITS uses `Infinity`; `lib/auth.ts` L85-102 session rule = lifetime always,
  creator/studio unless `subscriptionExpiresAt <= now`; `canManage` = customer && !lifetime && status !== creator_pass.
  `components/PricingCards.tsx` L12-49: creator $19 one-time, studio $9/mo, $36/yr, savings % derived.
- `zod@4.6.5` is already in `node_modules` (transitive via eslint-plugin-react-hooks); nothing on :3000.

## `core/dice/build.ts` (pure; row-major `rows[y][x]`, y = 0 bottom)

```ts
buildIndex(pos, width) = y*width + x            positionFromIndex(i, width) = { x: i % width, y: floor(i/width) }
countCompleted(progress, width) = buildIndex     // useAutosave L69
isCompleted(cell, progress)                      // y < py || (y === py && x < px)  ← intentional fix of modal's `<=`
sameDie(a, b)                                    // face && color (rotate90 ignored, as the current scans do)
findRun(row: Die[], x) → { start, end }          // inclusive extent of sameDie around x (BuilderMain L441-460)
findNextDiff(row, x) → number | null             // first x' > x with !sameDie(row[x'], row[x])
findPrevDiff(row, x) → number | null             // last  x' < x …
nextPosition(p, width, height) → GridPos | null  // x+1 on the row, else (0, y+1), null at the last die
prevPosition(p, width) → GridPos | null          // x-1, else (width-1, y-1), null at (0,0)
svgRow(y, height) = gridRowFromSvg(svgY, height) = height - 1 - y
ViewBox { x, y, w, h }      CellWindow { x0, x1, y0, y1 }   // inclusive; rows are SVG rows
computeViewBox({ current, cols, rows, zoomLevel, aspect, lastViewX }) → { viewBox, lastViewX }
visibleWindow(view, cols, rows, margin = 1)      // ensureRendered "need" rect
bufferedWindow(view, cols, rows)                 // ensureRendered render rect (buffer = ceil(w), ceil(h))
windowContains(outer, inner)
rowLimitAllows(target: GridPos, rowLimit: number | null)   // null → true; else target.y < rowLimit
```

`computeViewBox` is BuilderMain L102-167 verbatim (constants 0.15 / 0.85 / edgePadding 0.1 / padding 0.5,
`viewY = svgY - h * 0.6`, per-axis center-or-clamp) without the animation part; `lastViewX` is threaded in/out
instead of a ref. `rowLimitAllows` takes a position because `floor((y*cols + x) / cols) === y` for in-range x;
the "forward moves only" rule stays at the call site (B2), as today.

## `core/dice/svg.ts`

```ts
renderDieSymbolBody(face, color, rotate90 = false)   // <g[ transform='rotate(90 50 50)']><rect …/>circles</g>
renderDefs()                                          // 12 symbols, same ids/viewBox as today
renderWindowSvg(grid, win: CellWindow)                // defs + <use> refs; SVG rows, inclusive, clamped
renderGridSvg(grid, opts?: { background?, width?, height? })     // full <svg>; no opts = old render() output
renderProgressSvg(grid, progress, opts?: { placeholderFill?, placeholderStroke?, showAll?, width?, height? })
rasterSize(cols, rows, longSide) → { width, height }  // useDiceGeneration L32-39
```

Dot geometry comes from `getDotPositions(face, 100)` (same expressions as the old inline math, so identical
floats/strings). `renderGridSvg` keeps the x-outer/y-inner element order so the output equals the old `render`.
With `width/height`, the header carries `width="…" height="…"` instead of the `style` attribute (what the
rasterizer's regex produced). `renderProgressSvg` returns a full `<svg>` (background = placeholder fill) sharing
the same wrapper; placeholders are `<rect fill='#eae3d2' stroke='#dcd3bd' stroke-width='0.02'/>`. ProgressPreview's
raster sizing (`min(long*10, 1080)`) is `rasterSize(cols, rows, min(max(cols, rows)*10, 1080))`.

## `core/dice/document.ts` + `document.schema.ts` (zod)

```ts
CURRENT_SCHEMA_VERSION = 1;  ASPECT_RATIOS;  AspectRatio;  CropParams;  GridSize;  ProjectDocument (per plan)
DICE_PARAM_BOUNDS = { numRows: [20,120], contrast: [0,100], gamma: [0.5,1.5], edgeSharpening: [0,100] }
projectDocumentSchema (strict; nested strict objects; finite numbers; ints where applicable)
class DocumentError extends Error { code: 'INVALID' | 'UNSUPPORTED_VERSION' }
createDefaultDocument()                       // step 'crop', crop null, DEFAULT_DICE_PARAMS, grid null, {0,0}
migrateDocument(raw: unknown): ProjectDocument
fromLegacyProjectRow(row: LegacyProjectRow): ProjectDocument
nearestAspectRatio(w, h)                      // min |w/h − ratio|; invalid input → '1:1'
scaleCrop(crop, factor)                       // x,y,width,height × factor
documentStats(doc) → { totalDice, completedDice }   // completed clamped to 0..total; 0 when grid null
documentsEqual(a, b)                          // key-sorted JSON
cropParamsEqual(a, b, tolerance = 0.01)       // numeric fields only (as lib/store today); null === null
progressApplies(doc, baseline)                // matchesBuildBaseline semantics
```

`migrateDocument`: `schemaVersion === 1` → strict parse (throws `INVALID`); no `schemaVersion` → legacy draft:
`step` 'upload' → 'crop', `crop` from `cropParams` (+ `nearestAspectRatio(width, height)`), `dice` =
defaults ⊕ `diceParams` with numbers clamped to `DICE_PARAM_BOUNDS`, `grid` from `gridWidth/gridHeight`,
`buildProgress` from `buildProgress` (`|| 0`), then parse; other versions → `UNSUPPORTED_VERSION`; non-objects
→ `INVALID`. Legacy progress kept under `editorBuildProgress` is merged into the raw by the draft adapter (C3)
before calling. `fromLegacyProjectRow` mirrors `useProjectManager` L202-252 and the task rule step = build if
progress > 0 else tune if crop else crop (rows without an image are skipped by F1).

## `core/billing/{plans,entitlements}.ts`

`plans.ts`: `Plan`, `PLANS`, `PlanLimits`, `PLAN_LIMITS` (explorer {1, 5, false}, creator {1, null, true},
studio {5, null, true}, lifetime {5, null, true}), `CheckoutPlan`, `PRICING` (creator price 19 / accessDays 30 /
description; studio monthlyPrice 9 / yearlyPrice 36 / description), `STUDIO_YEARLY_MONTHLY_EFFECTIVE`,
`STUDIO_YEARLY_SAVINGS_PERCENT` (values copied from PricingCards; feature bullets stay in the component — JSX).

`entitlements.ts`: `PRO_SUBSCRIPTION_STATUSES`, `BillingState` (+ `hasStripeCustomer: boolean`), `Entitlements`,
`EXPLORER_ENTITLEMENTS` (signed-out default), `deriveEntitlements(b, now)`. Priority lifetime → studio (PRO status)
→ creator (`planExpiresAt > now`) → explorer. `accessUntil`: studio = `cancelAt ?? currentPeriodEnd`, creator =
`planExpiresAt`, else null. `renews` = studio && no `cancelAt`. `canManageBilling` = `hasStripeCustomer` (plan
decision; the old "not lifetime / not creator_pass" exclusions are dropped on purpose — any customer may open the
portal). Old rules covered: lifetime always; expired creator → explorer; `Infinity` replaced by `null`.
Comment in the file: `supabase/migrations/*_initial_schema.sql` `effective_plan`/`project_limit` (C1) must mirror it.

## Tooling

- `zod@^4` in `dependencies`. ESLint `core/**/*.ts` (non-test) gains an import allowlist: bare/scoped packages are
  restricted except `zod` (`no-restricted-imports` patterns `['*', '@*/*', '!zod']`); test files keep only the
  existing global/app-path restrictions (they need `vitest`, `node:*`, `@/lib/*` for the comparison test).
- `core/dice/index.ts` re-exports build/svg/document/document.schema; new `core/billing/index.ts`.
  `core/purity.test.ts` walks the tree, so the new modules are covered automatically.

## Tests

- `build.test.ts`: index round-trips; `countCompleted` / `isCompleted` (current die not counted); run/diff scans
  on hand-built rows (rotate90 ignored, ends of row → null); next/prev wrap + null at ends; `svgRow` involution;
  `rowLimitAllows` (null; y = limit−1 ok, y = limit blocked); `computeViewBox` pins: 30×30/zoom 8/aspect 2 → first
  view `(−0.1, 26.1, 8, 4)` at (0,0) and `(8.8, 21.6, 8, 4)` at (10,5) (die at 15%); keep at x=15
  (relativeX .775), pan at x=16 (→ 14.8), pan left at x=8 (→ 6.8); clamp at (29,29) → `(22.1, −0.1)`; height floor
  + X centering (3×3, aspect 2 → w 6, x −1.5); Y centering (5×4, aspect 1 → y −0.5); zoom floor 3; windows
  (`visibleWindow`, `bufferedWindow`, `windowContains`) on the pinned view.
- `svg.test.ts`: 3×2 grid (faces 1..6, one rotated die per color) → `renderGridSvg` equals the old
  `DiceSVGRenderer.render` after whitespace normalization (`\s+`→' ', `\s*>`→'>', `>\s+<`→'><'); `renderDefs` ids;
  `renderWindowSvg` clamps and rotates; `renderProgressSvg` places exactly `countCompleted` dice (and all with
  `showAll`); `rasterSize` landscape/portrait/square; sized header.
- `document.test.ts`: default doc validates; v1 passthrough; legacy draft (incl. `upload` step, `projectName`,
  missing progress, out-of-range numRows clamped, aspect inference); legacy Prisma row (rotation, aspect, step
  inference ×3, null crop); missing version on garbage → INVALID; version 2 → UNSUPPORTED; invalid v1 (extra key,
  NaN, out of range) → INVALID; `nearestAspectRatio`; `scaleCrop`; stats clamping (progress past the grid, grid
  null); `documentsEqual` key order; `cropParamsEqual` tolerance/null; `progressApplies` drift cases.
- `entitlements.test.ts`: cartesian plan × status × expiry (past/1 s ago/now/future/null) × cancelAt against the
  rule table; explicit pins (past_due is pro, canceled studio → explorer, creator expired by 1 s, cancel_at →
  `renews false` + `accessUntil = cancelAt`, `builderRowLimit === null` never `Infinity`, JSON round-trip equality,
  `canManageBilling` follows `hasStripeCustomer`); `PLAN_LIMITS` pinned; `PRICING` pinned.

## Verification

`npm run typecheck` → 0 · `npm test` → 0 (10 files, 200 tests; A2 had 93) · `npm run lint` → 0 (0 errors, 89 warnings —
same pre-existing set, none under `core/`) · `npm run build` → 0 (nothing on :3000). Import allowlist verified with a
probe file (`zod` and relative imports pass; `react`, `node:fs`, `@supabase/supabase-js`, `@/lib/*`, `zod/v4` fail).
Deviations from the task brief: schema bounds use the real slider range (numRows 20..120, not 10..150); legacy inputs
are clamped rather than rejected; `renderProgressSvg` is a full `<svg>`; `rowLimitAllows` takes a `GridPos`.
