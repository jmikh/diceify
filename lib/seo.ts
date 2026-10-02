import type { Metadata } from 'next'

// Site-wide SEO metadata. Next merges `alternates`, `openGraph` and `twitter` shallowly: a page that sets one
// replaces the parent's whole object (losing its image), and a page that sets none inherits the parent's canonical
// and og:url. So the root layout sets only URL-less defaults, and every indexable page builds its own via pageMetadata.

export const SITE_URL = 'https://diceify.art'
export const DEFAULT_TITLE = 'Diceify — Free Dice Art Generator for Portraits & Mosaics'
export const DEFAULT_DESCRIPTION =
  'Create dice art portraits and mosaics from any photo. Diceify is a free dice art generator with contrast tuning, a step-by-step builder, and patterns you can build by hand.'

const SOCIAL_IMAGE = { url: '/images/og-card.jpg', width: 1200, height: 630, alt: DEFAULT_TITLE }

interface Article {
  publishedTime?: string
  authors?: string[]
}

/** og/twitter tags with the shared card image (the root layout's defaults pass no URL). */
export function socialMetadata(
  title: string,
  description: string,
  url?: string,
  article?: Article,
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const base = { title, description, url, siteName: 'Diceify', locale: 'en_US', images: [SOCIAL_IMAGE] }
  return {
    openGraph: article ? { ...base, type: 'article', ...article } : { ...base, type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [SOCIAL_IMAGE], creator: '@diceify' },
  }
}

export interface PageSeo {
  /** Without the " | Diceify" suffix (the root template adds it); omitted = the site's default title. */
  title?: string
  description: string
  /** '/' or e.g. '/dice-art'. */
  path: string
  article?: Article
}

/** A page's title, description, self-canonical and social tags. */
export function pageMetadata({ title, description, path, article }: PageSeo): Metadata {
  const url = path === '/' ? SITE_URL : `${SITE_URL}${path}`
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    ...socialMetadata(title ?? DEFAULT_TITLE, description, url, article),
  }
}
