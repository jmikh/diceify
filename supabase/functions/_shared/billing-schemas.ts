// Request bodies of the `billing` function (zod only, so vitest can load and test them beside Deno).

import { z } from 'zod'

/** A same-origin path: starts with `/`, never `//` (protocol-relative) — appended to APP_URL. */
const SameOriginPath = z.string().regex(/^\/(?!\/)/, 'must be a path starting with "/"')

/** `plan`: mirror of core/billing/plans.ts `CheckoutPlan`. `cancelPath`: where Stripe's cancel returns (default `/#pricing`). */
export const CheckoutBody = z.object({
  plan: z.enum(['creator', 'studio_monthly', 'studio_yearly']),
  cancelPath: SameOriginPath.optional(),
})
export type CheckoutBody = z.infer<typeof CheckoutBody>

export const PortalBody = z.object({
  returnPath: SameOriginPath.optional(),
})
export type PortalBody = z.infer<typeof PortalBody>
