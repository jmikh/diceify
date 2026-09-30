import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Paths `core/` must never touch: it is pure TS (no DOM, no React, no app code).
// See plans/revamp/revamp-tiered-plan.md → "Import rules".
const CORE_RESTRICTED_GLOBALS = [
  'window',
  'document',
  'navigator',
  'Image',
  'ImageData',
  'OffscreenCanvas',
  'fetch',
  'localStorage',
]
const CORE_RESTRICTED_IMPORTS = ['react', 'next', 'next/*', '@/lib/*', '@/features/*', '@/app/*', '@/components/*']

// Sentry is reached through lib/report-error.ts only (plan → "Sentry"). `no-restricted-imports` options are replaced,
// not merged, by a later block for the same file, so the pattern rides along in every block below.
const NO_SENTRY = { group: ['@sentry/*', '@sentry/*/**'], message: 'Use reportError/setErrorUser from @/lib/report-error.' }
const SENTRY_IMPORTERS = ['lib/report-error.ts', 'instrumentation-client.ts', 'next.config.js']

// Import boundaries (plan → "Import rules"). `app` → features/components/lib/core; features/marketing|account|billing
// never reach into the editor; lib/components never import features or app.
const NO_APP = ['@/app', '@/app/*']
const NO_FEATURES = ['@/features', '@/features/*']
const NO_EDITOR = ['@/features/editor', '@/features/editor/*']
const boundary = (files, group, extra = {}) => ({
  files,
  ...extra,
  rules: { 'no-restricted-imports': ['error', { patterns: [{ group }, NO_SENTRY] }] },
})

export default defineConfig(
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'lib/generated/**', 'public/**', '.agent/**', 'next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // coreWebVitals = recommended rules + the two core-web-vitals errors; registers the plugin itself.
  nextPlugin.flatConfig.coreWebVitals,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // 'warn' until E3 raises it to 'error' after the cleanup sweep.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Everything without a boundary block below (root files, scripts, tests): Sentry only through the wrapper.
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    ignores: SENTRY_IMPORTERS,
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_SENTRY] }] },
  },
  {
    // CommonJS config files at the root (next.config.js, postcss.config.js).
    files: ['*.js', '*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Purity rules for the dice core.
    files: ['core/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...CORE_RESTRICTED_GLOBALS],
      'no-restricted-imports': ['error', { patterns: [{ group: CORE_RESTRICTED_IMPORTS }, NO_SENTRY] }],
    },
  },
  {
    // Core source may import only `core` (relative paths) and `zod`. Tests are exempt: they import
    // vitest and node:*.
    files: ['core/**/*.ts'],
    ignores: ['core/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: CORE_RESTRICTED_IMPORTS },
            // Anything that is neither a relative path nor exactly `zod`.
            { regex: '^(?!\\.{1,2}/)(?!zod$)', message: 'core may import only core (relative) and zod.' },
          ],
        },
      ],
    },
  },
  boundary(['features/marketing/**', 'features/account/**', 'features/billing/**'], [...NO_EDITOR, ...NO_APP]),
  boundary(['features/editor/**'], NO_APP),
  boundary(['lib/**', 'components/**'], [...NO_FEATURES, ...NO_APP], { ignores: ['lib/report-error.ts'] }),
  {
    // The Sentry wrapper keeps the lib boundary without the Sentry ban.
    files: ['lib/report-error.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [...NO_FEATURES, ...NO_APP] }] },
  },
  {
    // app/ is routing glue: it may import only features, components, lib, core and styles.
    files: ['app/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '^@/(?!features/|components/|lib/|core/|styles/)', message: 'app may import only @/features, @/components, @/lib, @/core, @/styles.' },
            NO_SENTRY,
          ],
        },
      ],
    },
  },
)
