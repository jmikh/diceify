// Response helpers shared by the functions: JSON + CORS, the error envelope `{ error: { code, message, details? } }`
// (plan → "Billing edge functions"), and the user lookup from the caller's JWT.

import type { SupabaseClient } from '@supabase/supabase-js'

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'ALREADY_SUBSCRIBED'
  | 'NO_SUBSCRIPTION'
  | 'ALREADY_SCHEDULED'
  | 'NOT_SCHEDULED'
  | 'STALE'
  | 'INVALID_SIGNATURE'
  | 'NOT_CONFIGURED'
  | 'INTERNAL'

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export function error(code: ErrorCode, message: string, status: number, details?: unknown): Response {
  return json({ error: details === undefined ? { code, message } : { code, message, details } }, status)
}

/** The request body as JSON; an empty body is `{}` (a `POST` without payload), anything unparsable is `null`. */
export async function readJsonBody(req: Request): Promise<unknown> {
  const text = await req.text()
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** CORS preflight. */
export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export interface CallerUser {
  id: string
  email: string | null
}

/**
 * The signed-in user behind `Authorization: Bearer <jwt>`, validated by GoTrue. `null` for a missing header, the
 * anon key, or an expired/forged token — callers answer 401.
 */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<CallerUser | null> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : ''
  if (!token) return null
  const { data, error: authError } = await admin.auth.getUser(token)
  if (authError || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? null }
}
