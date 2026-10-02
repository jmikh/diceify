// The Worker behind the static site (wrangler.jsonc). Cloudflare serves out/ without invoking it; it runs only for the
// paths in `assets.run_worker_first` (/s/*). Plan: plans/revamp/revamp-step-E4.md.

import { serveShare, type ShareEnv } from './share'

/** `/s/<id>`, one segment, optional trailing slash (what the Pages route `s/[id]` matched). */
const SHARE_PATH = /^\/s\/([^/]+)\/?$/

export default {
  async fetch(request, env) {
    const id = SHARE_PATH.exec(new URL(request.url).pathname)?.[1]
    if (id === undefined || (request.method !== 'GET' && request.method !== 'HEAD')) return env.ASSETS.fetch(request)
    return serveShare(request, env, id)
  },
} satisfies ExportedHandler<ShareEnv>
