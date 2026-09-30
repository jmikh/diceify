const { withSentryConfig } = require('@sentry/nextjs/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static site (out/) served by Cloudflare Pages; the only server is Supabase.
  trailingSlash: false, // /editor -> out/editor.html, /blog/<slug> -> out/blog/<slug>.html (Pages resolves both).
  images: {
    unoptimized: true, // For client-side only image handling
  },
  eslint: {
    ignoreDuringBuilds: true, // Linting runs via `npm run lint` (ESLint 9 flat config), not `next lint`.
  },
}

// Sentry build plugin, client side only (`output: 'export'` makes it skip the server side and ignore tunnelRoute).
// It injects instrumentation-client.ts into the client entry. Source maps are generated, uploaded and then deleted
// from out/ only when SENTRY_AUTH_TOKEN is set (Cloudflare Pages build env); without it nothing is generated or
// uploaded. `silent` mutes the plugin's build log; `telemetry: false` keeps the build from reporting to Sentry itself.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  bundleSizeOptimizations: { excludeDebugStatements: true },
})
