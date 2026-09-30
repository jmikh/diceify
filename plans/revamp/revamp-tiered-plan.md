# Diceify revamp (tiered plan)

> Canonical copy of the revamp plan (source of truth for architecture and decisions). Each step is
> implemented by a **fresh agent** that (1) reads this doc, (2) writes `plans/revamp/revamp-step-N.md`
> with the detailed design for that step only, using current repo state, (3) implements it, (4) runs the
> step's verification list, (5) appends to the **Step log** at the bottom of this doc (date + any design
> changes, which it also propagates into the design sections), (6) records out-of-scope findings in
> `plans/revamp/revamp-agent-suggestions.md` instead of expanding scope. Work happens on the
> long-lived `revamp` branch; `master` keeps deploying the current Vercel site until cut-over (F2).

## Context

Diceify (photo → dice-art editor, Next.js 14 App Router) works but has grown organically:

- **Backend:** Prisma/Postgres + NextAuth + Stripe on Vercel. Each project setting is its own column; the
  raw uploaded photo is stored as a base64 data URL in a text column with no size cap; two different
  "is pro" predicates disagree; the Stripe webhook reconstructs state from individual events and two of
  its handlers silently no-op on current Stripe API versions; cancelling a subscription is only possible
  through a portal link buried in the editor menu for Studio users.
- **Frontend:** dice generation is a DOM-bound class (browser `drawImage` does the sampling, so output
  is not reproducible outside a browser); pure logic is scattered across UI components; landing and
  editor code import each other; one 295-line store with no undo; no unit tests (the puppeteer scripts
  are broken); no ESLint config; ~25 dead files.

Goal: a clean, testable codebase that can be taken "to the next level": Supabase (Auth + Postgres +
Storage) with the client talking to it directly under RLS, Stripe billing synced from Stripe as the
source of truth with in-app cancel, a static Next.js export on Cloudflare Pages (no server), a pure
TypeScript dice core with golden fixtures (portable to a future iOS app), undo/redo, vitest, Sentry.

## Decisions (agreed with the user)

| Topic | Decision |
|---|---|
| Hosting | **No Vercel.** Next.js `output: 'export'` static site on **Cloudflare Pages** (Git integration, `revamp` branch = preview, `master` = production after cut-over). Backend = **Supabase** only. |
| Data access | **Client talks to Supabase directly under RLS** (projects, profiles, storage). No API for CRUD. |
| Server code | **Two Supabase Edge Functions only** (Deno): `billing` (JWT-verified; checkout/portal/cancel/resume/sync) and `stripe-webhook` (signature-verified). That is the whole server. |
| Subscription state | **Synced from Stripe as source of truth**: every webhook event and every on-demand sync recomputes the full billing snapshot from `subscriptions.list` + `checkout.sessions.list`. No per-event state machine. No nightly reconcile (not in v1). |
| Plans | Keep 3: explorer (free), creator ($19 one-time, 30-day pass), studio ($9/mo, $36/yr). `lifetime` remains a plan value for grandfathered users but has no dedicated UI copy (shows as Pro). In-app **Cancel / Resume** (cancel_at_period_end) + Stripe portal link on an Account page. |
| Existing data | Migrate **paid users** (any non-explorer plan, or any Stripe customer/subscription) **and unpaid users active in the last 30 days** (user or project `updatedAt`). Drop the rest. |
| Images | **Immutable per project.** Upload photo = create project (`{uid}/{projectId}/original.jpg`, client-downscaled to ≤2048px JPEG q0.85). "Different photo" = new project. Anonymous drafts stay local (doc in localStorage, image Blob in IndexedDB) until sign-in. |
| iOS | Tech undecided → the dice core is pure TS, deterministic, with golden JSON fixtures + `core/README.md` spec so a Swift port (or RN reuse) can be verified. Supabase Swift SDK covers auth/CRUD/storage directly. |
| Undo/redo | `zundo` temporal middleware on the document store (crop + dice params undoable; build progress and name not), history batcher for slider drags, cmd-z / shift-cmd-z, header buttons (desktop) + mobile menu entries. |
| Repo | Same repo, `revamp` branch, `git mv` for moves. Tiered plan + per-step docs in `plans/revamp/`. |
| Framework | Keep Next.js as a static site generator (keeps pre-rendered SEO pages: blog, gallery, dice-art). |
| Brand | Single pink `#FF2D92` (`--pink`); `lib/theme.ts` deleted; editor `pink-500` classes remapped. |
| Removed | CommissionModal + commission-interest; Google birthday scope; `@vercel/analytics`; puppeteer visual tests; all dead files (see Cleanup). Reddit banner in editor header **kept**. |
| Sentry | `@sentry/nextjs` client-side (static export → client config only) via one `lib/report-error.ts` wrapper; editor route-group error boundary. Edge functions log to Supabase logs (no Sentry there in v1). |
| Toasts | `sonner` (3 KB) for the 3–4 toasts (save conflict, save error, load failure, limit). |
| Not now | Next 15 upgrade (React 19 peer audit of cropper/motion/gesture libs); Web Worker pipeline; thumbnails; Stripe Sentry. Record in agent-suggestions if tempted. |

---

## Target architecture

```
Browser (static Next.js export on Cloudflare Pages)
  ├─ supabase-js (anon key + user JWT)
  │    ├─ auth: Google OAuth (PKCE, detectSessionInUrl)
  │    ├─ profiles  (RLS: select own row; no client writes)
  │    ├─ projects  (RLS: full CRUD own rows; insert trigger enforces plan project limit; CAS on cloud_version)
  │    └─ storage 'project-images' (RLS: own {uid}/ folder; upload on create, download to render, delete with project)
  └─ functions.invoke('billing', …)  ─────────────▶  Edge Function `billing` (verify_jwt=true)
                                                       checkout | portal | cancel | resume | sync
Stripe ──webhook──▶ Edge Function `stripe-webhook` (verify_jwt=false, signature check)
                     both ─▶ _shared/billing-sync.ts ─▶ Stripe API (list subs + sessions) ─▶ profiles (service role)
```

### Repo layout (after E3)

```
app/
  layout.tsx                      fonts, metadata (static OG image), GA, imports styles/base.css
  error.tsx  not-found.tsx  robots.ts  sitemap.ts
  (marketing)/layout.tsx          styles/marketing.css, orbs, <Navbar/>, <Footer/>
  (marketing)/page.tsx  blog/  blog/[slug]/  gallery/  dice-art/  privacy/  terms/
  (editor)/layout.tsx             styles/editor.css, <EditorProviders/>
  (editor)/editor/page.tsx        'use client'; <Suspense><EditorScreen/></Suspense>
  (editor)/editor/error.tsx       route-group error boundary
  (editor)/account/page.tsx       plan, access-until/cancel-at, Cancel/Resume/Portal/Refresh; ?checkout=success polling
core/                             PURE TS. No DOM, no React, no '@/lib', no '@/features'. Own tsconfig (lib: es2022).
  README.md                       algorithm spec for a Swift port
  dice/  types.ts geometry.ts mapping.ts sample.ts generate.ts stats.ts build.ts svg.ts document.ts index.ts
         __fixtures__/*.json  *.test.ts
  billing/ entitlements.ts (+test)   plans.ts (PLAN_LIMITS, PlanId, checkout plan ids)
  purity.test.ts
lib/                              browser/platform adapters
  supabase/  client.ts  database.types.ts (generated)  projects.ts  profile.ts  storage.ts  billing.ts
  image/     decode.ts  crop.ts  rasterize.ts
  report-error.ts                 only file importing @sentry
  media-query.ts  env.public.ts
features/
  editor/   steps.ts  store/{useDocumentStore,useEditorUiStore,useDerivedStore,useProjectStore,editor,historyBatcher,buildNavigation,autosave,draft}.ts
            hooks/{useDicePipeline,useAutosave,useEditorShortcuts,useUndoRedo,useEditorBootstrap,useStepNavigation,useBuildProgress,useBuildNavigation,useBlueprintDownload,useWakeLock,useProjects,useGate}.ts
            components/{shell,upload,crop,tune,build,project,account,mobile}/
  marketing/ components/{Navbar,Hero,Gallery,BlogSection,Pricing,FAQ,BlogCard,HashScrollHandler}.tsx  blog/data.ts
  account/   SignInModal.tsx  useUser.tsx (ProfileProvider)  AnalyticsTracker.tsx
  billing/   PricingCards.tsx  PlanBadge.tsx  CheckoutSuccessHandler.tsx
components/  Logo.tsx  Footer.tsx           (truly shared, dumb)
styles/      base.css  marketing.css  editor.css
supabase/
  config.toml  migrations/<ts>_initial_schema.sql  seed.sql
  functions/_shared/{billing-sync.ts, billing-snapshot.ts (+test), stripe.ts, supabase-admin.ts, http.ts}
  functions/billing/index.ts   functions/stripe-webhook/index.ts   functions/deno.json
scripts/     gen-fixtures.ts  migrate-from-prisma.ts
docs/        STRIPE_TESTING.md  DEPLOY.md
plans/revamp/ revamp-tiered-plan.md  revamp-step-N.md  revamp-agent-suggestions.md
```

Import rules (enforced by ESLint `no-restricted-imports` + `core/tsconfig.json`): `core` imports only `core`.
`lib` may import `core`. `features/*` may import `core`, `lib`, `components`; `features/marketing` never
imports `features/editor`; `features/editor` may import `features/{account,billing}`. `app/` imports only
`features/*` and `components/`. `supabase/functions` imports only its own `_shared` (Deno; `.ts` extensions;
`npm:` specifiers via `deno.json` imports).

### Data model (`supabase/migrations/<ts>_initial_schema.sql`)

```sql
create extension if not exists pgcrypto;
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique, name text, avatar_url text,
  -- billing snapshot: written ONLY by the edge functions (service role) and the migration script
  plan text not null default 'explorer' check (plan in ('explorer','creator','studio','lifetime')),
  plan_expires_at timestamptz,            -- creator pass end (monotonic: sync only raises it)
  stripe_customer_id text unique, stripe_subscription_id text unique,
  subscription_status text, current_period_end timestamptz, cancel_at timestamptz,
  synced_at timestamptz,
  legacy_id text unique,                  -- old Prisma User.id (migration idempotency)
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles (id, email, name, avatar_url) values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- + on_auth_user_email_changed trigger keeping profiles.email in sync

-- Effective plan + project limit in SQL. MUST mirror core/billing/entitlements.ts (comment both ways).
create or replace function public.effective_plan(p public.profiles) returns text language sql stable as $$
  select case
    when p.plan = 'lifetime' then 'lifetime'
    when p.plan = 'studio' and p.subscription_status in ('active','trialing','past_due') then 'studio'
    when p.plan = 'creator' and p.plan_expires_at > now() then 'creator'
    else 'explorer' end $$;
create or replace function public.project_limit(plan text) returns int language sql immutable as $$
  select case plan when 'studio' then 5 when 'lifetime' then 5 else 1 end $$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Untitled Project',
  document jsonb not null,                -- ProjectDocument (see below); validated client-side, schemaVersion inside
  image_path text not null,               -- '{owner_id}/{id}/original.jpg' (immutable)
  total_dice int not null default 0, completed_dice int not null default 0,   -- projected from document by the client on write
  percent_complete numeric(5,2) generated always as (case when total_dice>0 then least(100, completed_dice*100.0/total_dice) else 0 end) stored,
  cloud_version int not null default 1,   -- compare-and-set: update ... where cloud_version = expected
  legacy_id text unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint image_path_in_owner_folder check (image_path like owner_id::text || '/%'));
create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();

create or replace function public.enforce_project_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.profiles; n int;
begin
  select * into p from public.profiles where id = new.owner_id;
  select count(*) into n from public.projects where owner_id = new.owner_id;
  if n >= public.project_limit(public.effective_plan(p)) then
    raise exception 'PROJECT_LIMIT' using errcode = 'P0001', detail = format('{"current":%s,"limit":%s}', n, public.project_limit(public.effective_plan(p)));
  end if; return new; end $$;
create trigger projects_enforce_limit before insert on public.projects for each row execute function public.enforce_project_limit();
create trigger projects_bump_version before update on public.projects for each row
  execute function public.bump_cloud_version();   -- new.cloud_version = old.cloud_version + 1 (client never sets it)

-- RLS: real policies (diceify's only rule is "owner only")
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
-- no insert/update/delete policies: billing columns are written by service role only
alter table public.projects enable row level security;
create policy projects_select_own on public.projects for select to authenticated using (owner_id = (select auth.uid()));
create policy projects_insert_own on public.projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy projects_update_own on public.projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy projects_delete_own on public.projects for delete to authenticated using (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images','project-images', false, 10485760, array['image/jpeg','image/webp','image/png']) on conflict (id) do nothing;
-- storage.objects policies: select/insert/update/delete to authenticated where bucket_id='project-images'
-- and (storage.foldername(name))[1] = (select auth.uid()::text). SELECT is required for upsert (recordio finding).
```

Column-vs-blob rule (recordio): what list views need without parsing JSON is a column (`name`, `total_dice`,
`completed_dice`, `percent_complete`, `image_path`, `cloud_version`); everything the editor needs to restore
state is the blob. Client-side CAS: `update({...}).eq('id', id).eq('cloud_version', expected).select()`;
zero rows → reload row → conflict.

### Project document (`core/dice/document.ts`)

```ts
export const CURRENT_SCHEMA_VERSION = 1
export type AspectRatio = '1:1'|'3:4'|'4:3'|'2:3'|'16:9'
export interface CropParams { x; y; width; height; rotation: number; aspectRatio: AspectRatio }   // in downscaled-image coords
export interface ProjectDocument {
  schemaVersion: 1
  step: 'crop'|'tune'|'build'          // 'upload' never persisted (a project always has an image)
  crop: CropParams | null
  dice: DiceParams                     // numRows, colorMode, contrast, gamma, edgeSharpening, rotate6/3/2
  grid: { width: number; height: number } | null   // dims buildProgress refers to
  buildProgress: { x: number; y: number }
}
createDefaultDocument(); migrateDocument(raw: unknown): ProjectDocument   // legacy draft snapshot (no schemaVersion) → v1; version chain; always stamps CURRENT
fromLegacyProjectRow(row): ProjectDocument   // Prisma columns → v1 (used by migration script) ; nearestAspectRatio(w,h); scaleCrop(crop, factor)
documentStats(doc): { totalDice, completedDice }   // width*height ; y*width+x clamped
documentsEqual(a,b); cropParamsEqual(a,b,0.01); progressApplies(doc, baseline)
class DocumentError { code: 'INVALID' | 'UNSUPPORTED_VERSION' }   // thrown by migrateDocument / fromLegacyProjectRow
```

Zod schema for the document lives next to it (`document.schema.ts`, zod `^4` is allowed in core as its only dep;
validated on load and before save). `DICE_PARAM_BOUNDS` (numRows 20..120, contrast 0..100, gamma 0.5..1.5,
edgeSharpening 0..100 — the real slider ranges) is exported from it for the tune sliders (B3). A current v1 document
is validated strictly (throws); legacy inputs (draft snapshot, Prisma row) are normalized first — numbers clamped
into the bounds, unknown color modes → 'both', `upload` step → 'crop' — so an old draft never fails to load.

### Entitlements (`core/billing/entitlements.ts`, mirrored by SQL `effective_plan`/`project_limit`)

```ts
type Plan = 'explorer'|'creator'|'studio'|'lifetime'
const PRO_SUBSCRIPTION_STATUSES = new Set(['active','trialing','past_due'])
interface BillingState { plan; planExpiresAt; subscriptionStatus; currentPeriodEnd; cancelAt; hasStripeCustomer: boolean }   // profile columns, ISO strings
interface Entitlements { plan; isPro; projectLimit: number; builderRowLimit: number|null /* null = unlimited, never Infinity */;
                         hasSvgExport: boolean; accessUntil: string|null; cancelAt: string|null; renews: boolean; canManageBilling: boolean }
PLAN_LIMITS = { explorer:{1,5,false}, creator:{1,null,true}, studio:{5,null,true}, lifetime:{5,null,true} }   // in core/billing/plans.ts, with PRICING + CheckoutPlan
deriveEntitlements(b: BillingState, now: Date): Entitlements     // priority: lifetime → studio(PRO status) → creator(planExpiresAt > now) → explorer
// accessUntil: studio = cancelAt ?? currentPeriodEnd, creator = planExpiresAt, else null; renews = studio && !cancelAt;
// canManageBilling = hasStripeCustomer (any Stripe customer may open the portal). EXPLORER_ENTITLEMENTS = signed-out default.
```
`useEntitlements()` (client) = `deriveEntitlements(profileRow)`; `EXPLORER_ENTITLEMENTS` when signed out. **The only gating source.**

### Billing edge functions (`supabase/functions/`)

- `deno.json` imports: `stripe` → `npm:stripe@20`, `@supabase/supabase-js` → `npm:@supabase/supabase-js@2`, `zod` → `npm:zod@3`.
- `_shared/billing-snapshot.ts` (**pure, zero imports**, local minimal types for the Stripe fields used, tested with vitest):
  `computeBillingSnapshot(current: {plan, planExpiresAt}, facts: {subscriptions, checkoutSessions}, now) → {plan, stripe_subscription_id, subscription_status, current_period_end, cancel_at, plan_expires_at}`.
  Rules: lifetime never downgraded; pick newest subscription with PRO status else newest overall; `current_period_end` from `items.data[0].current_period_end` (fallback root); creator expiry = max(stored, each completed `mode=payment` session with `metadata.plan|planType === 'creator'` → `created + 30d`); plan = studio if chosen sub is PRO, else creator if expiry > now, else studio/creator (lapsed, informational) else explorer.
- `_shared/billing-sync.ts`: `syncBillingFromStripe({ profileId | stripeCustomerId })` → `subscriptions.list({customer, status:'all', limit:10})` + `checkout.sessions.list({customer, limit:20})` → snapshot → `update profiles … , synced_at=now()` (service role). Returns the BillingView.
- `stripe-webhook/index.ts` (`verify_jwt = false` in config.toml): `constructEventAsync(rawBody, sig, secret)`; for `checkout.session.completed`, `customer.subscription.*`, `invoice.paid|payment_failed|payment_action_required` → extract `object.customer` → sync. Unknown customer → warn + 200. Stripe API failure → 500 (Stripe retries). Anything else → 200.
- `billing/index.ts` (`verify_jwt = true`; user from `Authorization` via `supabase.auth.getUser`), sub-routes by pathname:
  `POST /billing/checkout {plan}` → 409 if already pro; ensure customer (`customers.create({email, metadata:{userId}})`, persist id **before** session); `checkout.sessions.create` with `client_reference_id`, `metadata {userId, plan}`, `success_url=${APP_URL}/account?checkout=success`, `cancel_url=${APP_URL}/#pricing`.
  `POST /billing/portal {returnPath?}` → any profile with a customer id.
  `POST /billing/cancel` → `subscriptions.update(id, {cancel_at_period_end:true})` → sync → view. `POST /billing/resume` → `{cancel_at_period_end:false}` → sync.
  `GET /billing/sync` → sync (skipped if `synced_at` < 30 s ago) → view. Account page calls it on load; `?checkout=success` polls it every 2 s up to 10× until `isPro` flips.
- Stripe client pinned: `new Stripe(key, { apiVersion: '2025-11-17.clover' })`; webhook endpoint in the dashboard set to the same version.
- Local: `supabase functions serve --env-file supabase/.env.local` (STRIPE_SECRET_KEY sk_test, STRIPE_WEBHOOK_SECRET from `stripe listen`, 3 price IDs, APP_URL) + `npm run stripe:listen` = `stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook`. Prod secrets via `supabase secrets set`. Boot guard: refuse `sk_test_` when `SUPABASE_URL` is not local.
- Errors: JSON `{ error: { code, message, details? } }`; codes UNAUTHORIZED, VALIDATION, ALREADY_SUBSCRIBED, NO_SUBSCRIPTION, INTERNAL.

### Client data access (`lib/supabase/`)

- `client.ts`: `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` (browser; localStorage session; PKCE; `detectSessionInUrl`).
- Auth: `signInWithGoogle(redirectTo)` = `signInWithOAuth({ provider:'google', options:{ redirectTo, queryParams:{ prompt:'select_account' } } })`; `redirectTo = ${origin}/editor?restored=true`. Redirect allow-list in Supabase: `http://localhost:3000/**`, `https://diceify.art/**`, `https://*.diceify.pages.dev/**`. Sign-out: `auth.signOut()`.
- `profile.ts`: `getProfile()` (own row), `ProfileProvider`/`useUser()` = `{ status:'loading'|'anon'|'authed', user, profile, entitlements, refresh(), signOut() }`; subscribes to `onAuthStateChange`.
- `projects.ts` (typed by generated `database.types.ts`): `list()` (summary columns), `get(id)` (row + `downloadImage`), `create({ name, document, imageBlob })` (client uuid → storage upload `{uid}/{id}/original.jpg` → insert; PROJECT_LIMIT surfaced from the trigger's errcode/detail), `save(id, { name, document, expectedVersion })` (CAS; returns `{ ok, version } | { conflict: row }`), `remove(id)` (delete row, then `storage.remove([...])`), `rename`.
- `storage.ts`: `downloadImage(path) → Blob` (RLS-scoped; `URL.createObjectURL` for the pipeline). No signed URLs.
- Flush on unload: `save()` via `fetch(REST url, { keepalive:true, headers:{ apikey, Authorization } })` on `pagehide`/`visibilitychange=hidden` (supabase-js has no keepalive option; a 10-line helper).

### Dice core (`core/dice/`) — pure, deterministic

- `Pixels { data: Uint8ClampedArray; width; height }` RGBA top-down. `DiceGrid { width; height; rows: Die[][] }` **row-major, `rows[y][x]`, y=0 = bottom row** (the build row number users see). `Die { face; color; rotate90? }`.
- Pipeline: `toGrayImage` → `downsample` (exact area-average, fractional edge weights via `axisWeights`) → `sharpen` (3×3 Laplacian on the small gray image, borders copied) → per cell `mapGrayToDie` = `applyGamma` → `applyContrast` → `mapBrightnessToDie` (threshold tables exported as constants; current values preserved) → `shouldRotate` (`rotate90: true` only when rotated; key absent otherwise). Intermediate images are `Float32Array`; `computeGridSize` = `rows: numRows, cols: max(1, round(numRows * (W / H)))`.
- `build.ts`: `buildIndex`, `positionFromIndex`, `countCompleted`, `isCompleted` (current die NOT counted; fixes the ProgressPreviewModal off-by-one), `sameDie` (face + color; rotation ignored), `findRun`, `findNextDiff/PrevDiff` (row-local, `null` at the row end), `nextPosition/prevPosition` (`null` at the grid ends), `svgRow`/`gridRowFromSvg`, `computeViewBox({ current, cols, rows, zoomLevel, aspect, lastViewX }) → { viewBox, lastViewX }` (ported verbatim from BuilderMain.buildZoom, minus animation), `visibleWindow`, `bufferedWindow`, `windowContains` (inclusive `CellWindow` in SVG rows), `rowLimitAllows(pos, limit | null)` (rows `< limit`; "forward moves only" stays at the call site).
- `svg.ts`: `renderDieSymbolBody`, `renderDefs`, `renderWindowSvg(grid, win)` (defs + `<use>`), `renderGridSvg(grid, { background?, width?, height? })` and `renderProgressSvg(grid, progress, { placeholderFill?, placeholderStroke?, showAll?, width?, height? })` (both full standalone `<svg>` documents sharing one wrapper; a size swaps the fill-the-box `style` for `width/height` attributes, as the old rasterizer's regex did), `rasterSize` — uses `getDotPositions` once (deletes the duplicated dot math). `renderGridSvg` without options equals the old `render` output (test-pinned).
- Fixtures: `scripts/gen-fixtures.ts` (sharp, dev-only; portrait source is `public/images/monalisa.webp` — `public/demo-portrait.jpg` is a text placeholder) → `core/dice/__fixtures__/*.json` `{ name, width, height, rgbaBase64, params, expected: { width, height, rows: string[] } }`, one space-separated line per grid row (row 0 = bottom) with dice encoded `w3`, `b6r` (format helpers in `core/dice/__fixtures__/format.ts`). `generate.test.ts` loads every fixture and asserts equality. `core/README.md` documents every formula, summation order, orientation, schema.
- Purity: `core/tsconfig.json` (`lib: ["es2022"]`, no DOM types), ESLint restricted globals/imports for `core/**` plus an import allowlist for non-test core files (relative paths and `zod` only; tests may import vitest/node and, for output comparisons, legacy app modules behind a line-level disable), `core/purity.test.ts`.
- Browser adapters (`lib/image/`, B1): `decode.ts` — `loadImage`, `fitScale(w, h, maxSide)` (≤ 1, never upscales), `rotatedBounds(w, h, deg)` (rounded bounding box), `drawRegion(img, region, maxSide)` (one `drawImage` with translate/rotate/scale; the cropper's coordinates live in the rotated bounding box), `canvasToPixels`, `dataUrlToPixels(src, 2048)`, `downscaleForUpload(file, 2048, 0.85) → Blob`; `crop.ts` — `cropToPixels(src, crop, 2048)` (**the single crop path**: live crops and restores both go through it, so a reload reproduces the grid exactly; replaces `cropper.getCanvas` and `cropImage`); `rasterize.ts` — `rasterizeSvg(svg, size, { logo? })` (SVG must already carry `width/height` = `size`; `logo` draws the pill; dedupes useDiceGeneration + ProgressPreviewModal, each caller picks its long side via `rasterSize`: pipeline 1080, progress preview `min(max(cols, rows) × 10, 1080)`).

### Editor state

- `useDocumentStore` (zustand + `subscribeWithSelector` + `temporal`): flat state `{ crop, dice, buildProgress, buildBaseline, name }` (`step` lives in the ui store); `partialize: s => ({ crop, dice })`; JSON equality; limit 50; actions `setCrop/updateCrop/updateDice/setBuildProgress/setName/enterBuild/resetForNewImage/resetAll/loadDocument` (`updateCrop`/`updateDice`/`setBuildProgress` are no-ops on identical values; `updateCrop` is a no-op without a crop). `crop.aspectRatio`/`crop.rotation` are the single source for the crop step (`DEFAULT_ASPECT_RATIO` from core before the first report). `replaceDocument(doc, name)` = load + clear history + `useDerivedStore.reset(doc.grid)`; `buildDocument(state?, step?, gridSize?)` composes the persisted JSON (`'upload'` → `'crop'`, zeroes progress when params drifted from `buildBaseline`, same semantics as before). `store/editor.ts` holds the cross-store composites `uploadImage(src)` / `resetEditor()`.
- `useEditorUiStore` `{ step, modal: 'signIn'|'projects'|'limit'|'proFeature'|'resetProgress'|null, signInMessage, pendingStep }` + `setStep/openModal/closeModal`. One modal at a time. `ProgressPreviewModal` stays local state (one opener per layout) and `ProFeatureModal`'s inner sign-in stays local. No `isInitializing` here: `useProjectStore.boot` is the single flag.
- `useDerivedStore` `{ grid, stats, gridSize, previewUrl, isGenerating, error }` + `startGeneration/setGrid/finishGeneration/failGeneration/reset`; written by `useDicePipeline`, `reset()` by load/upload/reset. `useBuildProgress()` (`hooks/`) = `{ currentIndex, totalDice, percent }` from `buildProgress` + `gridSize` — the one place the percentage is computed.
- `useProjectStore` `{ boot, projectId, cloudVersion (C3), imageSrc, imageBlob (draft only, C3), saveStatus: 'idle'|'dirty'|'saving'|'saved'|'error', lastSaved, projects[] }`.
- `historyBatcher.ts` = recordio's `createHistoryBatcher` (latch + interaction counter) plus `untracked(action)` (pause → action → resume; records nothing, keeps the redo stack); `documentHistoryBatcher` is the singleton, `useDocumentHistoryBatcher()` the hook-shaped accessor. `ParamSlider` pointerdown/up/cancel + `batchAction`; `OrientationControl` derives the glyph rotation from params (no local state).
- `buildNavigation.ts` (plain functions over the stores): `buildTargets(grid, pos)` / `currentTargets()` → `{ prev, next, prevDiff, nextDiff }`, `moveTo(target, gate: { rowLimit, onBlocked })` (bounds check, forward moves past the row limit → `onBlocked`). `useBuildNavigation()` = `useBuildGate()` (session plan → gate, exported for the shortcut hook) + selectors → `{ current, currentDie, percent, canNavigate, navigatePrev/Next/PrevDiff/NextDiff, navigateTo(x, y) }`.
- Crop widget (`CropMain`): the document's `crop` is the source of truth. User gestures (`onInteractionStart/End`) report once at the end as one tracked `setCrop`; every other `onChange` (mount, stencil-ratio reconcile, boundary refresh, the sync effect) is a 100 ms-debounced **untracked** report. Sync effect on `crop`: `rotateImage(delta)` if the rotation differs, `setCoordinates` if the box differs (`cropParamsEqual`, 0.01); the widget's untracked write-back settles it without loops or entries. Panel ratio = `updateCrop({ aspectRatio })` (one entry; the reconcile is untracked); panel rotate = `rotateCrop(90)` through a tiny registered `cropperHandle` (`rotateImage` + tracked report), so the entry carries the rotated box and undo restores the previous one exactly.
- Undo/redo UI: `useUndoRedo()` → `{ canUndo, canRedo, undo, redo }`; `HistoryButtons` (desktop header, `Undo2`/`Redo2`, disabled when empty) + two entries in `MobileMenu`. Enabled in every step whenever history exists (undoing a tune change from build is drift; progress resets on re-entering build). `replaceDocument`/`uploadImage`/`resetEditor` clear history.
- `useEditorShortcuts`: ONE global keydown mounted in the editor page (`isTypingTarget` guard): cmd/ctrl-z, shift for redo; other meta/alt combos ignored; arrow keys (+shift for diff jumps, falling back to a plain step when the row has none) only on the build step with no modal open, via `currentTargets()`/`moveTo()`. BuildViewer's handler and the `D` FPS debug are removed.
- `steps.ts`: `STEPS`, `STEP_LABELS`, `stepIndex`, `nextStep/prevStep`, `canAdvance(step, { hasImage, hasCrop })`, `needsResetConfirm`; `useStepNavigation` → `{ step, canGoNext, canGoBack, goNext, goBack, goTo }` used by all panels + `MobileBottomBar` (deleted 3 duplicated transition blocks); `goTo('build')` calls `enterBuild()`, leaving build with progress opens `resetProgress` with `pendingStep` (the modal is mounted once in the page and completes the move).
- Autosave: store subscriptions (document store, ui `step`, derived `gridSize`), 1.5 s debounce, whole document (`{ doc, name }`; until C3 mapped to the Prisma columns by `toLegacyProjectFields`, the inverse of `fromLegacyProjectRow`) + `expectedVersion`; conflict → `replaceDocument(server)` + toast; anonymous → `localStorage['diceify.draft'] = { doc, name, savedAt }` + image Blob in IndexedDB (`idb-keyval`); legacy keys `editorState/editorImage/editorBuildProgress` migrated on first hydrate.
- `useEditorBootstrap` (replaces the six effects in page.tsx): `?project=` handling, `restored=true` draft hydrate after OAuth, "save draft as project" via the projects modal, most-recent-project load, `boot='ready'` + `markClean()`.
- Gating: `useGate()` → `{ ent, gate(allowed, { signInMessage?, modal? }) }`; call sites: build navigation row limit, BuilderLimitToast, blueprint download, progress preview SVG, project list/create limit copy, UserMenu/MobileMenu, PricingCards.

### Static export + Cloudflare Pages

- `next.config.js`: `output: 'export'`, `images.unoptimized`, `eslint.ignoreDuringBuilds`, `trailingSlash: false`.
- Remove server-only bits: `app/api/**`, `middleware.ts.backup`, `opengraph-image.tsx`/`twitter-image.tsx` (replace with static `metadata.openGraph.images = ['/images/og-image.jpg']`), `@vercel/analytics`, `auth()` in layouts. `useSearchParams` already wrapped in Suspense. `sitemap.ts`/`robots.ts`/`generateStaticParams` are export-compatible.
- Cloudflare Pages project: build `npm run build`, output `out`, Node 20; env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`; production branch `master`, preview branch `revamp`. `public/_headers` for basic security headers. `not-found.tsx` → `404.html`.
- `docs/DEPLOY.md`: Pages setup, Supabase link/push/secrets, Stripe endpoint, DNS.

### Tooling

- `vitest@^3` (4/5 crash npm 11.5.1's arborist / miss rolldown bindings — see agent-suggestions) (node env; `include: core/**, lib/**, features/**, supabase/functions/_shared/**`; alias `@` → root; `allowImportingTsExtensions` so `_shared` files with `.ts` imports test under vitest and run under Deno).
- ESLint 9 flat config (`eslint.config.mjs`): `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` (only `rules-of-hooks` + `exhaustive-deps`; v7's preset adds React-Compiler rules we don't use), `@next/eslint-plugin-next@15` (v14 uses APIs removed in ESLint 9; v15 is dev-only, no `next` peer, exports `flatConfig.coreWebVitals`); `no-explicit-any: error`; core purity overrides; import boundaries. Drop `eslint-config-next@15`, `@typescript-eslint/*`.
- Scripts: `dev`, `build`, `test`, `test:watch`, `lint`, `typecheck` (`tsc --noEmit && tsc -p core`), `db:start|stop|reset|types|push`, `functions:serve`, `functions:deploy`, `stripe:listen`, `gen-fixtures`, `migrate:legacy`.
- Deps add: `@supabase/supabase-js`, `zod`, `zundo`, `idb-keyval`, `sonner`, `@sentry/nextjs`; dev: `vitest`, `tsx`, `pg`, `@types/pg`, `supabase` (CLI), eslint packages above; `sharp` → dev. Remove: `prisma`, `@prisma/client`, `next-auth`, `@auth/prisma-adapter`, `stripe` (moves to Deno), `@vercel/analytics`, `opentype.js`, `puppeteer`, `glob`, `eslint-config-next`, `@typescript-eslint/*`; pin `@next/third-parties@^14.2`. (A1: `@next/eslint-plugin-next` is `^15`, `vitest` is `^3` — see Tooling above.)
- CLAUDE.md rewritten (short): rules, architecture map + import rules, core orientation/pipeline/fixtures regen rule, store ownership + undo rules, gating rule, commands, "no manual browser tests unless asked". Stale PRD tables removed.

### Cleanup (applied across steps; final sweep in E3)

Delete: `lib/dice/{renderer,cache,generator,svg-renderer}.ts`, `lib/utils/{image,debug,billing,saveStatus}.ts` (moved/rewritten), `lib/styles/*`, `lib/theme.ts`, `lib/store/useEditorStore.ts`, `lib/{auth,prisma,stripe,subscription}.ts`, `prisma/`, `next-auth.d.ts`, `types/next-auth.d.ts`, `middleware.ts.backup`, `app/api/**`, `app/opengraph-image.tsx`, `app/twitter-image.tsx`, `components/{Providers,SessionRefresher,CommissionModal,ConfirmDialog}.tsx`, `components/Editor/ConfirmDialog.tsx`, `components/LandingPage/HowItWorks.tsx` (+ its CSS), `components/DiceStepper/`, root `diceify-creator.html`, `diceify-glass.html`, `tiktok-dice-recorder.html`, `tests/`, `.env` (Prisma-era), `tsconfig.tsbuildinfo` from git. Fix `sitemap.ts` (`/auth/signin`). Flag (user wording, not changed): Terms §4.4/§5.1 "permanent access" for Creator Pass; Privacy page mentions Vercel Analytics.

---

## Steps

Each step: fresh agent, own `revamp-step-N.md`, ends with `npm run typecheck && npm test && npm run lint && npm run build` green plus its manual checks. Sizes ≈ 1–2 h. Order matters within a phase; phases B and C can interleave only where noted.

### Phase A — Foundation (no behavior change)

**A1 — Branch, plan docs, tooling baseline.** Create `revamp` branch; copy this doc to `plans/revamp/revamp-tiered-plan.md`; add `vitest.config.ts`, `eslint.config.mjs`, `core/tsconfig.json`, scripts (`test`, `lint`, `typecheck`); delete `tests/` + puppeteer/glob; pin `@next/third-parties`; `git mv lib/dice/constants.ts core/dice/geometry.ts` with the first real test (`getDotPositions` counts 1..6) and update its 3 importers. Verify: all four commands green; lint may warn but not error.

**A2 — Pure core: sampling, mapping, generate, stats, fixtures.** `core/dice/{types,mapping,sample,generate,stats}.ts` + tests (threshold boundaries for all 3 modes; downsample invariants; sharpen identity at 0 + border rule), `scripts/gen-fixtures.ts`, `__fixtures__/*.json` (demo-portrait at 2 sizes, gradient strip, checker), `core/README.md`, `core/purity.test.ts`, ESLint core overrides. Old `lib/dice` still in use. Verify: tests green; `tsc -p core` with no DOM lib; fixture regen is idempotent (clean git diff).

**A3 — Pure core: build math, SVG, document, entitlements.** `core/dice/{build,svg,document}.ts`, `core/billing/{entitlements,plans}.ts` + tests. `computeViewBox` ported verbatim with tests pinning current numbers; `svg.ts` output snapshot-compared to current `DiceSVGRenderer.render` for a 3×2 grid; `migrateDocument` tests (legacy draft, legacy Prisma row, missing version); entitlements table-driven (every plan/status/expiry combo, `null` not `Infinity`). Verify: tests green; `tsc -p core`.

### Phase B — Editor on the core (still Prisma/NextAuth backend)

**B1 — Browser adapters + pipeline on core.** `lib/image/{decode,crop,rasterize}.ts`; `useDiceGeneration` → A/B/C stages on `cropToPixels` (single crop path; CropperMain only reports coordinates; `croppedImage` removed from store); blueprint download + ProgressPreviewModal on `core/dice/svg`; delete old `lib/dice/*` and `lib/utils/image.ts`; grid orientation switch for these consumers. Verify: upload→crop→tune preview; blueprint SVG opens; progress preview renders; draft reload yields identical stats before/after.

**B2 — Builder on core/build.** `useBuildNavigation` + `BuilderMain` use `findRun/findNextDiff/computeViewBox/visibleWindow/renderWindowSvg`; rules-of-hooks violation fixed; FPS/`D` debug + `.no-scrollbar` removed (B1 already switched both to `rows[y][x]` + `renderWindowSvg` and fixed the ProgressPreviewModal off-by-one through `renderProgressSvg`/`isCompleted`). `BuilderMain` becomes a wrapper (wake lock + spinner) around `BuildViewer` (non-null `grid` prop) composed of `useBuildZoom` (buttons + pinch), `useBuildWindow` (`ensureRendered`, window tagged with its grid), `useBuildViewBox` (`computeViewBox` + the 1 s `motion.animate` tween, cleanup-stopped), `useElementSize` and `RunBadges`; the row limit is `PLAN_LIMITS.explorer.builderRowLimit` derived from the session until C2. Verify: manual build walkthrough (next/prev/diff, click-to-jump, badges, pan threshold, pinch zoom, arrows) unchanged; tests green.

**B3 — Store split + step machine.** `features/editor/store/*` (document store with zundo, ui, derived, project), `features/editor/steps.ts`, `useStepNavigation`; `selectedRatio`/`cropRotation` folded into `crop`; `TuneMain` uses `isGenerating`; autosave/project manager adapted to the new stores (still current API + localStorage); `lib/store/useEditorStore.ts` deleted; `zundo` added. Verify: store tests (enter build after param change resets progress; unchanged keeps it; `buildDocument` zeroes drifted progress); manual full flow; reload restores draft with the correct aspect ratio (fixes the silent 1:1 re-crop bug).

**B4 — Undo/redo UX.** `historyBatcher.ts`, `useEditorShortcuts.ts` (arrow keys merged, BuilderMain keydown removed, `buildNavigation.ts` plain functions), `ParamSlider` interaction hooks, `OrientationControl` derived state, `CropMain` sync effect, header undo/redo buttons (desktop) + mobile menu entries. Verify: batcher test (20-update drag = 1 past state; no-op interaction adds none); manual: undo slider drag, rotation, aspect change; undo while typing project name does nothing; history cleared after load; redo.

**B5 — Route groups, feature folders, CSS split, brand unification.** Folder structure above via `git mv`; `app/(marketing)` + `app/(editor)` layouts; `styles/{base,marketing,editor}.css` (define `.custom-scrollbar`, dark scrollbars); delete `lib/theme.ts`, `--pink: #FF2D92` single source, editor pink classes → `accent-pink` tokens; `SignInModal` (marketing-safe, `onBeforeSignIn`) + `EditorSignInModal`; `PricingCards` decoupled from the editor store; `EditorScreen`/`EditorHeader`/`useEditorBootstrap`/`useMediaQuery` extracted from page.tsx; Reddit banner moves into `EditorHeader`; HowItWorks + Providers deleted (CommissionModal went in B1); import-boundary lint rule on. Verify: build; landing/blog/gallery/pricing/editor render identically except the unified pink; `features/marketing` cannot import `features/editor` (lint).

### Phase C — Supabase (auth, data, storage)

**C1 — Supabase scaffold + schema.** `supabase/config.toml` (auth site/redirects, Google provider from env, bucket), `migrations/<ts>_initial_schema.sql` (full DDL above incl. RLS policies, triggers, `bump_cloud_version`, storage policies), `seed.sql`, generated `lib/supabase/database.types.ts`, `lib/env.public.ts`, `.env.example` rewritten, npm `db:*` scripts, `docs/DEPLOY.md` skeleton. Verify: `supabase db reset` clean; Studio: add auth user → profile row; insert 2 projects for an explorer → second raises PROJECT_LIMIT; update bumps `cloud_version` and `updated_at`; `percent_complete` computes; `db:types` rerun is diff-free; as an authenticated user via the REST API, cross-user select returns 0 rows.

**C2 — Client auth + profile + entitlements; remove NextAuth.** `lib/supabase/{client,profile}.ts`, `features/account/useUser.tsx` (ProfileProvider), `signInWithGoogle`, sign-out; `EditorSignInModal` flushes draft then redirects with `restored=true`; every `useSession` site → `useUser`/`useEntitlements`; `useGate` + all gating call sites (row limit, toast, blueprint, progress preview, project limit copy, menus, pricing); delete `lib/auth.ts`, `lib/subscription.ts`, both `next-auth.d.ts`, `app/api/auth`, `SessionRefresher`; uninstall next-auth packages. Google birthday scope gone. Verify: local Google sign-in round trip lands on `/editor?restored=true` with the draft intact; `auth.users`+`profiles` rows exist; edit `profiles.plan` in Studio → gating changes after refresh; `grep -r next-auth` empty.

**C3 — Projects, images, drafts on Supabase.** `lib/supabase/{projects,storage}.ts` (typed; create = client uuid → upload → insert; CAS save; delete + storage remove), `features/editor/store/{autosave,draft}.ts` rewrite (whole-doc save, conflict reload + toast via `sonner`, keepalive flush helper, `idb-keyval` draft image with legacy-key migration), `useProjects` (typed, no `alert`), `useEditorBootstrap` on `useUser`, immutable-image UI ("New project" from the upload step; no "replace image"), `downscaleForUpload` on upload; delete `app/api/projects/**`, `lib/prisma.ts`, `prisma/`. Verify: anonymous draft survives reload; sign in → "save as project" uploads + inserts; two tabs editing → second reloads with toast; close tab mid-edit → change persisted; list/create/delete/rename; explorer second project → limit modal; storage object at `{uid}/{id}/original.jpg` ≤ 2048px; project delete removes the object.

### Phase D — Billing (edge functions)

**D1 — Edge functions scaffold, billing sync, webhook.** `supabase/functions/deno.json`, `_shared/{billing-snapshot (+vitest), billing-sync, stripe, supabase-admin, http}.ts`, `stripe-webhook/index.ts`, `billing/index.ts` with only `GET /sync`; `config.toml` `[functions.stripe-webhook] verify_jwt = false`; `supabase/.env.local` example; `npm run functions:serve`, `npm run stripe:listen`; `docs/STRIPE_TESTING.md` (cards, flows, `stripe trigger`, test clocks, dashboard-cancel-then-sync). Delete `app/api/stripe/**`, `lib/stripe.ts`. Verify: snapshot unit tests (active+canceled picks active; only canceled → plan studio but entitlements explorer; creator via `planType` metadata; monotonic expiry; lifetime kept; item-level period end); `stripe trigger customer.subscription.updated` → 200 + "unknown customer" log; a test-mode customer with a real subscription → `GET /billing/sync` fills the profile columns.

**D2 — Checkout, portal, cancel, resume + Account page + pricing wiring.** Remaining `billing` routes; `lib/supabase/billing.ts` (`functions.invoke` wrappers); `app/(editor)/account/page.tsx` (plan, access-until/cancel-at, Cancel/Resume/Portal/Refresh, `?checkout=success` polling); `PricingCards`/`Pricing`/`ProFeatureModal` call checkout; `UserMenu`/`MobileMenu` link to `/account`; `CheckoutSuccessHandler` replaces SessionRefresher. Verify (with `stripe listen`): buy Creator with 4242 → plan creator, expires +30 d; buy Studio → active + period end; second checkout while pro → 409; only one Stripe customer per user; cancel → `cancel_at` set, still pro, `renews=false`; resume → cleared; stop `stripe listen`, cancel in dashboard, open `/account` → reflected via sync; portal opens and returns.

### Phase E — Static export, Cloudflare, Sentry, cleanup

**E1 — Static export on Cloudflare Pages.** `output: 'export'`; static OG metadata replaces the image routes; remove `@vercel/analytics`; `public/_headers`; verify no server-only APIs remain; create the Pages project (preview = `revamp`), set env vars, add the `pages.dev` URL to the Supabase redirect allow-list; `docs/DEPLOY.md` completed. Verify: `npm run build` produces `out/` with `index.html`, `editor.html`, `blog/*/index.html`, `404.html`, `sitemap.xml`, `robots.txt`; preview URL: landing, blog post, editor, Google sign-in round trip, project save, checkout (test mode) all work.

**E2 — Sentry + error boundary.** `@sentry/nextjs` client config (DSN optional → inert), `withSentryConfig` (sourcemaps only when `SENTRY_AUTH_TOKEN` set in Pages build env), `lib/report-error.ts` (`reportError`, `setErrorUser`), `app/(editor)/editor/error.tsx`, report sites (pipeline stages, autosave errors, draft parse/IDB, project load/create/remove, upload decode), `setErrorUser` in `EditorProviders`. Verify: forced throw in a step component → boundary + event in Sentry tagged with user id; DSN unset → no network, no console noise; pipeline error sets `derived.error` and reports once.

**E3 — Cleanup, docs, deps.** Apply the Cleanup list fully; `CLAUDE.md` + `README.md` rewritten; `.env`/`tsbuildinfo` untracked; deps pruned; `no-explicit-any` and boundary rules at `error`; sitemap fix; TODO comments flagging Terms/Privacy wording. Verify: `npm run lint` zero warnings; `git grep -E "prisma|next-auth|theme\.colors|devLog|useSession|lib/subscription|maxProjects=|vercel"` empty (except docs/privacy flag); build + tests green.

### Phase F — Migration and cut-over

**F1 — Migration script, rehearsed locally.** `scripts/migrate-from-prisma.ts` (tsx; `pg` on `LEGACY_DATABASE_URL`; flags `--dry-run`, `--since`, `--only=<email>`): select paid OR active-30d users; `auth.admin.createUser({ email, email_confirm:true, user_metadata })` (profile via trigger); set plan columns + `legacy_id`; `syncBillingFromStripe` for customers (same `_shared` code, run via Deno or a Node port of the two-call sync); per project: decode base64 → `sharp` ≤2048 JPEG → scale crop by factor → `fromLegacyProjectRow` → upload to storage → insert with `legacy_id`, preserved timestamps; idempotent; summary report. Verify on the local stack with a `pg_dump` copy of prod: counts match the selection query; rerun is a no-op; a migrated project opens with the correct crop; a migrated studio-canceled user shows `cancel_at`; **Google-linking check**: admin-created user signs in with Google → still one `auth.users` row with a google identity (if this fails, stop and report; fallback is Supabase manual linking).

**F2 — Production cut-over (runbook in `docs/DEPLOY.md`).** Hosted Supabase project: `supabase link`, `db push`, `functions deploy`, `secrets set`, Google provider + redirect URLs, Site URL `https://diceify.art`; Stripe live webhook → `https://<ref>.supabase.co/functions/v1/stripe-webhook` (pinned API version; disable the old Vercel endpoint); Cloudflare Pages: merge `revamp` → `master`, set production env; freeze the old site; run `migrate:legacy --dry-run` then for real; smoke test (migrated lifetime user, migrated studio-canceled user, new user + real Studio purchase refunded); move DNS `diceify.art` from Vercel to Pages; keep the old DB read-only 30 days, then delete the Vercel project.

---

## Verification (end-to-end, after F2 or on the preview URL after E1)

1. `npm run typecheck && npm test && npm run lint && npm run build` green; `tsc -p core` compiles without DOM types.
2. Anonymous: upload → crop (rotate, 4:3) → tune (undo a slider drag, undo rotation) → build 3 rows → reload: everything restored incl. aspect ratio and progress.
3. Sign in with Google from the editor → returns with the draft → save as project → storage object exists → list shows it.
4. Explorer: 6th build row blocked with the right modal (signed in vs out); second project blocked with limit copy showing "1".
5. Buy Studio (test card) → `/account` flips to Studio within ~10 s → Cancel → "access until" → Resume; Stripe dashboard cancel with webhooks off → `/account` reflects after sync.
6. Two tabs: conflicting edits → second tab reloads with a toast, no data corruption (`cloud_version` monotonic).
7. Sentry receives a forced client error with the user id.
8. Landing/blog/gallery/dice-art pages are pre-rendered HTML in `out/` (view-source shows content); sitemap/robots present.

## Open items to confirm during implementation (not blockers)

- Terms §4.4/§5.1 Creator Pass wording ("permanent access" vs 30 days) and Privacy page "Vercel Analytics" wording: user to supply text; steps E3/F2 leave TODO comments.
- Supabase Google auto-linking for admin-created users: verified in F1 before touching prod.
- Creator pass repurchase: stays blocked while active (no stacking).

## Step log
- A1 — completed 2026-09-30. Design changes: `@next/eslint-plugin-next@^15` instead of `@14` (v14 calls `context.getAncestors`, removed in ESLint 9; v15 is dev-only with no `next` peer) and `vitest@^3` instead of 4/5 (npm 11.5.1 crashes resolving vitest 4's circular optional peers; vitest 5's rolldown binding does not install) — Tooling section updated. `eslint-plugin-react-hooks@7` registered with only `rules-of-hooks`/`exhaustive-deps` (both `warn` until B2/E3). `constants.ts` had 2 importers, not 3. `package-lock.json` regenerated (was corrupt). Four pre-existing lint errors fixed mechanically (2× `let`→`const`, empty props interface/pattern in `UploadMain`).
- A3 — completed 2026-09-30. Design changes: `renderProgressSvg` returns a full standalone `<svg>` sharing `renderGridSvg`'s wrapper (not a body fragment); `document.schema.ts` bounds follow the real sliders (numRows 20..120) and legacy inputs are clamped/normalized instead of rejected, `DICE_PARAM_BOUNDS` exported; `DocumentError` typed error; `rowLimitAllows` takes a `GridPos`; `BillingState.hasStripeCustomer` added and `canManageBilling` = that flag; `EXPLORER_ENTITLEMENTS` constant; `PRICING`/`CheckoutPlan` in `core/billing/plans.ts`; `zod@^4` (not 3); ESLint import allowlist for non-test core files — Project document, Entitlements, Dice core and Purity sections updated. Verification: typecheck 0, test 0 (10 files, 200 tests), lint 0 (0 errors, 89 pre-existing warnings), build 0.
- A2 — completed 2026-09-30. Design changes: fixture `expected.rows` is `string[]` (one space-separated line per grid row) instead of `string[][]` — same information, ~30% smaller, and `JSON.stringify(f, null, 2)` already yields one row per line; fixtures live in `core/dice/__fixtures__/` (as in the repo layout) with a shared `format.ts`; portrait fixtures use `public/images/monalisa.webp` because `public/demo-portrait.jpg` is a 329-byte text placeholder, not an image; per-cell pipeline factored as `mapGrayToDie` and edge weights as `axisWeights` — Dice core section updated. `sharp` moved to devDependencies (npm resolved `^0.34.5`), `tsx` added, `gen-fixtures` script added.
- B1 — completed 2026-09-30. Design changes: `decode.ts` also exports the pure helpers `fitScale`/`rotatedBounds` and the shared `drawRegion`/`canvasToPixels` (one canvas draw for crop, decode and upload downscale; `cropToPixels` never upscales, unlike the old `getCanvas`); the current store drops `updateCrop` (identical to `setCropParams`) along with `croppedImage`; `CommissionModal` + its store flag deleted now (nothing else referenced them); the ProgressPreviewModal off-by-one is fixed in B1 because `renderProgressSvg` uses `isCompleted`; BuilderMain/useBuildNavigation got only the `rows[y][x]` + `renderWindowSvg` change (B2 does the port). `core/dice/svg.test.ts` now compares against the frozen `__fixtures__/svg-3x2.svg` (written while the legacy renderer still matched). `downscaleForUpload` added (trivial on `drawRegion`). Browser adapters, B2 and B5 texts updated. Verification: typecheck 0, test 0 (11 files, 204 tests), lint 0 (0 errors, 81 warnings), build 0.
- B2 — completed 2026-09-30. Design changes: `BuilderMain` split into `BuildViewer.tsx` + `useBuildZoom/useBuildWindow/useBuildViewBox/useElementSize` hooks + `RunBadges.tsx` (same folder; B5 moves them); the viewBox animation is stopped by the effect cleanup instead of an `any`-typed ref; the rendered window is tagged with its grid (replaces the grid-change reset effect); `useBuildNavigation` drops the unused `hasUnlimitedDice`/`diceLimit` and reads `PLAN_LIMITS.explorer.builderRowLimit` from `core/billing`; `ResetProgressModal`/`useAutosave` use `buildIndex`/`countCompleted`; `react-hooks/rules-of-hooks` is `error` — B2 step text updated. Verification: typecheck 0, test 0 (11 files, 204 tests), lint 0 (0 errors, 47 warnings, 0 rules-of-hooks), build 0.
- B3 — completed 2026-09-30. Design changes: `'progressPreview'` dropped from the modal enum (local state, one opener per layout) and `isInitializing` not duplicated in the ui store (`useProjectStore.boot` only); `useBuildProgress()` is a hook file (a derived-store export would import the document store circularly); `store/editor.ts` added for the cross-store `uploadImage`/`resetEditor`; `replaceDocument` also seeds the derived `gridSize`/`stats.totalCount` from `doc.grid`; `DEFAULT_ASPECT_RATIO` exported from core; `SaveStatus` type lives in `lib/utils/saveStatus.ts` (import boundary); `hydrateFromLocalDraft` requires the image; `loadProject` lands on `crop` when a project has no crop; the page's remount-refetch effect removed (projects live in the store) — Editor state and Repo layout sections updated. Verification: typecheck 0, test 0 (13 files, 220 tests), lint 0 (0 errors, 33 warnings; was 47), build 0.
- B4 — completed 2026-09-30. Design changes: the batcher gains `untracked(action)` and `createHistoryBatcher` returns the batcher object (`documentHistoryBatcher`) with `useDocumentHistoryBatcher()` as the hook wrapper; the crop widget distinguishes tracked gesture reports (one `setCrop` at `onInteractionEnd`, no mid-gesture reports) from untracked reconcile/sync write-backs instead of batching them, so a ratio change is one entry without a batch; the panel's rotate goes through a registered `cropperHandle.rotateCrop(90)` (widget → store) rather than `updateCrop({ rotation })` (store → widget), because the store cannot know the rotated box up front and the sync effect cannot tell a stale forward rotation from an undo; `buildNavigation.ts` exposes `buildTargets/currentTargets/moveTo(target, gate)` with `useBuildGate()` exported from `useBuildNavigation.ts` (one gate for the hook and the shortcut); `useBuildNavigation` returns `current`/`currentDie` instead of `currentX/Y/currentDice`; `useUndoRedo` hook + `HistoryButtons` component added — Editor state and Repo layout sections updated. Verification: typecheck 0, test 0 (15 files, 237 tests), lint 0 (0 errors, 33 warnings), build 0.
