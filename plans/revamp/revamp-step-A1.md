# Step A1 — Branch, plan docs, tooling baseline

Scope (from the tiered plan): create `revamp`; copy the plan into the repo; add vitest, ESLint 9 flat
config, `core/tsconfig.json`, npm scripts; delete the puppeteer tests; pin `@next/third-parties`;
move `lib/dice/constants.ts` → `core/dice/geometry.ts` with the first real test. No behavior change.

## Repo state found

- No ESLint config at all (`next lint` ran with `eslint-config-next@15` + `@typescript-eslint/*@8`
  against ESLint 9; nothing enforced). `tests/` = 3 puppeteer scripts + a PNG; `test:visual*` scripts.
- `@next/third-parties@^16.0.8` next to `next@^14.2.25`.
- `lib/dice/constants.ts` (`DICE_RENDERING`, `getDotPositions`) has **2** importers, not 3:
  `lib/dice/cache.ts`, `lib/dice/svg-renderer.ts` (both relative `./constants`).
- No `core/`, `scripts/`, `supabase/` yet. Nothing listening on :3000 (build allowed).

## Package changes

| Action | Packages |
|---|---|
| remove | `eslint-config-next`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `puppeteer`, `glob` |
| add (dev) | `vitest@^3.2`, `@eslint/js@^9`, `typescript-eslint@^8`, `eslint-plugin-react-hooks@^7`, `@next/eslint-plugin-next@^15.5`, `globals@^17` |
| pin | `@next/third-parties@^14.2.35` (was `^16`) |
| keep | `eslint@^9` |

Two deviations from the plan's Tooling section, forced by the toolchain (recorded in the step log):

1. **`@next/eslint-plugin-next@15`, not `@14`.** v14 calls `context.getAncestors`, removed in ESLint 9
   → `npm run lint` crashes on the first file. v15 runs on ESLint 9 and exports
   `flatConfig.recommended` / `flatConfig.coreWebVitals`. It is a dev-only lint plugin with no `next`
   peer dependency, so the Next 14 runtime is unaffected.
2. **`vitest@^3`, not 4/5.** vitest 5 pulls `rolldown`, whose platform binding npm 11.5.1 fails to
   install; vitest 4 makes npm 11.5.1 crash in arborist (`Cannot read properties of null (reading
   'edgesOut')`) while resolving its circular optional peers, unless `--legacy-peer-deps`. vitest 3
   resolves cleanly. The corrupted lockfile had to be regenerated (see agent-suggestions).

## Files

- `package.json` scripts: `dev`, `build`, `start`, `test: vitest run`, `test:watch: vitest`,
  `lint: eslint .`, `typecheck: tsc --noEmit && tsc -p core`. `test:visual*` removed.
- `vitest.config.ts`: node env; include `core/**`, `lib/**`, `features/**`,
  `supabase/functions/_shared/**` `*.test.ts`; alias `@` → repo root (via `import.meta.url`).
- `eslint.config.mjs` (`defineConfig` from `eslint/config`):
  `@eslint/js` recommended → `typescript-eslint` recommended → `nextPlugin.flatConfig.coreWebVitals`
  (superset of `recommended`) → project block (`globals.browser` + `globals.node`; `react-hooks`
  plugin with only `rules-of-hooks` and `exhaustive-deps` at `warn` — v7's preset adds ~25
  React-Compiler rules we do not want yet; `no-explicit-any` `warn` until E3; `no-unused-vars` `warn`
  with `_` prefixes ignored) → `*.js`/`*.cjs` allow `require` → `core/**/*.ts` purity override:
  `no-restricted-globals` (window, document, navigator, Image, ImageData, OffscreenCanvas, fetch,
  localStorage) and `no-restricted-imports` (react, next, next/*, @/lib/*, @/features/*, @/app/*,
  @/components/*), both `error`. Ignores: `.next`, `out`, `node_modules`, `lib/generated`, `public`,
  `.agent`, `next-env.d.ts`.
- `core/tsconfig.json`: extends root; `lib: ["es2022"]`, `types: []`, `noEmit`, `incremental: false`
  (no stray `core/tsconfig.tsbuildinfo`), `allowImportingTsExtensions`, `plugins: []`;
  include `./**/*.ts`. Verified: a probe file using `document` / `ImageData` fails `tsc -p core`.
- Root `tsconfig.json`: `allowImportingTsExtensions: true`; `exclude` += `out`, `supabase/functions`
  (Deno code, D1). Root `include` (`**/*.ts`) still covers `core/` for the app build and vitest config.
- `next.config.js`: `eslint.ignoreDuringBuilds: true` (build no longer invokes `next lint`).
- `git mv lib/dice/constants.ts core/dice/geometry.ts` (content unchanged); importers now use
  `@/core/dice/geometry`. `core/dice/geometry.test.ts`: dot count == face for 1..6, all dots within
  `[0, size]`, positions scale linearly with size.
- `tests/` deleted (`git rm -r`). `plans/revamp/{revamp-tiered-plan,revamp-agent-suggestions,revamp-step-A1}.md`.
- Four pre-existing lint **errors** fixed mechanically so `lint` exits 0 (no runtime change):
  `BuilderMain.tsx` two `let` → `const`; `UploadMain.tsx` empty props interface + empty object
  pattern removed (its only call site passes no props). Everything else is a warning (89).

## Verification (automated only)

`npm run typecheck` → 0 · `npm test` → 0 (1 file, 8 tests) · `npm run lint` → 0 (0 errors,
89 warnings: 32 rules-of-hooks all in BuilderMain, 29 unused-vars, 24 no-explicit-any, 3
no-img-element, 1 exhaustive-deps) · `npm run build` → 0 (same 22 routes as before).
`npm ls next @next/third-parties` → `next@14.2.35` everywhere, no mismatch.
