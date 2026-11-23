// Stripe Checkout from the web. A signed-out price click signs in first: the chosen plan rides the sign-in round trip
// as `?upgrade=<plan>`, and the editor resumes checkout once it is back, signed in and ready (`resumeCheckout`).

import { toast } from 'sonner'
import { isCheckoutPlan, type CheckoutPlan, type Entitlements } from '@/core/billing'
import { track } from '@/lib/analytics'
import { BillingError, reportBillingError, startCheckout } from '@/lib/supabase/billing'
import { SIGN_IN_REDIRECT } from '@/features/account/SignInModal'

const UPGRADE_PARAM = 'upgrade'

/** Stripe's cancel from an editor paywall: back to the editor, which reopens the most recent project. */
export const EDITOR_CANCEL_PATH = '/editor'

/** The sign-in return path that resumes checkout for `plan`. */
export const signInThenCheckoutPath = (plan: CheckoutPlan): string => `${SIGN_IN_REDIRECT}&${UPGRADE_PARAM}=${plan}`

/** The plan a sign-in round trip carried, if any. */
export function pendingCheckoutPlan(params: URLSearchParams): CheckoutPlan | null {
    const plan = params.get(UPGRADE_PARAM)
    return isCheckoutPlan(plan) ? plan : null
}

/**
 * Sends the browser to Stripe Checkout, whose cancel returns to `cancelPath` (default: the homepage pricing section).
 * Resolves only on failure (the page leaves on success); a 409 from the function means the profile is already on a
 * paid plan — reported through `onAlreadyPro`.
 */
export async function goToCheckout(plan: CheckoutPlan, onAlreadyPro: () => void, cancelPath?: string): Promise<boolean> {
    try {
        const { url } = await startCheckout(plan, cancelPath)
        track('checkout_started', { plan })
        window.location.assign(url)
        return true
    } catch (error) {
        if (error instanceof BillingError && error.code === 'ALREADY_SUBSCRIBED') {
            onAlreadyPro()
        } else {
            reportBillingError(error, 'billing-checkout')
        }
        return false
    }
}

/** Back from the sign-in a price click asked for: on to Stripe Checkout, unless the account already has a paid plan. */
export async function resumeCheckout(plan: CheckoutPlan, ent: Entitlements): Promise<void> {
    const alreadyPro = () => {
        toast.info('You already have full access on your current plan.')
    }
    if (ent.isPro) return alreadyPro()

    const toastId = toast.loading('Taking you to checkout…')
    let blockedByPlan = false
    if (await goToCheckout(plan, () => { blockedByPlan = true }, EDITOR_CANCEL_PATH)) return
    toast.dismiss(toastId)
    if (blockedByPlan) alreadyPro()
    else toast.error('Could not start checkout. Please try again from Upgrade.')
}
