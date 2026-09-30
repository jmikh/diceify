# Step B3 — Store split + step machine

Scope (tiered plan): `features/editor/store/*` (document store with zundo, ui, derived, project), `features/editor/steps.ts`,
`useStepNavigation`; `selectedRatio`/`cropRotation` folded into `crop`; `TunerMain` uses `isGenerating`; autosave/project
manager adapted (still the Prisma API + localStorage); `lib/store/useEditorStore.ts` deleted; `zundo` added.
Not in scope: undo UX (B4 — batcher, shortcuts, buttons, cropper sync effect), folder moves (B5), Supabase (C*).

## Repo state found

- `lib/store/useEditorStore.ts` (261 lines, 34 importers incl. plans): one store mixing document (`cropParams`, `diceParams`,
  `buildProgress`, `buildBaseline`, `projectName`), UI (`step`, six modal booleans, `authModalMessage`, `isInitializing`,
  `isCropping` — unused, `selectedRatio`, `cropRotation`), derived (`processedImageUrl`, `diceStats`, `diceGrid`) and project
  (`originalImage`, `currentProjectId`, `lastSaved`, `isSaving`). `matchesBuildBaseline` duplicates core's `progressApplies`.
- The aspect-ratio bug: `selectedRatio` is UI-only and never persisted; on reload it is `'1:1'` again, the cropper stencil
  mounts at 1:1 and `reportCrop` overwrites the restored crop. `cropRotation` is a second copy of `crop.rotation` kept in sync
  by hand in `hydrateFromLocalDraft`/`loadProject`. `advanced-cropper`'s `rotateImageAlgorithm` does `transforms.rotate += angle`
  (cumulative, never normalised), so one cumulative `crop.rotation` can drive both the widget and the document.
- Three copies of the step-transition logic (`UploaderPanel`, `CropperPanel`, `TunerPanel`/`BuilderPanel`, `MobileBottomBar`);
  `ResetProgressModal` mounted twice with local state; `percentage` computed three times (B2 suggestion).
- `useAutosave.buildSnapshot` = legacy draft shape `{ name, step, cropParams, diceParams, buildProgress, gridWidth, gridHeight,
  totalDice }` (what `migrateDocument`'s `fromLegacyDraft` reads); `toProjectFields` maps it to Prisma columns for PATCH/POST.
- `PricingCards.tsx` imports the store but never uses it. `components/Editor/UserMenu.tsx` does not use the store.
- `zundo@2.3.0` (peer `zustand ^5` — repo has 5.0.15). Nothing on :3000.

## New files

```
features/editor/steps.ts                       STEPS, Step, STEP_LABELS, stepIndex, nextStep, prevStep, canAdvance, needsResetConfirm (+ test)
features/editor/hooks/useStepNavigation.ts     { step, canGoNext, canGoBack, goNext, goBack, goTo }
features/editor/store/useDocumentStore.ts      zustand + subscribeWithSelector + temporal; buildDocument, replaceDocument, useDocumentHistory (+ test)
features/editor/store/useEditorUiStore.ts      step + modal slot
features/editor/store/useDerivedStore.ts       pipeline output + useBuildProgress()
features/editor/store/useProjectStore.ts       boot, projectId, imageSrc, saveStatus, lastSaved, projects
features/editor/store/editor.ts                cross-store composites: uploadImage(src), resetEditor()
```

### `useDocumentStore`

State `{ crop: CropParams | null, dice: DiceParams, buildProgress: GridPos, buildBaseline: BuildBaseline | null, name }` — flat,
so zundo's shallow `set(pastState)` (partialized to `{ crop, dice }`) never touches progress/name/baseline. Options: `partialize`,
`equality: JSON.stringify`, `limit: 50`. Actions:

- `setCrop(crop | null)` / `updateCrop(patch)` / `updateDice(patch)` — jsonEquals guard (the cropper re-emits identical values
  on every interaction; a new reference would re-render every subscriber). `updateCrop` on a null crop is a no-op: the crop
  exists ~100 ms after the cropper mounts, before any control can be clicked (see Crop step below).
- `setBuildProgress(p | updater)` (guard), `setName`.
- `enterBuild()` — exactly today's semantics: progress kept iff `progressApplies(state, buildBaseline)`, else `{0,0}`; baseline
  re-anchored to the current `{ crop, dice }`. Does NOT set the step (the ui store owns it; `useStepNavigation.goTo('build')`
  calls both).
- `resetForNewImage()` — crop null, progress 0, baseline null, dice kept (today's `uploadImage` keeps `diceParams`).
- `resetAll()` — today's `resetWorkflow` document part (dice back to defaults too).
- `loadDocument(doc, name)` — crop/dice/progress/name from the doc, baseline = `{ crop, dice }` ("the loaded progress belongs
  to the loaded params").

Module exports: `replaceDocument(doc, name)` = `loadDocument` + `temporal.clear()` + `useDerivedStore.reset(doc.grid)` (seeds
`gridSize`/`stats.totalCount` from the persisted grid so `buildDocument` round-trips `grid` before the pipeline regenerates,
as today's `setDiceStats({ totalCount })` did); `buildDocument(state?, step?, gridSize?)` → `ProjectDocument` (schemaVersion 1,
`step` from the ui store with `'upload'` → `'crop'`, `grid` = derived `gridSize`, `buildProgress` zeroed when
`!progressApplies` — today's `buildSnapshot` rule); `useDocumentHistory(selector)` for B4.

### `useEditorUiStore`

`{ step: Step, modal: 'signIn'|'projects'|'limit'|'proFeature'|'resetProgress'|null, signInMessage, pendingStep }` +
`setStep`, `openModal(modal, { message?, pendingStep? })`, `closeModal()` (clears message + pendingStep).
Modal audit: `AuthModal` (page + `ProFeatureModal`'s own local copy — stays local), `ProjectSelectionModal` (page),
`LimitReachedModal` (page), `ProFeatureModal` (page; its `showAlreadyProModal` stays local), `ResetProgressModal` — becomes
store-driven (`'resetProgress'` + `pendingStep`) because `useStepNavigation` opens it; mounted once in the page, its two local
mounts go. `ProgressPreviewModal` stays local: opened from one component per layout (`BuilderPanel` / `MobileBuildControls`)
with local state and nothing else needs to know, so `'progressPreview'` is NOT in the enum (plan text amended).
`isInitializing` is NOT duplicated here: `useProjectStore.boot` is the single flag.
Behaviour change (documented): one modal at a time — `UpgradeButton` inside `LimitReachedModal` now replaces the limit modal
with the pro-feature modal instead of stacking on top of it.

### `useDerivedStore`

`{ grid, stats, gridSize, previewUrl, isGenerating, error }` + `startGeneration()`, `setGrid(grid, stats)` (stats guarded),
`finishGeneration(previewUrl)`, `failGeneration(message)`, `reset(gridSize | null)`. Written by `useDiceGeneration` plus
`replaceDocument`/`uploadImage`/`resetEditor` (which only `reset`). `useBuildProgress()` (same module): `{ currentIndex,
totalDice, percent }` from `buildProgress` + `gridSize` — the one place the percentage is computed (`useBuildNavigation`
returns it; `ResetProgressModal` calls the hook).

### `useProjectStore`

`{ boot: 'booting'|'ready', projectId, imageSrc, saveStatus: 'idle'|'dirty'|'saving'|'saved'|'error', lastSaved, projects:
ProjectSummary[] }` + setters. `projects` moves out of `useProjectManager`'s local state (the page had a refetch-on-remount
effect to work around the local state). `formatSaveStatus(saveStatus, lastSaved)`; `ProjectSelector`'s green flash fires on
`saving → saved`. `cloudVersion`/`imageBlob` not added (C3; nothing here gets simpler with them).

### `steps.ts` + `useStepNavigation`

`canAdvance('upload') = hasImage`, `canAdvance('crop') = hasCrop`, `canAdvance('tune') = true`, `build` = false.
`needsResetConfirm(from, to, progress)` = leaving `build` with progress ≠ (0,0). `goTo(to)`: confirm needed → `openModal
('resetProgress', { pendingStep: to })`; else `to === 'build'` → `enterBuild()`; then `setStep(to)`. `ResetProgressModal`
confirm → `setStep(pendingStep)` + `closeModal`. `DiceStepper` renders `STEPS`/`STEP_LABELS` (it never navigated).

### Crop step (ratio + rotation from `crop`)

`CropperMain`: `ratio = crop?.aspectRatio ?? DEFAULT_ASPECT_RATIO` (`'1:1'`, exported from `core/dice/document.ts`, also used
by `nearestAspectRatio`), `rotation = crop?.rotation ?? 0`; `reportCrop` writes `{ x, y, width, height, rotation, aspectRatio:
ratio }` via `setCrop`; the rotation sync effect diffs `crop.rotation` against `prevRotationRef` exactly as it diffed
`cropRotation`. `CropperPanel`/`MobileCropControls`: ratio button → `updateCrop({ aspectRatio })` (the stencil re-fits, the
100 ms effect re-reports the coordinates); rotate → `updateCrop({ rotation: rotation + 90 })`. Restore: the stencil now mounts
with the persisted ratio and `defaultCoordinates`, so `reportCrop` re-reports the same box instead of a 1:1 re-crop.
Uncontrolled cropper otherwise unchanged (B4 adds the `setCoordinates` sync effect).

### Pipeline (`useDiceGeneration`)

Reads `imageSrc` (project) + `crop`/`dice` (document). Effect: `startGeneration()` synchronously (spinner before the 300 ms
debounce), stage B → `setGrid(grid, computeStats(grid))`, stage C → `finishGeneration(url)`, catch → `failGeneration(msg)`.
`TunerMain`'s three JSON-diff effects go: `showLoading = isGenerating || !previewUrl`.

### Autosave / project manager (`app/editor/hooks/`, same API + localStorage)

- Snapshot = `{ doc: buildDocument(), name }`; `lastSavedJson` dedupe unchanged; subscription = one `check()` attached to the
  document store (all fields), ui store (`step` selector) and derived store (`gridSize` selector); ignored while `boot !==
  'ready'`; `saveStatus` 'dirty' when a project is loaded.
- `toLegacyProjectFields(doc, name)` (in `useAutosave.ts`, the inverse of core's `fromLegacyProjectRow`) feeds PATCH and
  `buildProjectPayload()`. `completedDice` = `documentStats(doc).completedDice`.
- localStorage keys unchanged (`editorState` = `{ doc, name }`, `editorImage`); `hydrateFromLocalDraft` accepts the new shape
  (`raw.doc`) or a legacy snapshot (merging `editorBuildProgress` first) through `migrateDocument`, requires an image (a crop
  without an image left the user on an empty crop step), then `replaceDocument` + `setImageSrc` + `setStep(doc.step)` +
  `markSnapshotClean`. Because `crop.aspectRatio` round-trips, the reload restores the right stencil.
- `loadProject`: fetch full row → `fromLegacyProjectRow(row)` → `replaceDocument(doc, name)`, `setImageSrc`, `setProjectId`,
  `lastSaved`, `setStep(image ? doc.step : 'upload')` (a project with an image but no crop now lands on `crop` rather than a
  tune step that could never render). `DocumentError` → devError, project left unloaded.
- `createProject` = `flushSave` → `setProjectId(null)` → `resetEditor()` + `clearLocalDraft` → POST → register.
- `page.tsx`: `boot` replaces `isInitializing`; `hasWorkInProgress = !!imageSrc`; `<ResetProgressModal />` mounted here.

## Deleted

`lib/store/useEditorStore.ts`, `WorkflowStep` (`lib/types`), `steps` export of `DiceStepper`, `isCropping`, the six modal
booleans, `selectedRatio`/`cropRotation`, `TunerMain` loading effects, the two local `ResetProgressModal` mounts, the unused
`useEditorStore` import in `PricingCards`, `useProjectManager.userProjects` local state.

## Tests (vitest, node)

`features/editor/store/useDocumentStore.test.ts`: enterBuild after a dice change resets progress; unchanged keeps it;
`buildDocument` zeroes drifted progress and maps `'upload'` → `'crop'`; `replaceDocument` clears history and seeds derived
`gridSize`; identical `updateDice` adds no history entry; `setBuildProgress` adds no past state; undo restores `dice` and
leaves progress/name alone. `features/editor/steps.test.ts`: `nextStep`/`prevStep` at the ends, `canAdvance`, `needsResetConfirm`.

## Verification

`npm run typecheck && npm test && npm run lint && npm run build` (see step log). Manual checks for the user (plan): full flow
upload → crop → tune → build; reload restores the draft with the correct aspect ratio (the silent 1:1 re-crop is gone).
