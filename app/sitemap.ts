import { MetadataRoute } from 'next'
import { pageUrl } from '@/lib/seo'
import { blogPosts } from '@/features/marketing/blog/data'

// `lastModified` is hand-maintained: bump a page's date ONLY when its visible content meaningfully changes. Never
// derive it from the build date, which would mark every page changed on every deploy and make Google ignore the
// site's lastmod altogether. No changeFrequency/priority: Google ignores both.
const STATIC_PAGES: { path: string; lastModified: string }[] = [
  { path: '/', lastModified: '2026-10-03' },
  { path: '/dice-art', lastModified: '2026-10-03' },
  { path: '/dice-art/size-calculator', lastModified: '2026-10-03' },
  { path: '/dice-art/buying-dice', lastModified: '2026-10-03' },
  { path: '/dice-art/how-to-glue-dice-art', lastModified: '2026-10-03' },
  { path: '/dice-art/best-photos', lastModified: '2026-10-03' },
  { path: '/best-dice-art-generators', lastModified: '2026-10-03' },
  { path: '/gallery', lastModified: '2026-10-03' },
  { path: '/blog', lastModified: '2026-10-03' },
  { path: '/about', lastModified: '2026-10-03' },
  { path: '/editor', lastModified: '2026-10-03' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...STATIC_PAGES.map(({ path, lastModified }) => ({ url: pageUrl(path), lastModified })),
    // Blog posts: the last substantive edit, else the publication date
    ...blogPosts.map((post) => ({ url: pageUrl(`/blog/${post.slug}`), lastModified: new Date(post.dateModified ?? post.date) })),
  ]
}
