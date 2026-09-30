# Step B5 — Route groups, feature folders, CSS split, brand unification

Scope (tiered plan): folder structure via `git mv`; `app/(marketing)` + `app/(editor)` layouts; `styles/{base,marketing,editor}.css`;
`lib/theme.ts` deleted, `--pink` single source, editor pink classes → `accent-pink`; `SignInModal` (marketing-safe) + `EditorSignInModal`;
`PricingCards` decoupled from the editor store; `EditorScreen`/`EditorHeader`/`useEditorBootstrap`/`useMediaQuery` out of `page.tsx`;
Reddit banner into `EditorHeader`; HowItWorks/Providers deleted; import-boundary lint rules on. Not in scope: Supabase (C*), gating
(C2), OG images / `app/api` (E1), behaviour changes.

## Repo state found

- `app/editor/page.tsx` (469 lines): six bootstrap effects, window-size state (`isMobile = width < 1024`, also passed to `CropperMain`
  for stencil sizing), desktop header + Reddit banner, both layouts, all modals. `components/Editor/**` (36 files) + 9 editor
  modals/menus at `components/` root; `app/editor/hooks/` holds autosave/pipeline/project-manager/wake-lock.
- `lib/theme.ts` has 14 importers (`theme.colors.*` in inline styles) with the **old** pink `#ec4899`; Tailwind `pink-400/500/600`
  classes (≈90 sites, editor and landing) and `rgba(236,72,153,…)` literals (≈40, incl. 3 CSS modules) are the same old pink. The
  brand pink `--pink: #FF2D92` is used by marketing CSS and `text-[var(--pink)]` sites only.
- `PricingCards.tsx` already has no store import (B3 removed it). `Providers.tsx` is a no-op wrapper. `components/DiceStepper/` and
  `components/Editor/DiceStepper.module.css` are orphaned. `.custom-scrollbar` is used twice but defined nowhere.
- Only `/` renders `<Navbar/>`/`<Footer/>`; blog, gallery, dice-art, privacy, terms render orbs + a "Back" link and **no** navbar or
  footer. `HashScrollHandler` is landing-only.
- `globals.css` (1103 lines): tokens, base, `@layer components`, animations, orbs, hero, how-it-works, gallery, gallery-page, faq,
  blog-section, blog*, frosted-glass, responsive. Global `::-webkit-scrollbar` rules are light gray (`bg-gray-100/400`).

## File mapping (every file under `app/`, `components/`, `lib/`, `features/`; `core/` unchanged)

| From | To |
|---|---|
| `app/layout.tsx` | stays; imports `@/styles/base.css`; `Providers` wrapper and unused `auth` import removed |
| `app/globals.css` | `git mv` → `styles/base.css`, then carved into `styles/{marketing,editor}.css` (see CSS split) |
| `app/page.tsx` | `app/(marketing)/page.tsx` (keeps Navbar/Footer/HashScrollHandler; drops its orbs) |
| `app/blog/**` (page, `[slug]/page`, 2 post components) | `app/(marketing)/blog/**` |
| `app/{gallery,dice-art,privacy,terms}/page.tsx` | `app/(marketing)/…/page.tsx` (drop their orbs) |
| — | new `app/(marketing)/layout.tsx`: imports `styles/marketing.css`, renders `<BackgroundOrbs/>` + children |
| `app/editor/layout.tsx` | `app/(editor)/layout.tsx` (metadata, JSON-LD, `SessionProvider`+`auth()` kept until C2) + `styles/editor.css` |
| `app/editor/page.tsx` | `git mv` → `features/editor/components/shell/EditorScreen.tsx` (rewritten); new `app/(editor)/editor/page.tsx` = `'use client'` + `<Suspense><EditorScreen/></Suspense>` |
| `app/editor/hooks/useAutosave.ts` | `features/editor/hooks/useAutosave.ts` (+ `flushDraftForSignIn`) |
| `app/editor/hooks/useDiceGeneration.ts` | `features/editor/hooks/useDicePipeline.ts` (hook renamed `useDicePipeline`) |
| `app/editor/hooks/{useProjectManager,useWakeLock}.ts` | `features/editor/hooks/` |
| `app/{error,not-found}.tsx`, `robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `twitter-image.tsx`, `api/**` | stay (`sitemap.ts` import updated; `not-found` uses `<BackgroundOrbs/>`) |
| `components/Analytics/AnalyticsTracker.tsx` | `features/account/AnalyticsTracker.tsx` |
| `components/AuthModal.tsx` | `features/account/SignInModal.tsx` (props below; no store imports) |
| `components/BlogCard.tsx`, `HashScrollHandler.tsx` | `features/marketing/components/` |
| `components/LandingPage/{Navbar,Hero,Gallery,BlogSection,Pricing,FAQ}.tsx` | `features/marketing/components/` |
| `components/LandingPage/HowItWorks.tsx` | **deleted** (+ its CSS) |
| `components/PricingCards.tsx`, `PlanBadge.tsx` | `features/billing/` |
| `components/SessionRefresher.tsx` | `features/billing/CheckoutSuccessHandler.tsx` (component renamed) |
| `components/Editor/Builder/{BuildViewer,BuilderLimitToast,BuilderMain,BuilderPanel,RunBadges}.tsx`, `constants.ts` | `features/editor/components/build/` |
| `components/Editor/Builder/{useBuildViewBox,useBuildWindow,useBuildZoom,useElementSize}.ts` | `features/editor/components/build/` (BuildViewer internals; `useElementSize` kept, see hooks note) |
| `components/Editor/Builder/{useBuildNavigation,useBlueprintDownload}.ts` | `features/editor/hooks/` |
| `components/{ProgressPreviewModal,ResetProgressModal}.tsx` | `features/editor/components/build/` |
| `components/Editor/Cropper/{CropperMain,CropperPanel}.tsx`, `cropperHandle.ts`, `Cropper.module.css` | `features/editor/components/crop/` |
| `components/Editor/Tuner/{TunerMain,TunerPanel,DiceCanvas}.tsx`, `TunerPanel.module.css`, `controls/*` | `features/editor/components/tune/` (+ `tune/controls/`) |
| `components/Editor/DiceStatsCard.tsx` | `features/editor/components/tune/` |
| `components/Editor/Uploader/{UploadMain,UploaderPanel}.tsx` | `features/editor/components/upload/` |
| `components/Editor/{DiceStepper,HistoryButtons}.tsx` | `features/editor/components/shell/` |
| `components/Editor/Mobile/*` (6) | `features/editor/components/mobile/` |
| `components/Editor/{ProjectSelector,ProjectListMenu}.tsx`, `components/ProjectSelectionModal.tsx` | `features/editor/components/project/` |
| `components/Editor/UserMenu.tsx`, `components/{LimitReachedModal,ProFeatureModal,UpgradeButton}.tsx` | `features/editor/components/account/` |
| `components/Editor/ConfirmDialog.tsx`, `DiceStepper.module.css`, `components/DiceStepper/`, `components/Providers.tsx` | **deleted** |
| `components/{Logo,Footer}.tsx` | stay; new `components/BackgroundOrbs.tsx` (the orbs + grid-overlay markup, was copied 9×) |
| `lib/blogs/data.ts` | `features/marketing/blog/data.ts` |
| `lib/utils/billing.ts` | `features/billing/openBillingPortal.ts` |
| `lib/utils/saveStatus.ts` | `features/editor/components/project/saveStatus.ts`; `SaveStatus` type now lives in `useProjectStore` |
| `lib/theme.ts`, `lib/styles/{effects,overlay-buttons}.ts` | **deleted** |
| `lib/{auth,prisma,stripe,subscription}.ts`, `lib/utils/debug.ts`, `lib/types/index.ts`, `lib/image/*` | stay (C/D/E) |
| — | new `lib/media-query.ts` (`useMediaQuery`) |
| `features/**` (existing store/hooks/steps) | unchanged |
| root `middleware.ts.backup`, `diceify-creator.html`, `diceify-glass.html`, `tiktok-dice-recorder.html`, `public/demo-portrait.jpg` | **deleted** (nothing references them) |

New under `features/editor`: `components/shell/EditorHeader.tsx`, `components/account/EditorSignInModal.tsx`, `hooks/useEditorBootstrap.ts`.

## Layouts

- `app/layout.tsx` (root): fonts, metadata, JSON-LD, GA, `@vercel/analytics` (until E1), `styles/base.css`. No client wrapper.
- `app/(marketing)/layout.tsx` (server): `import '@/styles/marketing.css'`; `<BackgroundOrbs/>{children}`. **Navbar/Footer are not in the
  layout** — only the landing page renders them today (the other five marketing pages have a "Back" link and no footer), so putting
  them in the layout would change those pages. They stay in `(marketing)/page.tsx`; plan's Repo layout line adjusted.
- `app/(editor)/layout.tsx` (server, async): today's editor layout + `import '@/styles/editor.css'`; `AnalyticsTracker` from
  `features/account`. No `EditorProviders` yet (nothing to provide until C2).
- `app/(editor)/editor/page.tsx`: `'use client'`, Suspense (for `useSearchParams`) with today's "Loading editor…" fallback, `<EditorScreen/>`.
- Route-group check: `/` only in `(marketing)/page.tsx`, `/editor` only in `(editor)/editor/page.tsx`.

## Editor shell split (`app/editor/page.tsx` →)

- `shell/EditorScreen.tsx`: owns `useSession`, `useProjectManager`, `useAutosave`, `useDicePipeline`, `useEditorShortcuts`,
  `useEditorBootstrap(projectManager)`, `isMobile = useMediaQuery('(max-width: 1023.98px)')` (= Tailwind's `not lg`; the old
  `innerWidth < 1024` with integer widths), the loading screen, `handleSelectProject`, the mobile/desktop mains and the five modals.
- `shell/EditorHeader.tsx` (desktop only; props = `Omit<ProjectListMenuProps,'onClose'>` like `MobileBottomBar`): logo, centred
  `ProjectSelector` (signed in), `HistoryButtons`, `UserMenu`/Sign-in button, **and the Reddit banner** (`redditBannerDismissed`
  localStorage flag) rendered under the header row with `mt-4 -mb-1` so the banner and the stepper keep their exact y-positions
  (before: header `py-4` → main `p-4` → banner `mb-3`).
- `hooks/useEditorBootstrap.ts`: the five session/URL/draft effects moved verbatim (URL project load, URL back-fill, draft hydrate,
  login → fetch projects / open dashboard / load most recent, clear draft once a project is loaded). Takes
  `{ fetchUserProjects, loadProject, updateURLWithProject }` from the manager so both hooks share one instance. C3 redesigns it.
- `lib/media-query.ts`: `useMediaQuery(query)` = `matchMedia` + `useSyncExternalStore` (server snapshot `false`, i.e. desktop first,
  as the old `{ width: 800 }` initial state). No pure part → no test.
- `CropperMain` still needs `window.innerWidth/innerHeight` for its stencil size: the resize listener moves into the component as a
  local `useWindowSize()` (prop dropped). `useElementSize` (B2, ResizeObserver) stays next to `BuildViewer`; both noted — a
  container-based crop stencil would be a behaviour change, so not done here.

## Sign-in modals

- `features/account/SignInModal.tsx`: `{ open, onClose?, message?, onBeforeSignIn?: () => Promise<void> | void, redirectTo? = '/editor?restored=true' }`.
  Same markup (Google + the Apple/Facebook placeholders with their GA event). `handleProviderSignIn` = `await onBeforeSignIn?.()` →
  `signIn(provider, { callbackUrl: redirectTo })`. Imports only `next-auth/react`, GA, `next/image`, `@/components/Logo`.
- `features/editor/hooks/useAutosave.ts` gains `flushDraftForSignIn()` (today's AuthModal L33–40: `flushSave()` then `persistImage`
  for an unsaved draft). `features/editor/components/account/EditorSignInModal.tsx` binds `modal === 'signIn'` + `signInMessage`
  (default "To continue using the builder you must be signed in") and passes `onBeforeSignIn={flushDraftForSignIn}`.
  `ProFeatureModal`'s local sign-in uses `SignInModal` with the same `onBeforeSignIn`. Marketing `Pricing.tsx` uses `SignInModal`
  with no hook (there is no draft on the landing page; today's flush was a no-op there).

## CSS split (`app/globals.css` line ranges → file)

| Lines | Content | To |
|---|---|---|
| 1–64 | tailwind directives, `:root` tokens (+ `--pink-rgb`, `--accent-blue`) | `base.css` |
| 66–99 | html/body, global scrollbar (rewritten dark: track transparent, thumb `rgba(255,255,255,.2)`, hover `.3`) | `base.css` |
| 101–199 | `@layer components` (`.glass`, `.nav-cta`, `.btn-*`, `.section-label`) | `base.css` |
| 201–236 | `pulse-dot`, `scroll-left`, `scroll-right` keyframes (hero badge + gallery marquee only) | `marketing.css` |
| 238–262 | `saveFlash` + `.save-flash` | `editor.css` |
| 264–322 | `.bg-gradient`, `.orb*`, `.grid-overlay` | `base.css` |
| 324–448 | hero, hero variants, hero blog row | `marketing.css` |
| 450–541 | `.section-header` (459–462) kept → `marketing.css`; `.how-it-works`, `.steps`, `.step*` **deleted** with `HowItWorks.tsx` | — |
| 543–1042 | gallery, gallery-page, faq, blog-section, blog card/article/cta/video | `marketing.css` |
| 1044–1050 | `.frosted-glass` | `base.css` |
| 1052–1103 | responsive block minus `.steps` (1072–1074) and `.how-it-works` (1090–1093) | `marketing.css` |
| new | `.custom-scrollbar` (thin; `scrollbar-color: rgba(255,255,255,.2) transparent` + webkit 6px equivalents) | `base.css` |

Root layout imports base; each group layout imports its own sheet. Check: every custom class used by `features/marketing`
+ `app/(marketing)` exists in base or marketing; every one used by `features/editor` + `app/(editor)` in base or editor
(editor uses `glass`, `bg-gradient`/`orb`/`grid-overlay`, `save-flash`, `custom-scrollbar` only).

## Brand / theme tokens

- `:root`: `--pink-rgb: 255 45 146; --pink: rgb(var(--pink-rgb));` (one literal; `--pink-glow*` derived from it too), `--pink-light`
  unchanged, `--accent-blue: #6495ff` added (was `theme.colors.accent.blue`; SVG run outline). `--accent-purple` already equals the
  old `theme.colors.accent.purple` (= Tailwind `purple-600`).
- `tailwind.config.ts`: `content` += `./features/**`, `./styles/**`; `theme.extend.colors.accent = { pink: { DEFAULT:
  'rgb(var(--pink-rgb) / <alpha-value>)', light: 'var(--pink-light)' }, blue: 'var(--accent-blue)' }` (the `<alpha-value>` form is
  what makes `bg-accent-pink/20` work). The unused `theme.*`/`pink.*` colour maps are removed if no class uses them.
- `theme.colors.*` → token: `text.{primary,secondary,muted}` → `var(--text-*)`; `glass.light/medium` → `var(--glass-light/medium)`;
  `glass.border` (white .10) → `var(--border-glass)` (white .08); `accent.pink`, `dice.highlightColor` → `var(--pink)`; `accent.purple`
  → `var(--accent-purple)`; `accent.blue` → `var(--accent-blue)`; `glow.pink` → `var(--pink-glow)`; `accent.red`, `background.overlay`,
  `*Rgb` had no surviving user (ConfirmDialog / `lib/styles` deleted). SVG colours go through `style={{ fill, stroke }}`.
- Classes: `pink-500` → `accent-pink`; `pink-400` → `accent-pink-light`; `pink-600`/`pink-700` as a base colour → `accent-pink`, as a
  hover/active/group-hover shade → `accent-pink-light` (`hover:bg-pink-600/30` → `hover:bg-accent-pink/30`). `text-pink-100` (stepper
  label tint) is not a brand pink and stays. Literal `rgba(236,72,153,a)` → `rgb(var(--pink-rgb)/a)` in arbitrary values, inline styles
  and the CSS modules; `#ec4899` → `var(--pink)`.

## ESLint boundaries (`eslint.config.mjs`, all `error`)

`features/{marketing,account,billing}/**` may not import `@/features/editor*` or `@/app*`; `features/**` may not import `@/app*`;
`lib/**` and `components/**` may not import `@/features*` or `@/app*`; `app/**` may import from `@/` only `features/ components/
lib/ core/ styles/` (regex pattern). `core/**` rules unchanged.

## Verification

`rm -rf .next` (stale `.next/types` for the moved routes), then `npm run typecheck && npm test && npm run lint && npm run build`;
`git grep` for `theme.colors`, `pink-500`, `app/editor/`, `components/Editor`, `lib/theme`, `globals.css` in code paths is empty;
the CSS class check above; `bg-accent-pink/…` present in the built CSS. Manual checks for the user (plan): landing/blog/gallery/
pricing/editor render identically except the unified pink; `features/marketing` cannot import `features/editor` (lint).
