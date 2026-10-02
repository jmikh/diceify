// GET /s/<id>: the static share page (out/share.html) with the share's own title, description, canonical and social
// card tags, so X, Facebook & co. (whose crawlers do not run JavaScript) show the dice art. Plan: plans/revamp/revamp-step-H1.md.

import { isShareId, parseShareRows, shareCopy, shareImageUrl, shareMetaTags, sharePath, type ShareInfo } from '../core/share'

export interface ShareEnv {
  ASSETS: Fetcher
  // Runtime variables of the Worker (dashboard, Production and Previews base): the values the build inlines.
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}

/** The shell's tags that the share's own replace. */
const REPLACED_TAGS = ['meta[property^="og:"]', 'meta[name^="twitter:"]', 'meta[name="description"]', 'link[rel="canonical"]']

/** `get_share` (public RPC, anon key): the share once its image exists, else null. Throws on a failed request. */
async function fetchShare(env: ShareEnv, id: string): Promise<ShareInfo | null> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_share`, {
    method: 'POST',
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ share_id: id }),
  })
  if (!res.ok) throw new Error(`get_share answered ${res.status}`)
  return parseShareRows(await res.json())
}

function respond(shell: Response, status: number, cacheControl: string): Response {
  const headers = new Headers(shell.headers)
  headers.set('Cache-Control', cacheControl)
  return new Response(shell.body, { status, headers })
}

export async function serveShare(request: Request, env: ShareEnv, id: string): Promise<Response> {
  const shell = await env.ASSETS.fetch(new URL('/share', request.url))
  // Unknown ids still get the page (it shows "doesn't exist"), with a 404 so nothing indexes or caches it as a card
  if (!isShareId(id)) return respond(shell, 404, 'public, max-age=300')

  let share: ShareInfo | null
  try {
    share = await fetchShare(env, id)
  } catch (error) {
    // Supabase unreachable: the page still works for people (it loads the image itself); crawlers get the site card
    console.error('[share] get_share failed', error)
    return respond(shell, 200, 'no-store')
  }
  if (!share) return respond(shell, 404, 'public, max-age=60')

  const url = new URL(request.url)
  const copy = shareCopy(share)
  const tags = shareMetaTags({
    ...copy,
    imageUrl: shareImageUrl(env.NEXT_PUBLIC_SUPABASE_URL, share.id),
    pageUrl: url.href,
    canonicalUrl: `${url.origin}${sharePath(share.id)}`,
  })

  const remove = { element: (element: Element) => void element.remove() }
  const rewriter = REPLACED_TAGS.reduce((r, selector) => r.on(selector, remove), new HTMLRewriter())
    .on('title', { element: (element) => void element.setInnerContent(`${copy.title} | Diceify`) })
    .on('head', { element: (element) => void element.append(tags, { html: true }) })
  // Shares never change: a short edge/browser cache is safe
  return rewriter.transform(respond(shell, 200, 'public, max-age=300'))
}
