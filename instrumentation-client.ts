// Sentry browser init. Injected into the client entry by `withSentryConfig` (next.config.js); Next 15.3+ would also
// load this file natively. There is no server config: the app is a static export (the only server is Supabase).
//
// The DSN is read as a literal `process.env.NEXT_PUBLIC_*` access so it is inlined at build time. It is NOT read
// through `lib/env.public.ts`: that getter validates the Supabase values too and must not throw at page load on a
// build without them. Unset DSN → `enabled: false` → no network, no console noise.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // v11: `dataCollection.userInfo` replaces `sendDefaultPii` — no auto user data (IP); `setErrorUser` sets the id explicitly
  dataCollection: { userInfo: false },
})

// Navigation instrumentation hook (Next 15.3+ calls it; a no-op with tracing off). Exported so the build plugin
// does not ask for it.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
