// The one place that talks to Sentry (ESLint restricts `@sentry/*` imports to this file and the init file
// `instrumentation-client.ts`). Everything else calls `reportError` / `setErrorUser`.
//
// `Sentry.isEnabled()` is false without a DSN (the init passes `enabled: !!dsn`) and in node (no client), so the
// module is safe to import from tests and from code that also runs during prerender.

import * as Sentry from '@sentry/nextjs'

export interface ReportContext {
  /** Short, stable site name; becomes the `where` tag (e.g. `dice-pipeline`, `autosave-save`). */
  where: string
  extra?: Record<string, unknown>
}

/**
 * Report an unexpected error: to Sentry when a DSN is configured, to the console in development or when
 * nothing could be sent. Never both in production — Sentry is the log there.
 */
export function reportError(error: unknown, ctx: ReportContext = { where: 'unknown' }): void {
  const sent = Sentry.isEnabled() && Boolean(Sentry.captureException(error, { tags: { where: ctx.where }, extra: ctx.extra }))
  if (process.env.NODE_ENV === 'development' || !sent) console.error(`[${ctx.where}]`, error)
}

/** Tag subsequent events with the signed-in user's id (only the id; automatic user data is off in the init). */
export function setErrorUser(id: string | null): void {
  Sentry.setUser(id ? { id } : null)
}
