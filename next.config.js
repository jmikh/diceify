/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // For client-side only image handling
  },
  eslint: {
    ignoreDuringBuilds: true, // Linting runs via `npm run lint` (ESLint 9 flat config), not `next lint`.
  },
}

module.exports = nextConfig
