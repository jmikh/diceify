# Step D2 — Checkout, portal, cancel, resume + Account page + pricing wiring

Scope (tiered plan): the remaining `billing` routes (`POST /checkout | /portal | /cancel | /resume`), their client wrappers in
`lib/supabase/billing.ts`, `app/(editor)/account/page.tsx` (plan, access-until/cancel-at, Cancel/Resume/Portal/Refresh,
`?checkout=success` polling), `PricingCards`/`Pricing`/`ProFeatureModal` calling checkout, `UserMenu`/`MobileMenu` linking to
`/account`, `CheckoutSuccessHandler` retired. Not here: static export (E1), Sentry (E2), pricing copy dedupe (C2 suggestion).

## Repo state found

- `billing/index.ts` serves `GET /sync` only; `_shared/http.ts` has the envelope + `requireUser`; `_shared/billing-sync.ts` has
  `loadProfile`/`syncBillingFromStripe`/`toBillingView`; `_shared/billing-snapshot.ts` (pure) already mirrors the PRO status set.
- `lib/supabase/billing.ts` has `syncBilling()` + `BillingError { code, status }`; `useUser()` exposes `refresh()`.
- `PricingCards.startCheckout` still POSTs to the deleted `/api/stripe/checkout`; `Pricing.tsx` mounts `CheckoutSuccessHandler` on
  `?success=`; both menus carry a `TODO(D2)` where "Manage subscription" was; no `/account` route exists.
- `StudioCard` let an active Creator pass start a Studio checkout; the plan's rule is "409 if already pro" (no stacking) — aligned.
- Price IDs and `APP_URL` are in `supabase/functions/.env` (test prices of the sandbox account) but unread until now.

## Edge function `billing`

`index.ts` = boot guard + `switch` on `` `${method} ${route}` ``; the handlers live in `billing/handlers.ts` (one file, < 200 lines).
Every route: `requireUser` (401), profile via service role (404 `NOT_FOUND`), zod-validated JSON body (400 `VALIDATION`, `details` =
issues). Boot requires `APP_URL` and the three `STRIPE_*_PRICE_ID`s (throws with the missing name).

| Route | Request | Response / errors |
|---|---|---|
| `POST /checkout` | `{ plan: 'creator' \| 'studio_monthly' \| 'studio_yearly' }` | `{ url }` (Stripe Checkout). 409 `ALREADY_SUBSCRIBED` when `hasPaidAccess(profile, now)` (any pro plan, including a Creator pass — no stacking). Ensures the customer first: `customers.create({ email, metadata: { userId } })` persisted with `update … .is('stripe_customer_id', null)`; if that CAS writes nothing (a concurrent call won) the orphan customer is deleted and the stored id is used → **one customer per user**. Then `checkout.sessions.create({ customer, mode: creator ? 'payment' : 'subscription', line_items: [{ price, quantity: 1 }], client_reference_id: userId, metadata: { userId, plan }, subscription_data: { metadata } (subscription mode only), success_url: `${APP_URL}/account?checkout=success`, cancel_url: `${APP_URL}/#pricing` })`. The `metadata.plan === 'creator'` on the session is what `creatorExpiry` reads. |
| `POST /portal` | `{ returnPath?: string }` — must start with `/` and not `//` | `{ url }` (Stripe Customer Portal, `return_url = APP_URL + (returnPath ?? '/account')`). 404 `NO_SUBSCRIPTION` without a `stripe_customer_id`. Needs the portal configured once per Stripe mode (dashboard → Settings → Billing → Customer portal); otherwise Stripe rejects and the route answers 500 `INTERNAL` (message logged). |
| `POST /cancel` | — | `{ billing: BillingView }` after `subscriptions.update(id, { cancel_at_period_end: true })` + full sync. 404 `NO_SUBSCRIPTION` without a subscription id or a non-PRO status; 409 `ALREADY_SCHEDULED` when `cancel_at` is set. |
| `POST /resume` | — | `{ billing }` after `update(id, { cancel_at_period_end: false })` + sync. 404 `NO_SUBSCRIPTION`; 409 `NOT_SCHEDULED` when `cancel_at` is null. |
| `GET /sync` | — | unchanged (D1). |

Cancel/resume act on the stored row (the last snapshot); when Stripe answers `StripeInvalidRequestError` (the subscription is gone
or already in that state) the row is re-synced and the route answers 409 `STALE` so the client refreshes instead of showing a 500.
`ErrorCode` gains `ALREADY_SCHEDULED | NOT_SCHEDULED | STALE`.

`_shared/billing-snapshot.ts` gains `hasPaidAccess(row, now)` — the 4-line mirror of `deriveEntitlements().isPro` (lifetime →
studio with PRO status → creator with `plan_expires_at > now`); the vitest suite pins it against core over a table of rows.
`_shared/billing-schemas.ts` (zod only, so vitest can load it) holds `CheckoutBody`/`PortalBody` + a small test.

## Client (`lib/supabase/billing.ts`)

```ts
startCheckout(plan: CheckoutPlan): Promise<{ url: string }>      // POST billing/checkout
openBillingPortal(returnPath = '/account'): Promise<{ url: string }>   // POST billing/portal
cancelSubscription(): Promise<BillingView>                        // POST billing/cancel
resumeSubscription(): Promise<BillingView>                        // POST billing/resume
syncBilling(): Promise<BillingView>                               // GET  billing/sync (D1)
class BillingError extends Error { code: string; status: number; details?: unknown }
```
One private `invoke<T>(route, { method, body })` maps the envelope (or a foreign gateway body) to `BillingError`. Navigation
(`window.location.assign(url)`) is the caller's job — the wrappers stay testable. `viewToBillingState(view)` maps a `BillingView` to
core's `BillingState` so the account page can derive `isPro` from a sync result without waiting for the profile refetch.

## Account page

`app/(editor)/account/page.tsx` (`'use client'`, `<Suspense>` for `useSearchParams`) renders `features/billing/AccountScreen.tsx`
(features/billing may not import features/editor, so it has its own minimal header: Logo → `/`, "Back to editor" → `/editor`).
`ProfileProvider` comes from the editor route-group layout.

| State | UI |
|---|---|
| `status === 'loading'` | spinner |
| `anon` | glass card "Sign in to see your plan" + `SignInModal` (`redirectTo="/account"`) |
| `authed` | plan card + actions (below); `PricingCards` (compact) inline when `!isPro` |

Plan card: name `Explorer` / `Creator pass` / `Studio` / `Pro` (lifetime) + `PlanBadge`; status line: creator → "Access until
{date}"; studio `renews` → "Renews on {date}"; studio `cancelAt` → "Cancels on {date} — you keep access until then"; lifetime →
"Lifetime access"; explorer → "Free plan". Buttons: **Cancel subscription** (studio + renews) → inline confirm ("Keep plan" / "Yes,
cancel") → `cancelSubscription()`; **Resume subscription** (studio + cancelAt) → `resumeSubscription()`; **Manage billing**
(`canManageBilling`) → `openBillingPortal('/account')` → same-tab `location.assign` (the portal returns to `/account`);
**Refresh** → `syncBilling()`. Every action ends with `refresh()` (entitlements come from the profile row, never from the view).
Errors show inline (`BillingError.message`); `ALREADY_SCHEDULED | NOT_SCHEDULED | STALE` just refresh.
On mount (authed) the page calls `syncBilling()` once, then `refresh()` — the "cancel in the dashboard with webhooks off" path.

`?checkout=success`: `syncBilling()` every 2 s, at most 10×, until `deriveEntitlements(viewToBillingState(view)).isPro`; banner
"Confirming your purchase…" → on success `refresh()`, "You're all set!" and `router.replace('/account')`; on timeout `refresh()` and
"Still processing — refresh in a minute" (the server-side 30 s sync window means polls after the first mostly return the row the
webhook keeps updating; without webhooks only the first poll reads Stripe). The success param is dropped either way.

Formatting helpers (`features/billing/planCopy.ts`): `planDisplayName(plan)`, `formatBillingDate(iso)` — `UserMenu` reuses the
latter.

## Call sites

| Site | Change |
|---|---|
| `features/billing/PricingCards.tsx` | `startCheckout(plan)` from `lib/supabase/billing` → `location.assign(url)`; `ALREADY_SUBSCRIBED` → `onAlreadyPro(entitlements.plan)`; `StudioCard` gates on `entitlements.isPro` like the Creator card (server rule) |
| `features/marketing/components/Pricing.tsx` | `CheckoutSuccessHandler`, the success modal and `useSearchParams` removed; Creator "already pro" copy no longer promises a Studio upgrade |
| `features/editor/components/account/ProFeatureModal.tsx` | unchanged (uses the cards); copy aligned |
| `features/editor/components/account/UserMenu.tsx`, `mobile/MobileMenu.tsx` | `TODO(D2)` → `Link href="/account"` "Account & billing" (always when signed in) |
| `features/billing/CheckoutSuccessHandler.tsx` | deleted (checkout returns to `/account?checkout=success`) |

## Docs / env

- `docs/STRIPE_TESTING.md`: flows 1–4 rewritten around `/account` (polling, in-app cancel/resume, portal), the one-time portal
  configuration, calling the new routes by hand. `docs/DEPLOY.md`: one line — configure the Customer Portal in live mode.
- `supabase/functions/.env.example`: the "(D2)" markers dropped; no new variables.

## Tests

- `billing-snapshot.test.ts`: `hasPaidAccess` ≡ `deriveEntitlements().isPro` over lifetime / studio × statuses / creator ± expiry / explorer.
- `billing-schemas.test.ts`: plans accepted/rejected; `returnPath` `/x` ok, `x`, `//evil`, `http://…` rejected; empty body ok.
- `lib/supabase/billing.integration.test.ts` (opt-in `SUPABASE_TEST=1 STRIPE_TEST=1`; needs the served functions, the service-role
  key, `STRIPE_SECRET_KEY` + `STRIPE_STUDIO_MONTHLY_PRICE_ID`): Admin-API user → password sign-in → `startCheckout('studio_monthly')`
  → `checkout.stripe.com` URL + `stripe_customer_id` set → second call same customer → subscription created through the Stripe API
  (`pm_card_visa`) → `syncBilling()` studio/active → checkout 409 → cancel (`cancelAt` set) → cancel 409 → resume (null) → portal
  URL on `billing.stripe.com` → Stripe customer + user deleted. Creator's `mode=payment` completion needs a browser: manual flow.

## Verification

1. `npm run functions:check`; `npm run db:start` + `npm run functions:serve` + `npm run stripe:listen -- --api-key …`; the
   integration test above; `stripe trigger checkout.session.completed --api-key …` → 200 (unknown customer).
2. `rm -rf .next && npm run typecheck && npm test && npm run lint && npm run build` → 0; `/account` in the build output.
3. Manual (user, with `npm run dev`): buy Creator with 4242 → plan creator, expires +30 d; buy Studio → active + period end; second
   checkout while pro → 409; one Stripe customer per user; cancel → `cancel_at` set, still pro, `renews=false`; resume → cleared;
   stop `stripe listen`, cancel in the dashboard, open `/account` → reflected via sync; portal opens and returns.
