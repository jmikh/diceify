# Step G2 — Desktop shell (direction A)

Scope (plan, Phase G): the desktop editor as a fixed viewport — header, canvas panel with an under-canvas strip,
right inspector — per the design canvas (artboards "A · Tune", "A · Build", "Project switcher").

## Shell (`components/shell/`)

- `EditorScreen`: `h-[100dvh]`, no footer, no Reddit banner; Start screen / mobile (G3) / `DesktopEditor`.
  `DesktopEditor` = `EditorHeader` + `<main>`: canvas `<section>` (`STEP_MAIN[step]`, then `DiceStatsStrip` on tune,
  `BuildProgressStrip` on build) + 344 px `<aside>` (step inspector). Modals/toasts mounted once for every view.
- `EditorHeader`: logo · `ProjectSwitcher` | `StepTabs` | `HistoryButtons` · `AccountControl`.
- `StepTabs` (replaces `DiceStepper`): clickable, `canEnter` via `useStepNavigation().canGoTo`, moves through `goTo`
  (reset confirmation intact).

## Project switcher (`components/project/`)

- `ProjectSwitcher`: pill (live thumbnail, name, `SaveStatusLine`) + popover (`useDismiss`: outside pointer-down,
  Escape). Views: `ProjectMenu` (signed in: unsaved-draft row with Save, projects with thumbnail / `formatBuilt` /
  edited date, two-step delete via `DeleteConfirm`, Project settings, New project from a photo → Start screen),
  `GuestProjectMenu` (current project in this browser, Sign in to save, New project + "replaces" note),
  `ProjectSettings` (rename on blur/Enter, locked photo, save status, delete with confirm).
- Deleted: `ProjectSelector`. `ProjectListMenu` stays for the old mobile menu until G3.

## Inspector panels

- `common/Inspector` + `InspectorSection` (scrollable body, pinned footer; the inspector scrolls inside itself on short
  windows — the page never does).
- Crop: `AspectRatioChips` (shared with mobile) + Rotate 90°; footer Continue to Tune.
- Tune: Size (Rows) / Tone (Contrast, Brightness, Sharpening) / Dice colour / Orientation; `TunerSlider` binds a
  config to the store (shared with mobile). `ParamSlider` = label + value pill above the track; `ColorModeControl`
  segmented with labels; `OrientationControl` draws `DieIcon` (core `getDotPositions`, `rotate90` transform) and is
  pressed when the face is rotated.
- Build: current die (`DieIcon` in the die's colours) + run copy (`useBuildNavigation().run`, also used by the
  viewer), Row/Col tiles (test ids kept), `BuildNavButtons` (shared with mobile), tools via `useBuildTools()`
  (progress modal, blueprint with PRO badge, buy dice — shared with mobile), Back to Tune.
- Canvas: `CropperMain` sizes its stencil from its container (`useElementSize`, moved to `hooks/`; `useWindowSize`
  gone); `BuildViewer` fills the panel (no inner frame) with dark zoom buttons; tune preview padded.
- Strips: `DiceStatsStrip` (grid size, total, `DiceColorBar`) and `BuildProgressStrip` (row of rows, bar, placed).
- `--pink-strong` (`#E0127A`) + `accent-pink-strong`: filled buttons (`common/ui.ts` class strings).

## Verification

`npm run typecheck && npm test && npm run lint` in the repo; `npm run build` in an rsync copy of the working tree
(the user's `next dev` holds `.next`; building in place breaks it).
