// Calling the edge functions (supabase/functions/*) from the browser: `functions.invoke` with the functions' error
// envelope `{ error: { code, message, details? } }` surfaced as a `FunctionError`.

import { FunctionsHttpError } from '@supabase/supabase-js'
import { reportError } from '@/lib/report-error'
import { getSupabase } from './client'

export class FunctionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'FunctionError'
  }
}

/** A 4xx envelope (401/404/409/429) is an expected answer → warn; anything else is a bug or an outage → report. */
export function reportFunctionError(error: unknown, where: string): void {
  if (error instanceof FunctionError && error.status < 500) {
    console.warn(`[${where}] ${error.code}: ${error.message}`)
    return
  }
  reportError(error, { where })
}

async function toFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string; details?: unknown } }
      return new FunctionError(body.error?.code ?? 'INTERNAL', body.error?.message ?? error.message, response.status, body.error?.details)
    } catch {
      return new FunctionError('INTERNAL', error.message, response.status)
    }
  }
  return error instanceof Error ? error : new Error(String(error))
}

/** `POST`/`GET` `<fn>/<route>` with the signed-in user's JWT; the parsed JSON body, or a `FunctionError`. */
export async function invokeFunction<T extends object>(fn: string, route: string, options: { method: 'GET' | 'POST'; body?: object }): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke<T>(`${fn}/${route}`, options)
  if (error) throw await toFunctionError(error)
  if (!data) throw new FunctionError('INTERNAL', `Empty response from ${fn}/${route}`, 200)
  return data
}
