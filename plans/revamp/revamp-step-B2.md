# Step B2 — Builder on core/build

Scope (tiered plan): `useBuildNavigation` + `BuilderMain` use `findRun/findNextDiff/computeViewBox/visibleWindow/
renderWindowSvg`; rules-of-hooks violation fixed and the rule raised to `error`; FPS/`D` debug + `.no-scrollbar`
removed. Not in scope: store split (B3), keydown → `useEditorShortcuts` (B4), folder moves (B5), `useEntitlements` (C2).

## Repo state found

- `components/Editor/Builder/BuilderMain.tsx` (718 lines): `BuildViewer` (L17-690) reads the grid from the store and
  returns `null` at L35 **before** 20+ hooks (31 `react-hooks/rules-of-hooks` warnings; rule is `warn` in
  `eslint.config.mjs` L37). The wrapper `BuilderMain` (L694-718) already shows a spinner when `diceGrid` is null, so
  the inner early return is unreachable in practice but breaks the rule.
  - `ensureRendered` L71-92 = `visibleWindow` + `windowContains` + `bufferedWindow` + `renderWindowSvg`.
  - `buildZoom` L95-238 = `computeViewBox` (L102-162, constants inlined, `lastViewXRef`) + `ensureRendered` +
    viewBox-string animation (`motion.animate` over a 0→1 progress, 1 s, `[0.25, 0.1, 0.25, 1]`, "close enough"
    threshold 0.01, first layout applied without animation, NaN guard on the parsed strings).
  - Grid-change effect L241-248 resets the rendered window and re-renders at the current viewBox.
  - Container measurement L251-270 (`ResizeObserver`), pinch zoom L301-320 (`useGesture`, steps of 2, 4..20),
    hit-testing L326-347 (`totalRows - 1 - cell.svgY`), keyboard L360-388 (arrows + `D` debug toggle).
  - Run scans duplicated at L430-455 (group rect) and L516-543 (badges); badge placement L550-565
    (`isAtTopEdge = currentY >= totalRows - 2` → badge below the die, sticks flipped).
  - FPS overlay L278-299 + L672-685; `<style jsx>` `.no-scrollbar` L392-400 (class used nowhere).
  - `animationRef = useRef<any>`, `devLog`/`useMemo` imported but unused.
- `useBuildNavigation.ts` (184 lines): four hand-written row scans (`navigatePrevDiff` L90-96, `navigateNextDiff`
  L111-120, `canNavigate` L137-142 / L149-154), `EXPLORER_ROW_LIMIT = 5` (L6), `enforceLimit(targetIndex)` L39-50
  (`floor(index / cols) >= 5` blocks; anonymous → auth modal, explorer → limit modal), `y * cols + x` at L21/L75/
  L116/L124, `hasUnlimitedDice`/`diceLimit` returned but consumed by nobody (BuilderPanel, MobileBuildControls and
  BuilderMain only use the navigation API + `currentIndex`/`totalDice`).
- `y * width + x` elsewhere: `components/ResetProgressModal.tsx` L21, `app/editor/hooks/useAutosave.ts` L69.
  `BuilderPanel` L204 / `MobileBuildControls` L35 already take `currentIndex` from the hook (nothing to change there).
- `ProgressPreviewModal` is on `renderProgressSvg`/`isCompleted` since B1 — verified, nothing to do.
- `vitest.config.ts` includes only `core/**`, `lib/**`, `features/**`, `supabase/functions/_shared/**` tests.
- Baseline: lint 0 errors / 81 warnings (31 rules-of-hooks); nothing listening on :3000.

## Decomposition (`components/Editor/Builder/`, no folder moves)

```
BuilderMain.tsx      wrapper only: useWakeLock, spinner while !diceGrid, else <BuilderLimitToast/> + <BuildViewer grid={diceGrid}/>
BuildViewer.tsx      the viewer; `grid: DiceGrid` prop is never null → every hook runs unconditionally
useBuildZoom.ts      zoomLevel state (8; 4..20, step 2), zoomIn/zoomOut, pinch gesture on a container ref
useBuildWindow.ts    rendered-cell window: { svgContent, ensureRendered(view) }
useBuildViewBox.ts   computeViewBox + animate → writes the <svg viewBox> attribute directly
useElementSize.ts    ResizeObserver → { width, height } | null (the old containerDimensions effect)
RunBadges.tsx        the two count badges (purple = run width, pink = dice left in the run) + edge placement
```

`BuildViewer` (target ≈ 200 lines): `useBuildNavigation()`, `useElementSize(containerRef)`, `useBuildZoom(containerRef)`,
`useBuildWindow(grid)`, `useBuildViewBox({ svgRef, current, cols, rows, zoomLevel, aspect, onView: ensureRendered })`,
`run = currentDice ? findRun(grid.rows[currentY], currentX) : null` (one `useMemo`, feeds the group rect and
`RunBadges`), hover state + `cellFromEvent` (click → `navigateTo(cell.x, gridRowFromSvg(cell.svgY, rows))`),
the global arrow-key handler (minus `D`), the JSX (svg + overlays + zoom buttons).

### `useBuildWindow(grid)`

`renderedRef: { grid, win: CellWindow } | null`. `ensureRendered(view: ViewBox)`: `need = visibleWindow(view, w, h)`;
return if `renderedRef.current?.grid === grid && windowContains(rendered.win, need)`; else `win = bufferedWindow(...)`,
`setSvgContent(renderWindowSvg(grid, win))`. Tagging the window with the grid it was rendered from replaces the old
"reset on grid change" effect (L241-248): a new grid simply never matches, and the viewBox effect re-runs on grid
change anyway (`ensureRendered` identity changes), so the re-render at the current view happens as before.

### `useBuildViewBox({ svgRef, current, cols, rows, zoomLevel, aspect, onView })`

Refs: `viewRef: ViewBox | null` (null = first layout; replaces `initializedRef` + the `"0 0 cols rows"` fallback
string) and `lastViewXRef`. One effect (deps = `current.x/.y` and the other inputs — coordinates, not the object, so
unrelated re-renders such as hover never restart an animation): `if (aspect === null) return`; `{ viewBox, lastViewX }
= computeViewBox({ current, cols, rows, zoomLevel, aspect, lastViewX: lastViewXRef.current })`; store `lastViewX`;
`onView(viewBox)` (materialise dice before panning); then first layout or `viewBoxClose(from, to)` (every component
within 0.01) → `apply(to)`; otherwise `animate(0, 1, { duration: 1, ease: [0.25, 0.1, 0.25, 1], onUpdate: apply(lerp),
onComplete: apply(to) })` and the effect cleanup stops it (a new target or unmount stops the running tween where it is,
exactly what `animationRef.stop()` did — no `any`-typed ref needed). `apply` sets `viewRef` and
`svg.setAttribute('viewBox', …)`. The NaN guard goes (values are typed numbers now). Same numbers as today:
`computeViewBox` is test-pinned to `buildZoom`.

### `useBuildZoom(containerRef)` / `useElementSize(ref)`

Straight extractions of L43, L301-320, L653-670 (`ZOOM = { initial: 8, min: 4, max: 20, step: 2 }`) and L251-270.
`useBuildZoom` returns `{ zoomLevel, zoomIn, zoomOut, canZoomIn, canZoomOut }`; buttons disable at the bounds as before.

### `RunBadges({ run, current, rows })`

Props replace the inline scan: `groupWidth = run.end - run.start + 1`, `remaining = run.end - current.x + 1`
(= old `consecutiveForward + 1`), `belowDie = current.y >= rows - 2`, `badgeY = svgRow(current.y, rows) + (belowDie ?
1.3 : -0.32)`, sticks `±0.20/0.35` (purple) and `±0.22/0.35` (pink) flipped when `belowDie`. Renders nothing when
`groupWidth === 1`. Trivial arithmetic, kept in the component (no new test file; `findRun` is covered in core).

## `useBuildNavigation`

- `PLAN_LIMITS.explorer.builderRowLimit` from `@/core/billing` replaces `EXPLORER_ROW_LIMIT`; `rowLimit =
  planType !== 'explorer' ? null : PLAN_LIMITS.explorer.builderRowLimit` derived from the session as today (C2 →
  `useEntitlements`). `enforceLimit(target: GridPos)` = `rowLimitAllows(target, rowLimit)` else auth/limit modal.
- `currentIndex = buildIndex(buildProgress, totalCols)`; `setPosition(pos: GridPos)`.
- `navigatePrev/Next` = `prevPosition`/`nextPosition` (+ `enforceLimit` on the forward one). The old `navigateNext`
  checked `enforceLimit(currentIndex + 1)` even at the last die (index = totalDice → "row = rows" → modal); with
  `nextPosition` returning `null` there it is a no-op instead. Unreachable for explorer users (grids are ≥ 20 rows) and
  the button/key are disabled by `canNavigate.next` — noted, not a behaviour change in practice.
- `prevDiffTarget`/`nextDiffTarget` (`useMemo`, `GridPos | null`): `findPrevDiff/findNextDiff` on the current row when
  `currentDice` exists, else fall through to `(cols-1, y-1)` / `(0, y+1)` when that row exists, else `null`.
  `navigatePrevDiff/NextDiff` move to the target (forward one gated by `enforceLimit(target)` — same "landing index"
  rule as L116/L124); `canNavigate.prevDiff/nextDiff = target !== null` (replaces the two `canNavigate` scans, same
  truth table). `canNavigate` stays all-false without a grid.
- `hasUnlimitedDice`/`diceLimit` dropped from the return value (no consumers; `diceLimit` was the only remaining
  `Infinity`).

## Other sites

- `ResetProgressModal.tsx` L21 → `buildIndex(buildProgress, diceGrid?.width ?? 0)`.
- `useAutosave.ts` L69 → `countCompleted(snap.buildProgress, snap.gridWidth ?? 0)`.
- `eslint.config.mjs`: `react-hooks/rules-of-hooks: 'error'`, comment updated.

## Deleted

FPS overlay + `D` toggle + `showDebug/fps/frameCountRef/lastTimeRef`, `.no-scrollbar` `<style jsx>`, `devLog`/`useMemo`
imports, `initializedRef`, the viewBox string parsing/NaN guard, `EXPLORER_ROW_LIMIT`, the four scan loops.

## Verification

`npm run typecheck` → 0 · `npm test` → 0 (11 files, 204 tests) · `npm run lint` → 0 (0 errors, 47 warnings; was 81, of
which 31 rules-of-hooks — now 0, plus the unused `devLog`/`useMemo` imports and the `any` ref) · `npm run build` → 0
(nothing on :3000). BuilderMain 718 → 34 lines; BuildViewer 230.
Manual (plan, for the user): build walkthrough — next/prev/diff, click-to-jump, badges, pan threshold, pinch zoom,
arrow keys — unchanged.
