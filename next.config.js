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

module.exports = nextConfig
