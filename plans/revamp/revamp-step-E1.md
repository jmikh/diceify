# Step E1 — Static export on Cloudflare Pages

Scope (plan, Phase E): `output: 'export'`; static OG metadata replaces the two image routes; `@vercel/analytics` gone;
`public/_headers`; no server-only APIs left; Cloudflare Pages project (preview = `revamp`); Supabase redirect allow-list
documented; `docs/DEPLOY.md` completed. Not in scope: Sentry (E2), cleanup/README/CLAUDE.md/privacy wording (E3), the
hosted Supabase project itself (F2).

## Current state (revamp @ D2)

- `next.config.js`: `images.unoptimized`, `eslint.ignoreDuringBuilds`; no `output`, no `trailingSlash` (Next default = `false`).
- `app/`: root layout (fonts, metadata, JSON-LD, `<GoogleAnalytics/>`, `<Analytics/>` from `@vercel/analytics/next`),
  `(marketing)/{page,blog,blog/[slug],dice-art,gallery,privacy,terms}`, `(editor)/{editor,account}` + layout
  (`ProfileProvider`, `AnalyticsTracker` — client only, no `headers()`/`cookies()`), `error.tsx`, `not-found.tsx`,
  `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `twitter-image.tsx`. No `app/api/`, no `middleware`.
- `useSearchParams`: only `features/billing/AccountScreen.tsx` (under `<Suspense>` in `app/(editor)/account/page.tsx`).
  The editor page keeps a `<Suspense>` too although its bootstrap reads `window.location.search` (C3 note) — harmless, left.
- `lib/env.public.ts` validates lazily (import never throws), `lib/supabase/client.ts` is a lazy singleton → prerender
  without `NEXT_PUBLIC_*` values succeeds.
- `blog/[slug]` has `generateStaticParams`; `sitemap.ts`/`robots.ts` are plain functions (export-compatible).
- `wrangler` 4.58 is on PATH (Homebrew) but **not logged in** (`wrangler whoami` → "Not logged in") → no Pages project
  is created from here; the console steps are documented instead, and `wrangler` is not added as a dependency.

## Export blockers and resolution

| Blocker | Why it breaks `output: 'export'` | Resolution |
|---|---|---|
| `app/opengraph-image.tsx`, `app/twitter-image.tsx` | `export const runtime = 'nodejs'` + `ImageResponse` + `fs` + Google-Fonts `fetch` at request time | Deleted. The rendered card (what `https://diceify.art/opengraph-image` serves today: the 1024×574 mosaic background with the "Diceify" wordmark composited at 1200×630) is captured once and committed as `public/images/og-card.jpg` (1200×630, mozjpeg q82, 227 KB). `metadata.openGraph.images` / `metadata.twitter.images` in `app/layout.tsx` point at it with `width/height/alt`. The plan said "`/images/og-image.jpg`" — that file is the wordmark-less background; using the composited card keeps the social preview pixel-identical to today (design change, logged). |
| `@vercel/analytics` | Runtime script injection tied to Vercel's hosting; nothing to report to on Pages | `<Analytics/>` + import removed from the root layout; package uninstalled. GA4 (`@next/third-parties`) stays. |
| `app/(editor)/layout.tsx` | — (already static; verified no `headers()`/`cookies()`/`dynamic`) | none |
| `useSearchParams` outside Suspense | export would fail the page with a bailout error | none needed (AccountScreen is wrapped) |

Grep proof after the change: `git grep -n "vercel\|opengraph-image\|twitter-image\|ImageResponse\|next/og\|headers()\|cookies()" -- app components lib features core`
matches only the privacy page's "Vercel Analytics" prose (E3's wording TODO).

## Config

- `next.config.js`: `output: 'export'`, `trailingSlash: false` (explicit), keep `images.unoptimized`, `eslint.ignoreDuringBuilds`.
- `out/` is already in `.gitignore` (`/out/`); `.next` and `out` are wiped before the verification builds.
- Output layout with `trailingSlash: false`: `index.html`, `editor.html`, `account.html`, `blog.html`, `blog/<slug>.html`,
  `dice-art.html`, `gallery.html`, `privacy.html`, `terms.html`, `404.html`, `sitemap.xml`, `robots.txt`, `_headers`, `_next/**`,
  `images/**`. Cloudflare Pages resolves `/editor` → `editor.html` and `/blog/<slug>` → `blog/<slug>.html` natively and serves
  `404.html` (status 404) for unknown paths, so **no `public/_redirects`**.
- `public/_headers` (Pages header rules, copied verbatim into `out/`):
  ```
  /*
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    X-Frame-Options: DENY
    Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
  No CSP (GA + Stripe/Supabase redirects would need an allow-list; recorded as a suggestion). `camera=()` only governs
  `getUserMedia`, not the `<input type=file>` camera picker the uploader uses on phones.
- `package.json`: `@vercel/analytics` removed. No `deploy:preview` script (wrangler not used).

## Cloudflare Pages project (console, documented in `docs/DEPLOY.md`)

Workers & Pages → Create → Pages → Connect to Git → this repo. Production branch `master`, preview branches = all
non-production (so `revamp` gets `https://revamp.diceify.pages.dev`). Build command `npm run build`, output directory
`out`, root `/`. Environment variables (Production and Preview): `NODE_VERSION=20`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` (`https://diceify.art` for production; the preview's own
`https://revamp.diceify.pages.dev`), `NEXT_PUBLIC_SENTRY_DSN` (optional, E2). The Direct Upload alternative
(`npx wrangler pages deploy out --branch revamp --project-name diceify` after `wrangler login`) is documented as well.

## Env behaviour

All four values are inlined at build time; `NEXT_PUBLIC_APP_URL` is currently read by nothing at runtime (auth redirects use
`window.location.origin`, checkout URLs come from the edge function's `APP_URL` secret), so previews work on any
`*.pages.dev` host. A build with every `NEXT_PUBLIC_*` unset must still succeed (lazy env) — verified by building with
`.env.local` moved aside.

## Supabase Auth redirect allow-list (one-time console steps, documented)

Auth → URL Configuration: Site URL `https://diceify.art`; Redirect URLs `http://localhost:3000/**`,
`https://diceify.art/**`, `https://*.diceify.pages.dev/**` (wildcards are supported). The local `config.toml` keeps only
`http://localhost:3000/**`. Google Cloud: the hosted callback `https://<project-ref>.supabase.co/auth/v1/callback` is added
when F2 creates the hosted project.

## Verification

1. `rm -rf .next out && npm run build` → listed `out/` files above exist.
2. `.env.local` moved aside → `npm run build` still exits 0 (then restored).
3. Static smoke with a Pages-like resolver (scratchpad node script: path → `path.html` → `path/index.html` → `404.html`
   with 404): `/`, `/editor`, `/account`, `/blog/why-i-built-diceify`, `/gallery`, `/dice-art`, `/privacy`, `/terms`,
   `/sitemap.xml`, `/robots.txt` → 200 and the landing HTML contains "Turn photos into", the blog HTML contains the post
   body; `/nonexistent` → 404 with the "rolled off the table" copy; `/_headers` present.
4. Grep proof above → only the privacy prose.
5. `npm run typecheck && npm test && npm run lint && npm run build` → all 0.
6. Manual (user, after the console steps): preview URL — landing, blog post, editor, Google sign-in round trip, project save,
   checkout (test mode).
