# iOS step 4 — Editor: Crop → Tune → Build

Plan: `plans/ios/ios-app-plan.md` § 9 step 4. Done 2026-10-03 (uncommitted). The editor placeholder from step 3 is
now the real editor: the same three steps and rules as the web, the same document on the same `projects` row.

## What exists (`ios/Diceify`)

- `Features/Editor/Steps.swift`: the web's `steps.ts` (`all`, `label`, `next`/`prev`, `canAdvance` = crop set,
  `canEnter`, `needsResetConfirm` = leaving build after the crop/dice changed since the build baseline).
- `Features/Editor/EditorModel.swift` (`@MainActor @Observable`): one object per open project, cached by
  `EditorScreen` while the editor is on screen.
  - Document state (`name`, `step`, `crop`, `dice`, `buildProgress`, `buildBaseline`) + derived state (`grid`,
    `gridRows`, `gridInputs`, `stats`, `preview`, `thumbnail`, `isGenerating`).
  - Undo/redo tracks only crop + dice (like the web): `beginInteraction`/`endInteraction` batch a slider drag or a
    crop gesture into one entry; `untracked` for reconcile writes.
  - Pipeline (`scheduleGeneration`, 300 ms debounce, cancellable): A = crop → `Pixels` + 192 px thumbnail, cached
    per crop so slider drags skip the cut; B = `generateDiceGrid` unless the held grid was made from exactly these
    inputs (a loaded document's stored grid: no regeneration on open, same as the web's `useDicePipeline`); C =
    1080 px preview raster (`DiceRenderer`). Work runs in detached tasks; results land on the main actor.
  - Autosave (`scheduleSave`, 1.5 s debounce; `flushSave` on scene background/disappear): the folder first
    (`LocalStore`), then the cloud CAS save on `cloud_version`; conflict → the cloud row replaces the document (history
    cleared, `conflictNotice` → alert); row deleted → the project becomes local-only; `URLError` → `.offline` and the
    next save retries. `saveStatus`: idle/dirty/saving/saved/error/offline (`SaveStatusView` in the header).
  - The thumbnail follows the crop: `preview.jpg` in the folder at once, uploaded to the cloud 2 s after the last
    change (`schedulePreviewSync`), once per distinct image.
  - Build navigation (`move(to:rowLimit:)` → `.moved`/`.blocked`/`.none`, `buildTargets` next/prev/different die,
    `run`, `currentDie`, `buildPercent`, `lastMilestones`) on DiceCore's build math; forward moves past the plan's
    row limit are blocked (the caller shows the gate prompt).
  - Crop helpers for the view: `cropBounds` (the rotated image size), `setAspectRatio`, `rotate90`,
    `initialCrop(aspect:)` — the web's `cropMath`.
- `Services/ImageKit.swift` (+): `drawRegion`/`cropPixels` (rotation into the bounding box first, then the cut,
  scaled so the longer side ≤ 2048 like the web's `rasterizeCrop`), `thumbnail`, `decodeOriginal`.
- `Services/DiceRenderer.swift`: Core Graphics dice (`drawDie`, cached die images per size), `drawGrid` (row 0 at
  the bottom), `render` (preview raster) and `renderProgress` (unplaced dice ghosted, for the progress sheet).
- Views: `EditorScreen` (header: back, rename via the title, undo/redo, save status; `StepControl`; the glass stage
  panel; per-step control rows; reset-confirm + conflict alerts) → `CropView` (custom cropper: 90° rotation via
  `UIImage` orientation, stencil + thirds grid, drag/pinch with a draft committed as one undo entry;
  `CropControls` = aspect chips + Next, Rotate 90°) / `TuneView` (preview + stats pill with the colour bar;
  `TuneControls` = one tool row at a time: rows, contrast, brightness (gamma), sharpen, colour mode, rotate 6/3/2 with
  real die images) / `BuildView` (Canvas viewer: windowed drawing, zoom 2–20 with pinch and buttons, the current
  run highlighted, the selected die outlined, tap to move, haptics on each move, screen kept awake;
  `BuildControls` = progress bar + %, More menu = progress preview sheet, blueprint SVG to the share sheet
  (`renderGridSvg`), purchase-dice link; nav row = prev different / prev / `ROW · COL` / next / next different;
  row-limit gate via `AppSession.gate`).
- DEBUG launch argument `--ui-step <crop|tune|build>` (with `--ui-open <uuid>`) for terminal-driven screenshots.

## Verification

- `xcodebuild test` (scheme Diceify, iPhone 17 simulator): 23 tests in 7 suites — `StepsTests`, `ImageKitCropTests`
  (region cut, rotation first, max side), `DiceRendererTests` (row 0 at the bottom, die cache, progress ghosting,
  geometry vs the browser), `EditorModelTests` (history + gesture batching; pipeline generates then keeps a stored
  grid; steps + reset confirmation; build navigation + row limit; autosave folder + CAS cloud + thumbnail upload with a
  fake saver; conflict reload; offline retry) plus the step 3 suites (`ProjectRepositoryTests` on the local stack).
- `swift test` in `ios/DiceCore`: 52 tests. Web gates: typecheck, vitest, lint (0/0), static build from the scratch copy.
- Simulator, driven with `xcrun simctl launch … --ui-open <Mona Lisa sample> --ui-step <step>` + screenshots: crop
  (stencil, thirds, aspect chips, rotate), tune (70 × 70 preview, 4,900-dice pill, tool rows), build (viewer, selector
  on row 1 col 1, zoom buttons, progress bar, nav row).
- Parity: the sample project's stored grid (written by the web/backfill) opens on iOS without regeneration
  (`pipelineGeneratesAndKeepsAStoredGrid` covers the rule; the sample screenshot shows the same 70 × 70 grid).
- Not testable by Claude: pinch/drag gestures and haptics need a hand on a device — **user to try** on the first
  TestFlight build (step 5).

## Findings

- The simulator shut down between two terminal runs (idle), which killed the screenshot loop; `xcrun simctl boot` +
  `bootstatus -b` first.
- A test host suspended mid-run (the log jumped 15 minutes between two 1-second tests) made `waitUntil` give up on
  the continuous clock while the model's 2 s preview timer had not fired: the poll helper now uses `SuspendingClock`.
- `Canvas` draws the whole window each frame; the windowed viewer (`visibleWindow`) keeps a 120-row grid at zoom 2
  cheap enough. Pinch zoom is view state only (not persisted), like the web.
- Lint caught an unused import in `features/marketing/components/Hero.tsx` from an unrelated commit; removed.
