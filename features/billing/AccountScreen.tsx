'use client'

// The /account page: the signed-in user's plan, when it ends or renews, in-app cancel/resume, the Stripe portal,
// a manual refresh, and the "Confirming your purchase…" polling after Checkout returns with ?checkout=success.
// Entitlements always come from the profile row (`useUser().refresh()` after every action); the billing views
// returned by the function are only used to know when to stop polling.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { deriveEntitlements, type CheckoutPlan, type Entitlements } from '@/core/billing'
import BackgroundOrbs from '@/components/BackgroundOrbs'
import Logo from '@/components/Logo'
import SignInModal from '@/features/account/SignInModal'
import { useUser } from '@/features/account/useUser'
import {
  BillingError,
  cancelSubscription,
  openBillingPortal,
  reportBillingError,
  resumeSubscription,
  syncBilling,
  viewToBillingState,
} from '@/lib/supabase/billing'
import PlanBadge from './PlanBadge'
import { CreatorCard, StudioCard } from './PricingCards'
import { formatBillingDate, planDisplayName } from './planCopy'

const POLL_INTERVAL_MS = 2_000
const POLL_MAX_ATTEMPTS = 10

/** Error codes that mean "the row was stale": reload instead of complaining. */
const REFRESH_ONLY_CODES = new Set(['ALREADY_SCHEDULED', 'NOT_SCHEDULED', 'STALE'])

type CheckoutState = 'idle' | 'confirming' | 'confirmed' | 'timeout'
type Busy = 'cancel' | 'resume' | 'portal' | 'refresh' | null

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Polls the sync until the purchase shows up as a paid plan (or gives up), then refreshes the profile. */
function useCheckoutConfirmation(active: boolean, authed: boolean, refresh: () => Promise<void>): CheckoutState {
  const [state, setState] = useState<CheckoutState>(active ? 'confirming' : 'idle')

  useEffect(() => {
    if (!active || !authed) return
    let cancelled = false
    const run = async () => {
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS && !cancelled; attempt++) {
        try {
          const view = await syncBilling()
          if (deriveEntitlements(viewToBillingState(view), new Date()).isPro) {
            await refresh()
            if (!cancelled) setState('confirmed')
            return
          }
        } catch (error) {
          reportBillingError(error, 'billing-confirm')
        }
        await sleep(POLL_INTERVAL_MS)
      }
      await refresh()
      if (!cancelled) setState('timeout')
    }
    run()
    return () => {
      cancelled = true
    }
  }, [active, authed, refresh])

  return state
}

function statusLine(ent: Entitlements): string {
  switch (ent.plan) {
    case 'lifetime':
      return 'Lifetime access — thank you for being an early supporter.'
    case 'studio':
      if (ent.cancelAt) return `Cancels on ${formatBillingDate(ent.cancelAt)} — you keep access until then.`
      return ent.accessUntil ? `Renews on ${formatBillingDate(ent.accessUntil)}.` : 'Active subscription.'
    case 'creator':
      return ent.accessUntil ? `Access until ${formatBillingDate(ent.accessUntil)}.` : 'Active pass.'
    default:
      return 'Free plan — the builder works for the first rows; upgrade for unlimited building and SVG blueprints.'
  }
}

function CheckoutBanner({ state }: { state: CheckoutState }) {
  if (state === 'idle') return null
  const styles = {
    confirming: { box: 'border-white/10 bg-white/5 text-white/80', icon: <Loader2 size={18} className="animate-spin text-accent-pink" /> },
    confirmed: { box: 'border-green-500/30 bg-green-500/10 text-green-300', icon: <CheckCircle2 size={18} /> },
    timeout: { box: 'border-orange-500/30 bg-orange-500/10 text-orange-300', icon: <AlertCircle size={18} /> },
  }[state]
  const text = {
    confirming: 'Confirming your purchase…',
    confirmed: "You're all set! Your plan is active.",
    timeout: 'Still processing — your payment went through; refresh in a minute.',
  }[state]
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${styles.box}`} role="status">
      {styles.icon}
      <span>{text}</span>
    </div>
  )
}

const BUTTON = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const BUTTON_GHOST = `${BUTTON} border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white`
const BUTTON_DANGER = `${BUTTON} border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`

function PlanCard({ ent, busy, onAction }: { ent: Entitlements; busy: Busy; onAction: (kind: Exclude<Busy, null>) => void }) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const disabled = busy !== null

  return (
    <section className="glass p-6 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Current plan</p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{planDisplayName(ent.plan)}</h2>
            <PlanBadge plan={ent.plan} />
          </div>
          <p className="text-sm text-white/60 mt-2">{statusLine(ent)}</p>
        </div>
        <button onClick={() => onAction('refresh')} disabled={disabled} className={BUTTON_GHOST} title="Re-read your billing status from Stripe">
          <RefreshCw size={14} className={busy === 'refresh' ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {confirmCancel ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm text-white/80">
            Cancel your Studio subscription? You keep full access until{' '}
            {ent.accessUntil ? formatBillingDate(ent.accessUntil) : 'the end of the current period'}, then your projects stay but
            drop back to the Explorer limits.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmCancel(false)} disabled={disabled} className={BUTTON_GHOST}>
              Keep plan
            </button>
            <button
              onClick={() => {
                setConfirmCancel(false)
                onAction('cancel')
              }}
              disabled={disabled}
              className={BUTTON_DANGER}
            >
              Yes, cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {ent.plan === 'studio' && ent.renews && (
            <button onClick={() => setConfirmCancel(true)} disabled={disabled} className={BUTTON_DANGER}>
              {busy === 'cancel' && <Loader2 size={14} className="animate-spin" />}
              Cancel subscription
            </button>
          )}
          {ent.plan === 'studio' && ent.cancelAt && (
            <button onClick={() => onAction('resume')} disabled={disabled} className={`${BUTTON} bg-accent-pink text-white hover:bg-accent-pink-light`}>
              {busy === 'resume' && <Loader2 size={14} className="animate-spin" />}
              Resume subscription
            </button>
          )}
          {ent.canManageBilling && (
            <button onClick={() => onAction('portal')} disabled={disabled} className={BUTTON_GHOST} title="Invoices, payment method, billing details">
              {busy === 'portal' && <Loader2 size={14} className="animate-spin" />}
              Manage billing
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function UpgradeCards() {
  const [isLoading, setIsLoading] = useState<CheckoutPlan | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Upgrade</h2>
      {notice && <p className="text-sm text-white/60">{notice}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <CreatorCard
          source="account_page"
          onAuthRequired={() => undefined}
          onAlreadyPro={() => setNotice('You already have an active plan.')}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
        <StudioCard
          source="account_page"
          onAuthRequired={() => undefined}
          onAlreadyPro={() => setNotice('You already have an active plan.')}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>
    </section>
  )
}

export default function AccountScreen() {
  const { status, user, entitlements: ent, refresh } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const checkoutReturn = searchParams?.get('checkout') === 'success'
  const authed = status === 'authed'

  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)

  const checkoutState = useCheckoutConfirmation(checkoutReturn, authed, refresh)

  // Drop the success param once the confirmation finished either way (a reload must not poll again).
  useEffect(() => {
    if (checkoutReturn && (checkoutState === 'confirmed' || checkoutState === 'timeout')) router.replace('/account')
  }, [checkoutReturn, checkoutState, router])

  // On load: pull the snapshot from Stripe (catches a dashboard cancel with webhooks off), then refetch the row.
  useEffect(() => {
    if (!authed || checkoutReturn) return
    syncBilling()
      .then(() => refresh())
      .catch((err) => reportBillingError(err, 'billing-sync'))
  }, [authed, checkoutReturn, refresh])

  const runAction = useCallback(
    async (kind: Exclude<Busy, null>) => {
      setBusy(kind)
      setError(null)
      try {
        if (kind === 'portal') {
          const { url } = await openBillingPortal('/account')
          window.location.assign(url)
          return // the button stays disabled while the browser leaves
        }
        if (kind === 'cancel') await cancelSubscription()
        else if (kind === 'resume') await resumeSubscription()
        else await syncBilling()
        await refresh()
      } catch (err) {
        if (err instanceof BillingError && REFRESH_ONLY_CODES.has(err.code)) {
          await refresh()
        } else {
          reportBillingError(err, `billing-${kind}`)
          setError(err instanceof Error ? err.message : 'Something went wrong')
        }
      }
      setBusy(null)
    },
    [refresh],
  )

  return (
    <div className="min-h-screen relative">
      <BackgroundOrbs />
      <header className="relative z-10 max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <Link href="/editor" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          Back to editor
        </Link>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 pb-16 pt-4 space-y-6">
        <h1 className="text-3xl font-bold font-syne text-white">Account</h1>

        {status === 'loading' && (
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 size={18} className="animate-spin" />
            Loading your account…
          </div>
        )}

        {status === 'anon' && (
          <section className="glass p-8 text-center space-y-4">
            <p className="text-white/70">Sign in to see your plan and manage your subscription.</p>
            <button onClick={() => setSignInOpen(true)} className={`${BUTTON} bg-accent-pink text-white hover:bg-accent-pink-light px-6 py-3`}>
              Sign in
            </button>
            <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} redirectTo="/account" message="Sign in to manage your plan." />
          </section>
        )}

        {authed && user && (
          <>
            <CheckoutBanner state={checkoutState} />
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            <p className="text-sm text-white/50">
              Signed in as <span className="text-white/80">{user.email ?? user.name ?? 'you'}</span>
            </p>
            <PlanCard ent={ent} busy={busy} onAction={runAction} />
            {!ent.isPro && <UpgradeCards />}
          </>
        )}
      </main>
    </div>
  )
}
