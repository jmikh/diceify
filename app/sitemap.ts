import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { blogPosts } from '@/features/marketing/blog/data'

export default function sitemap(): MetadataRoute.Sitemap {
  // Static pages carry no lastModified: the build date would mark every page changed on every deploy, and Google
  // ignores a site's lastmod once it proves unreliable (blog posts keep their real dates).
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/dice-art`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/gallery`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/editor`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  // Blog post pages
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...blogPages]
}
