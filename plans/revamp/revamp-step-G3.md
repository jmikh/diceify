# Step G3 — Mobile shell

Scope (plan, Phase G): below `lg` the editor follows the design canvas's mobile artboards (Start, Crop, Tune, Build).

- `MobileEditor`: `MobileTopBar` (compact `ProjectSwitcher` · compact `HistoryButtons` · compact `AccountControl`;
  safe-area top padding) → stage card (crop: `CropperMain` + floating `MobileRotateButton`; tune: preview +
  `DiceStatsInline`; build: `BuilderMain`) → `MobileControls` → `MobileStepBar` (back · step + dots · Next; safe-area
  bottom padding). The switcher popover and account menu are the desktop ones (they fit a 358 px column).
- Controls: crop = `AspectRatioChips` (5 across); tune = one control card (`TunerSlider large` / colour / orientation)
  over six tool tabs (`sliderConfigs.shortLabel` added); build = Row · Col, `BuildProgressBar`, %, "more" menu
  (`useBuildTools`, opens upwards) and `BuildNavButtons`.
- Start screen: the same component, responsive (dropzone copy "Take or choose a photo" below `lg`).
- Deleted: `MobileMenu`, `MobileBottomBar`, `ProjectListMenu`, `DiceStatsCard`.

Verification: typecheck, test, lint in the repo; build from an rsync copy (the user's `next dev` holds `.next`).
