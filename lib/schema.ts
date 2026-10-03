// The site's JSON-LD entity graph: one Organization, its founder and the WebSite/WebApplication, each with a stable
// `@id` that every page references instead of re-declaring a nested Organization. The root layout emits
// `siteGraph()` (Organization + Person) on every page; the homepage adds the WebSite and WebApplication nodes.
// Other pages reference the entities with `ORGANIZATION_REF`, `FOUNDER_REF`, `WEBSITE_REF` and `APP_REF`.

import { PLAN_LIMITS, PRICING } from '@/core/billing'
import { SITE_URL } from '@/lib/seo'

export const SCHEMA_IDS = {
  organization: `${SITE_URL}/#organization`,
  logo: `${SITE_URL}/#logo`,
  founder: `${SITE_URL}/#john`,
  website: `${SITE_URL}/#website`,
  app: `${SITE_URL}/#app`,
} as const

/** `{ "@id": ... }` references for `publisher`, `author`, `creator`, `isPartOf` etc. */
export const ORGANIZATION_REF = { '@id': SCHEMA_IDS.organization } as const
export const FOUNDER_REF = { '@id': SCHEMA_IDS.founder } as const
export const WEBSITE_REF = { '@id': SCHEMA_IDS.website } as const
export const APP_REF = { '@id': SCHEMA_IDS.app } as const

export const ORGANIZATION_NAME = 'Diceify'
export const FOUNDER_NAME = 'John Mikhail'
export const FOUNDING_YEAR = '2020'
export const SUPPORT_EMAIL = 'support@diceify.art'
export const ABOUT_URL = `${SITE_URL}/about`

/** The brand's profiles (the footer and the Organization `sameAs` share this list). */
export const SOCIAL_URLS = {
  instagram: 'https://www.instagram.com/diceify.art/',
  tiktok: 'https://www.tiktok.com/@diceify.art',
  reddit: 'https://www.reddit.com/r/DicePortraits/',
} as const

/** The founder's channel and his Umm Kulthum build video. */
export const FOUNDER_YOUTUBE_URL = 'https://www.youtube.com/@johnfwilliam'
export const BUILD_VIDEO_ID = 'z4UUXeYqJZw'
export const BUILD_VIDEO_URL = `https://www.youtube.com/watch?v=${BUILD_VIDEO_ID}`

/** The one-sentence definition shown in the hero and the footer (and quoted by answer engines). */
export const DEFINITION =
  'Diceify is a free, browser-based dice art generator that turns a photo into a buildable black-and-white dice pattern with exact dice counts and a step-by-step builder.'

/** Square PNG (Google does not read SVG logos). */
const LOGO_URL = `${SITE_URL}/android-chrome-512x512.png`
const SOCIAL_IMAGE_URL = `${SITE_URL}/images/og-card.jpg`

export const currentYear = () => new Date().getFullYear()

/** "© 2026 Diceify. All rights reserved." for ImageObject `copyrightNotice`. */
export const copyrightNotice = () => `© ${currentYear()} ${ORGANIZATION_NAME}. All rights reserved.`

export function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': SCHEMA_IDS.organization,
    name: ORGANIZATION_NAME,
    alternateName: ['Diceify.art'],
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      '@id': SCHEMA_IDS.logo,
      url: LOGO_URL,
      contentUrl: LOGO_URL,
      width: 512,
      height: 512,
    },
    image: { '@id': SCHEMA_IDS.logo },
    founder: FOUNDER_REF,
    foundingDate: FOUNDING_YEAR,
    email: SUPPORT_EMAIL,
    sameAs: Object.values(SOCIAL_URLS),
  }
}

/** The founder; `extra` adds page-specific fields (the About page's description, jobTitle...). */
export function founderNode(extra: Record<string, unknown> = {}) {
  return {
    '@type': 'Person',
    '@id': SCHEMA_IDS.founder,
    name: FOUNDER_NAME,
    url: ABOUT_URL,
    sameAs: [FOUNDER_YOUTUBE_URL],
    worksFor: ORGANIZATION_REF,
    ...extra,
  }
}

export function websiteNode(description: string) {
  return {
    '@type': 'WebSite',
    '@id': SCHEMA_IDS.website,
    name: ORGANIZATION_NAME,
    url: SITE_URL,
    description,
    inLanguage: 'en',
    publisher: ORGANIZATION_REF,
  }
}

const usd = (price: number) => ({ price: String(price), priceCurrency: 'USD' })
const PRICING_URL = `${SITE_URL}/#pricing`

/** The plans as Offers, built from `PRICING` so the prices never drift from checkout. */
export function planOffers() {
  const { creator, studio } = PRICING
  const subscription = (name: string, price: number, billingDuration: 'P1M' | 'P1Y', unitCode: 'MON' | 'ANN') => ({
    '@type': 'Offer',
    name,
    ...usd(price),
    url: PRICING_URL,
    priceSpecification: { '@type': 'UnitPriceSpecification', ...usd(price), billingDuration, unitCode },
  })
  return [
    { '@type': 'Offer', name: 'Explorer (free)', ...usd(0), url: PRICING_URL },
    { '@type': 'Offer', name: `${creator.name} Pass (${creator.accessDays} days, one-time)`, ...usd(creator.price), url: PRICING_URL },
    subscription(`${studio.name} (monthly)`, studio.monthlyPrice, 'P1M', 'MON'),
    subscription(`${studio.name} (yearly)`, studio.yearlyPrice, 'P1Y', 'ANN'),
  ]
}

/** The editor as one entity (`#app`), declared on the homepage; other pages reference `APP_REF`. */
export function webApplicationNode(description: string) {
  return {
    '@type': 'WebApplication',
    '@id': SCHEMA_IDS.app,
    name: ORGANIZATION_NAME,
    description,
    url: SITE_URL,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    image: SOCIAL_IMAGE_URL,
    featureList: [
      'Photo to black-and-white dice pattern',
      'Grid size, contrast, gamma and sharpening controls',
      'Black and white dice (12 shades)',
      `Step-by-step builder with progress tracking (first ${PLAN_LIMITS.explorer.builderRowLimit} rows free)`,
      'SVG blueprint download (paid plans)',
      'Shareable preview links',
    ],
    creator: ORGANIZATION_REF,
    publisher: ORGANIZATION_REF,
    offers: planOffers(),
  }
}

const withContext = (graph: object[]) => ({ '@context': 'https://schema.org', '@graph': graph })

/** Emitted by the root layout on every page: the Organization and its founder. */
export const siteGraph = () => withContext([organizationNode(), founderNode()])

/** A page's own `@graph` (nodes reference the site entities by `@id`). */
export const pageGraph = (...nodes: object[]) => withContext(nodes)
