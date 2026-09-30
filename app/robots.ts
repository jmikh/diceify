import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account'], // private; /editor is a public landing (see app/(editor)/layout.tsx metadata)
    },
    sitemap: 'https://diceify.art/sitemap.xml',
  }
}