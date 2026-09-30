# Step B4 — Undo/redo UX

Scope (tiered plan): `historyBatcher.ts`, `useEditorShortcuts.ts` (arrow keys merged, BuildViewer keydown removed,
`buildNavigation.ts` plain functions), `ParamSlider` interaction hooks, `OrientationControl` derived state, `CropperMain`
sync effect, header undo/redo buttons (desktop) + mobile menu entries. Not in scope: folder moves (B5), gating via
entitlements (C2), Supabase (C*).

## Repo state found

- `useDocumentStore` already runs under zundo `temporal` (partialized to `{ crop, dice }`, JSON equality, limit 50);
  `replaceDocument`, `uploadImage` and `resetEditor` already call `temporal.clear()`. Undo/redo is reachable only from
  tests — no batcher, no shortcut, no button.
- `components/Editor/Builder/useBuildNavigation.ts` holds the whole navigation (targets + row-limit gate + `setBuildProgress`)
  inside React callbacks; `BuildViewer` has its own window `keydown` listener for the arrow keys. Three consumers
  (`BuilderPanel`, `MobileBuildControls`, `BuildViewer`).
- `ParamSlider` tracks `isDragging` with mouse+touch pairs (tooltip only); every `onChange` is a plain `updateDice` → a drag
  is ~20 history entries. `OrientationControl` keeps a cumulative `rotations` state that undo cannot reach.
- `CropperMain`: the cropper is uncontrolled. Store → cropper only for rotation (`prevRotationRef` + `rotateImage(delta)`);
  cropper → store via a 500 ms debounced `reportCrop` on `onChange` plus a 100 ms report after `onReady`/ratio change.
  `advanced-cropper` fires `onChange` synchronously from `updateState` for **every** state change (user drags, wheel zoom,
  `setCoordinates`, `rotateImage`, the stencil-ratio reconcile, boundary refresh) and `onInteractionStart/End` only around
  user gestures (`transformImage` … `transformImageEnd`, the latter debounced 500 ms by `TransformableImage`).
  `rotateImage`/`setCoordinates` are synchronous and are not interactions. `FixedCropper` forwards both callbacks.
- zundo: `pause()` skips the past push **and** leaves `futureStates` intact; `undo`/`redo` write through the raw `set`
  (no history, subscribers fire). `isTracking` is the flag.

## Design

### `features/editor/store/historyBatcher.ts`

recordio's `createHistoryBatcher(getTemporal)` (latch on the first recorded entry, reference-counted interactions) plus one
extra function, `untracked(action)`: pause → action → resume only if tracking was on. Needed by the cropper (below): a
correction the widget makes to the store must not become an undo step and must not drop the redo stack.
`createHistoryBatcher` returns the batcher object (stable closures, callable outside React and in tests); `documentHistoryBatcher` is
the document singleton and `useDocumentHistoryBatcher()` its hook-shaped accessor for components.

### `features/editor/store/buildNavigation.ts` (plain functions)

```
interface BuildGate { rowLimit: number | null; onBlocked(): void }
buildTargets(grid, progress) → { prev, next, prevDiff, nextDiff }: GridPos | null   // pure on the grid
currentTargets()                                                                       // from the stores
moveTo(target: GridPos | null, gate): boolean   // bounds check; forward past the row limit → gate.onBlocked(); else setBuildProgress
```
One implementation of the scan/limit logic. `moveTo` enforces the limit only on forward moves (today's semantics: prev/prevDiff
never gated, next/nextDiff/click gated when they advance). `useBuildNavigation()` (still in `components/Editor/Builder/`)
becomes a thin binder: `useBuildGate()` (session plan → `rowLimit`, `onBlocked` opens `'limit'`/`'signIn'`) + selectors →
`{ current, currentDie, percent, canNavigate, navigatePrev/Next/PrevDiff/NextDiff, navigateTo(x, y) }`. The three consumers
switch `currentX/currentY` → `current.x/y`. `useBuildGate` is exported so the shortcut hook shares the gate.

### `features/editor/hooks/useEditorShortcuts.ts`

One window `keydown` listener mounted in `app/editor/page.tsx` (`EditorContent`): `isTypingTarget()` guard
(input/textarea/select/contentEditable); `(meta||ctrl)+z` → `preventDefault`, shift ? `redo()` : `undo()`; any other
meta/ctrl/alt combo ignored; then only when `step === 'build'` and no modal: `ArrowLeft/Right` → `moveTo((shift && diff) || plain,
gate)` with `preventDefault` (shift falls back to the plain step when there is no diff target, as before). `BuildViewer`'s
listener is deleted.

### `ParamSlider`

`onPointerDown` → `startInteraction()` + `isDragging=true`; `onPointerUp`/`onPointerCancel` → `endInteraction()` +
`isDragging=false` (replaces the mouse/touch pairs; tooltip behaviour unchanged); `onChange` → `batchAction(() => onChange(v))`.
Keyboard nudges (no pointer) stay one entry per key press.

### `OrientationControl`

`rotations` state deleted; `transform: rotate(${params[key] ? 0 : 90}deg)` (same mapping as today's initial state) with the
existing 0.3 s transition, so undo animates the glyph back.

### `CropperMain` — store is the source of truth, the widget follows

Reports are either **tracked** (a user gesture) or **untracked** (the widget reconciling to props or to a store change):

- `onInteractionStart` → `interacting = true`, cancel any pending report. `onInteractionEnd` → `interacting = false`,
  report immediately (tracked, one `setCrop` = one history entry). No mid-gesture reports (nothing on the crop step consumes
  them live; the pipeline regenerates once at the end).
- `onChange` outside a gesture → 100 ms debounced **untracked** report (mount, ratio reconcile, boundary refresh, sync
  effect). `onReady` also schedules one (safety net for the first crop).
- Sync effect on `crop`: read the widget's crop; if the rotation differs → `rotateImage(delta)`; if the box differs
  (`cropParamsEqual`, 0.01) → `setCoordinates({ left, top, width, height })`; each triggers `onChange` → the untracked
  report writes back whatever the widget could actually apply. Because the write is untracked and lands within tolerance,
  the effect settles in one extra pass — no feedback loop, no history entry, redo preserved.
- Panel actions: ratio → `updateCrop({ aspectRatio })` = one entry; the stencil reconcile that follows is untracked
  (B3 noted two entries per ratio change). Rotate → `rotateCrop(90)`: `CropperMain` registers a tiny handle
  (`cropperHandle.ts`: `rotate(deg)` = `rotateImage` + tracked report) that `useCropControls` calls, so the entry carries the
  rotated coordinates and undo restores the pre-rotation box exactly. `prevRotationRef` and the 500 ms/100 ms timers go.

### Buttons

`features/editor/hooks/useUndoRedo.ts` → `{ canUndo, canRedo, undo, redo }` from `useDocumentHistory`. Desktop header
(`app/editor/page.tsx`): `components/Editor/HistoryButtons.tsx` (lucide `Undo2`/`Redo2`, `disabled` when empty) left of the
auth control. Mobile: two entries in `MobileMenu` above "Diceify home", for signed-in and signed-out users. Enabled whenever
history exists, in every step (undoing a tune change from the build step is drift; progress resets on re-entering build).

### History clearing

Already done by `replaceDocument`/`uploadImage`/`resetEditor`; tests added for the last two.

## Files

```
new      features/editor/store/historyBatcher.ts (+ .test.ts)
new      features/editor/store/buildNavigation.ts (+ .test.ts)
new      features/editor/hooks/useEditorShortcuts.ts, features/editor/hooks/useUndoRedo.ts
new      components/Editor/HistoryButtons.tsx, components/Editor/Cropper/cropperHandle.ts
changed  components/Editor/Builder/{useBuildNavigation,BuildViewer,BuilderPanel}.tsx, Mobile/{MobileBuildControls,MobileMenu}.tsx
changed  components/Editor/Tuner/controls/{ParamSlider,OrientationControl}.tsx, Cropper/{CropperMain,CropperPanel}.tsx
changed  app/editor/page.tsx, features/editor/store/useDocumentStore.test.ts
```

## Tests (vitest, node)

`historyBatcher.test.ts`: 20 `batchAction(updateDice)` inside one interaction → 1 past state, undo restores the pre-drag
value; an interaction whose actions change nothing adds none; nested interactions share one entry; `untracked` adds none and
keeps `futureStates`. `buildNavigation.test.ts`: targets at row ends/edges, `moveTo` gating (forward blocked → `onBlocked`,
backward never), bounds. `useDocumentStore.test.ts`: `uploadImage`/`resetEditor` clear history.

## Verification

`npm run typecheck && npm test && npm run lint && npm run build` (nothing on :3000). Manual checks for the user (plan):
undo slider drag, rotation, aspect change; undo while typing project name does nothing; history cleared after load; redo.
