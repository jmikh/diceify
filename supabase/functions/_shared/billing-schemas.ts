// Request bodies of the `billing` function (zod only, so vitest can load and test them beside Deno).

import { z } from 'zod'

/** Mirror of core/billing/plans.ts `CheckoutPlan`. */
export const CheckoutBody = z.object({
  plan: z.enum(['creator', 'studio_monthly', 'studio_yearly']),
})
export type CheckoutBody = z.infer<typeof CheckoutBody>

/** A same-origin path: starts with `/`, never `//` (protocol-relative) — appended to APP_URL. */
export const PortalBody = z.object({
  returnPath: z
    .string()
    .regex(/^\/(?!\/)/, 'returnPath must be a path starting with "/"')
    .optional(),
})
export type PortalBody = z.infer<typeof PortalBody>
