import type { Metadata } from 'next'

// Site-wide SEO metadata. Next merges `alternates`, `openGraph` and `twitter` shallowly: a page that sets one
// replaces the parent's whole object (losing its image), and a page that sets none inherits the parent's canonical
// and og:url. So the root layout sets only URL-less defaults, and every indexable page builds its own via pageMetadata.

export const SITE_URL = 'https://diceify.art'
export const DEFAULT_TITLE = 'Diceify — Free Dice Art Generator for Portraits & Mosaics'
export const DEFAULT_DESCRIPTION =
  'Turn any photo into dice art for free. Pick a grid from 20 to 120 rows, get the exact count of black and white dice, then build it row by row.'

const SOCIAL_IMAGE = { url: '/images/og-card.jpg', width: 1200, height: 630, alt: DEFAULT_TITLE }

interface Article {
  publishedTime?: string
  authors?: string[]
}

/** The page's og/twitter card image: a site-relative path (`/images/...`) or absolute URL, 1200×630 preferred. */
export interface SocialImage {
  url: string
  width?: number
  height?: number
  alt?: string
}

/** og/twitter tags with the card image (the shared one unless `image` is given; the root layout passes no URL). */
export function socialMetadata(
  title: string,
  description: string,
  url?: string,
  article?: Article,
  image?: SocialImage,
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const card = image ? { width: 1200, height: 630, alt: title, ...image } : SOCIAL_IMAGE
  const base = { title, description, url, siteName: 'Diceify', locale: 'en_US', images: [card] }
  return {
    openGraph: article ? { ...base, type: 'article', ...article } : { ...base, type: 'website' },
    // No `creator`: the site has no X/Twitter account (the footer links TikTok and Instagram only).
    twitter: { card: 'summary_large_image', title, description, images: [card] },
  }
}

export interface PageSeo {
  /** Without the " | Diceify" suffix (the root template adds it); omitted = the site's default title. */
  title?: string
  description: string
  /** '/' or e.g. '/dice-art'. */
  path: string
  article?: Article
  /** Per-page og/twitter image (e.g. a blog post's cover); the shared card when omitted. */
  image?: SocialImage
  /** Private pages (/account): `noindex, nofollow`, and no canonical/hreflang/og:url, which would only point crawlers elsewhere. */
  noindex?: boolean
}

/** The absolute URL of a page path: the homepage keeps its trailing slash (`https://diceify.art/`), inner pages have none. */
export function pageUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
}

/** A page's title, description, self-canonical and social tags. */
export function pageMetadata({ title, description, path, article, image, noindex }: PageSeo): Metadata {
  const url = pageUrl(path)
  if (noindex) {
    return {
      ...(title && { title }),
      description,
      robots: { index: false, follow: false },
      // Explicit null: a parent layout's canonical/og:url (e.g. /editor's) must not be inherited
      alternates: null,
      ...socialMetadata(title ?? DEFAULT_TITLE, description, undefined, undefined, image),
    }
  }
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    ...socialMetadata(title ?? DEFAULT_TITLE, description, url, article, image),
  }
}
