// Where a share lives (page + public image) and the links the share buttons open. Every link carries UTM tags so
// GA4 attributes the visit to the share and the place it was posted (plan step H1 → "Analytics").

/** Where a share link was posted from: one `utm_source` each. */
export type ShareSource = 'x' | 'facebook' | 'copy_link' | 'share_sheet'

/** Platforms with a web "compose a post" URL. */
export type PostPlatform = 'x' | 'facebook'

export const SHARE_IMAGES_BUCKET = 'share-images'

/** `a=1&b=2` (core has no `URLSearchParams`: lib es2022 only). */
function query(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

export function sharePath(id: string): string {
  return `/s/${id}`
}

/** The share page URL as posted from `source`. */
export function shareUrl(origin: string, id: string, source: ShareSource): string {
  return `${origin}${sharePath(id)}?${query({ utm_source: source, utm_medium: 'social', utm_campaign: 'share' })}`
}

/** Object name inside the public `share-images` bucket. */
export function shareImageObject(id: string): string {
  return `${id}.jpg`
}

/** Public URL of the share's card image (what `og:image` points at). */
export function shareImageUrl(supabaseUrl: string, id: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${SHARE_IMAGES_BUCKET}/${shareImageObject(id)}`
}

/** The platform's compose window with the link (and, on X, the text) filled in. Facebook does not take text. */
export function postIntentUrl(platform: PostPlatform, url: string, text: string): string {
  if (platform === 'x') return `https://x.com/intent/tweet?${query({ text, url })}`
  return `https://www.facebook.com/sharer/sharer.php?${query({ u: url })}`
}
