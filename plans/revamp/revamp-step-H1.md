# Step H1 — Share dice art (public link + social card)

User request (2026-10-01): "share artwork on twitter/fb easily — look what I have built", option 2 (a public link per
artwork whose post shows the art as a card), plus "I want to know if someone visits diceify via that link".
Decisions agreed: sign-in required to share; free on every plan; a share is a frozen snapshot of the dice art (never
the original photo); **no unshare button**.

## What the user sees

- Editor (tune + build steps): a **Share** button in the desktop header and the mobile top bar. Signed out → the
  sign-in modal ("Sign in to share your dice art."). Signed in → the share modal: it renders the social card, uploads
  it, creates the share, then shows the card with **Post on X**, **Share on Facebook**, **Copy link** and (where the
  browser has `navigator.share`, i.e. phones) **More options** (native share sheet). Re-opening without changing the art
  reuses the same share (in-memory, keyed on the derived grid object).
- X: `x.com/intent/tweet` with the text prefilled ("Look what I made with Diceify …") + the link → the post shows a
  large image card. Facebook: `facebook.com/sharer/sharer.php?u=` → the card; Facebook does not allow prefilled text.
- `https://diceify.art/s/<id>`: the card image, "Made with Diceify", **Make your own** (→ `/editor`), gallery link.
  Unknown id → "This share link doesn't exist" + the same CTA.

## Architecture (the first server code outside billing: one Cloudflare Pages Function)

Crawlers (Twitterbot, facebookexternalhit) read `og:*`/`twitter:*` tags from the HTML and never run JS, and the static
export cannot have a page per share. So:

- **Static shell** `app/(marketing)/share/page.tsx` → `out/share.html` (noindex, canonical only — no hreflang). Client
  component `features/marketing/components/ShareView.tsx` reads the id from `/s/<id>` (or `?id=` for `next dev`),
  shows `share-images/<id>.jpg` (public URL), `onError` → not-found state.
- **Pages Function** `functions/s/[id].ts` (`onRequestGet`): `env.ASSETS.fetch('/share')` → the shell; valid id →
  `get_share` RPC (anon key, `env.NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` — Pages env vars reach Functions too) →
  `HTMLRewriter` removes the shell's `og:*`, `twitter:*`, description, canonical tags and appends the share's (title,
  description, `og:image` 1200×630 + alt, `twitter:card=summary_large_image`, `og:url` = the request URL **with** its
  UTM query so Facebook links back with it, canonical = `/s/<id>`). Unknown/invalid id → shell with status 404; RPC
  failure → shell with the site's default tags, `no-store`. Pages only invokes Functions for `/s/*` (auto `_routes.json`).
  Local: `npm run build && npm run pages:dev` (`wrangler pages dev out`, vars from `.dev.vars`, gitignored).
- `functions/` has its own `tsconfig.json` (`@cloudflare/workers-types`, devDependency) and is excluded from the root
  one; `typecheck` adds `tsc -p functions`. ESLint boundary: `functions/**` imports only relative `core/share`.

## Data (migration `..._shares.sql`)

- `public.shares (id text pk check '^[a-km-np-z2-9]{10}$', owner_id → profiles cascade, project_id → projects set
  null, grid_cols int > 0, grid_rows int > 0, created_at)`, index on `owner_id`. RLS: insert own (project, if any,
  must be own), select own. No update/delete policies (immutable; no unshare).
- Bucket `share-images`: **public**, 2 MiB, `image/jpeg`, object name `<id>.jpg` (no user id in the public URL).
  Storage insert policy: an own `shares` row with that id must exist. No select/update/delete policies: anyone can
  fetch a known object through the public URL, nobody can list or overwrite.
- Order: insert the row, then upload (`upsert: false`, `cacheControl` 1 year). A failed upload leaves an invisible row.
- `get_share(share_id text)` security definer, `stable`, `search_path = ''`: returns `(id, grid_cols, grid_rows,
  created_at)` only when the image object exists; execute granted to `anon`, `authenticated`. No owner data is public.

## Code

- `core/share/` (pure, unit-tested): `ids.ts` (`SHARE_ID_LENGTH`, 32-char alphabet → `shareIdFromBytes(bytes)`
  unbiased via `& 31`, `isShareId`), `urls.ts` (`sharePath`, `shareUrl(origin, id, source)` with
  `utm_source=<x|facebook|copy_link|share_sheet>&utm_medium=social&utm_campaign=share`, `postIntentUrl('x'|'facebook')`,
  `SHARE_IMAGES_BUCKET`, `shareImageObject(id)`, `shareImageUrl(supabaseUrl, id)`), `copy.ts` (`shareCopy({ cols,
  rows })` → title, description, image alt, post text; `formatDiceCount`, `gridLabel`), `card.ts` (`SHARE_CARD` 1200×630, `shareCardLayout(cols,
  rows)` → art + text boxes), `meta.ts` (`escapeHtml`, `shareMetaTags(...)`, `parseShareRows(json)`).
- `lib/image/shareCard.ts`: `renderShareCard(grid) → Blob` (canvas: background + glow, art via `renderGridSvg` at the
  layout size, `logo-full.svg` (sized before drawing: Firefox cannot draw a viewBox-only SVG), dice count in Syne, grid
  size, "Turn any photo into dice art" + `diceify.art` in Outfit — the page's next/font families; JPEG 0.9).
- `lib/supabase/shares.ts`: `createShare({ projectId, cols, rows, image }) → id`. `currentUserId`/`NotSignedInError`
  move from `projects.ts` to `auth.ts` (shared).
- Editor: `useEditorUiStore` modal `'share'`; `components/share/ShareButton.tsx` (gate → modal),
  `components/share/ShareModal.tsx` (mounted once in `EditorScreen`), `hooks/useShareLink.ts` (prepare + cache).

## Analytics (GA4, existing `sendGAEvent`)

- Every shared link carries UTM tags → GA4 Traffic acquisition: session campaign `share`, source `x`/`facebook`/
  `copy_link`/`share_sheet`.
- Events: `share_create` (editor, `share_id`, `total_dice`), `share` (GA4 recommended: `method`, `content_type:
  'dice_art'`, `item_id`) per button, `share_view` (share page, `share_id`), `share_cta_click` (share page →
  editor). Funnel: share_view → share_cta_click → login.

## Verification

- `npm run typecheck && npm test && npm run lint && npm run build` green (build from an rsync copy while `next dev` runs).
- Unit tests for `core/share/*`.
- `SUPABASE_TEST=1` `lib/supabase/shares.integration.test.ts`: create → public URL 200 `image/jpeg`; anon `get_share`
  returns it, unknown id → none; a row without an object is hidden; a second user cannot upload to the first user's
  id; anon cannot select `shares`; no update/delete.
- `wrangler pages dev out` against the local stack: `/s/<id>` has the share's `og:image`/`twitter:card` and status
  200, an unknown id 404, `/` unchanged.
- Manual (not run, repo rule): click Share on desktop + phone, paste a `/s/<id>` URL into the X post composer and
  the Facebook Sharing Debugger on the preview deploy.
