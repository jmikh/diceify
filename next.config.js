const { withSentryConfig } = require('@sentry/nextjs/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static site (out/) served by a Cloudflare Worker's static assets (wrangler.jsonc).
  trailingSlash: false, // /editor -> out/editor.html, /blog/<slug> -> out/blog/<slug>.html (html_handling resolves both).
  images: {
    // No optimizer in a static export: lib/image-loader.ts maps each candidate width to a pre-generated variant
    // (public/images/**/*.w<width>.webp, written by `npm run images:variants` = prebuild). deviceSizes mirrors
    // VARIANT_WIDTHS in lib/image-variants.ts; no imageSizes so every candidate is a real variant width.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    deviceSizes: [320, 480, 640, 960, 1240],
    imageSizes: [],
  },
  eslint: {
    ignoreDuringBuilds: true, // Linting runs via `npm run lint` (ESLint 9 flat config), not `next lint`.
  },
}

// Sentry build plugin, client side only (`output: 'export'` makes it skip the server side and ignore tunnelRoute).
// It injects instrumentation-client.ts into the client entry. Source maps are generated, uploaded and then deleted
// from out/ only when SENTRY_AUTH_TOKEN is set (Workers Builds build variables); without it nothing is generated or
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
