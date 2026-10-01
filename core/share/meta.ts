// What the Pages Function (functions/s/[id].ts) puts into a share page's <head> for crawlers, and how it reads the
// `get_share` RPC answer. Pure so it is tested here; the function only fetches and rewrites.

import { SHARE_CARD } from './card'
import { isShareId } from './ids'

/** A share as `get_share` returns it (public fields only). */
export interface ShareInfo {
  id: string
  cols: number
  rows: number
  createdAt: string
}

const isPositiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0

/** The first row of a `get_share` PostgREST answer (an array), or null when there is none or it is malformed. */
export function parseShareRows(json: unknown): ShareInfo | null {
  const row: unknown = Array.isArray(json) ? json[0] : null
  if (typeof row !== 'object' || row === null) return null
  const { id, grid_cols, grid_rows, created_at } = row as Record<string, unknown>
  if (typeof id !== 'string' || !isShareId(id) || !isPositiveInt(grid_cols) || !isPositiveInt(grid_rows)) return null
  return { id, cols: grid_cols, rows: grid_rows, createdAt: typeof created_at === 'string' ? created_at : '' }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface ShareMetaInput {
  title: string
  description: string
  imageAlt: string
  imageUrl: string
  /** The URL as requested (keeps its UTM query: Facebook links the post to `og:url`). */
  pageUrl: string
  /** `/s/<id>` without a query. */
  canonicalUrl: string
}

/** The social/SEO tags of a share page, as HTML to append to <head>. */
export function shareMetaTags(m: ShareMetaInput): string {
  const meta = (attr: 'name' | 'property', key: string, value: string) =>
    `<meta ${attr}="${key}" content="${escapeHtml(value)}">`
  return [
    meta('name', 'description', m.description),
    `<link rel="canonical" href="${escapeHtml(m.canonicalUrl)}">`,
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', 'Diceify'),
    meta('property', 'og:title', m.title),
    meta('property', 'og:description', m.description),
    meta('property', 'og:url', m.pageUrl),
    meta('property', 'og:image', m.imageUrl),
    meta('property', 'og:image:type', 'image/jpeg'),
    meta('property', 'og:image:width', String(SHARE_CARD.width)),
    meta('property', 'og:image:height', String(SHARE_CARD.height)),
    meta('property', 'og:image:alt', m.imageAlt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', m.title),
    meta('name', 'twitter:description', m.description),
    meta('name', 'twitter:image', m.imageUrl),
    meta('name', 'twitter:image:alt', m.imageAlt),
  ].join('\n')
}
