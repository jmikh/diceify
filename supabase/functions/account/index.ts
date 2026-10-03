// Account API for the signed-in user (config.toml: verify_jwt = true, like `billing`).
//
// Routes (pathname after `/account`):
//   POST /delete   → { deleted: true, projects, shares, cancelledSubscription }
//                    cancels an active Stripe subscription, removes the user's images and share cards, deletes the
//                    auth user (profiles/projects/shares cascade). The client signs out locally afterwards.

import Stripe from 'stripe'
import { deleteAccount } from '../_shared/account-delete.ts'
import { error, handleOptions, json, requireUser } from '../_shared/http.ts'
import { assertStripeEnv, getStripe } from '../_shared/stripe.ts'
import { getAdmin } from '../_shared/supabase-admin.ts'

assertStripeEnv()

function routeOf(req: Request): string {
  const pathname = new URL(req.url).pathname.replace(/\/+$/, '')
  const marker = '/account'
  const at = pathname.lastIndexOf(marker)
  return at === -1 ? pathname : pathname.slice(at + marker.length) || '/'
}

const stripeCanceller = {
  async cancelSubscription(id: string): Promise<void> {
    try {
      await getStripe().subscriptions.cancel(id)
    } catch (err) {
      // Already cancelled / gone in Stripe: nothing left to stop
      if (err instanceof Stripe.errors.StripeInvalidRequestError) {
        console.warn(`account/delete: subscription ${id} not cancellable: ${err.message}`)
        return
      }
      throw err
    }
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions()

  const user = await requireUser(req, getAdmin())
  if (!user) return error('UNAUTHORIZED', 'Sign in required', 401)

  const route = routeOf(req)
  try {
    switch (`${req.method} ${route}`) {
      case 'POST /delete': {
        const result = await deleteAccount(getAdmin(), stripeCanceller, user.id)
        console.log(`account/delete: ${user.id}: ${result.projects} projects, ${result.shares} shares, subscription ${result.cancelledSubscription ?? '-'}`)
        return json(result)
      }
      default:
        return error('NOT_FOUND', `No route ${req.method} ${route}`, 404)
    }
  } catch (err) {
    console.error(`account: ${req.method} ${route} failed for ${user.id}:`, err)
    return error('INTERNAL', 'Account request failed', 500)
  }
})
