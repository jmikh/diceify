# Testing Stripe billing locally

Billing lives in two Supabase edge functions (`supabase/functions/billing`, `supabase/functions/stripe-webhook`); the profile's
billing columns are a **snapshot recomputed from Stripe** on every webhook event and every `GET /billing/sync` (rules:
`plans/revamp/revamp-step-D1.md` → "Snapshot rules"; code: `supabase/functions/_shared/billing-snapshot.ts`). Test mode only:
the functions refuse an `sk_test_` key against a hosted `SUPABASE_URL`.

## Env

`supabase/functions/.env` (gitignored; template `supabase/functions/.env.example`):

| Var | Where from |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys, **test mode** (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | printed by `npm run stripe:listen` (`whsec_…`, new on every session — paste it in and restart `functions:serve`) |
| `STRIPE_CREATOR_PRICE_ID`, `STRIPE_STUDIO_MONTHLY_PRICE_ID`, `STRIPE_STUDIO_YEARLY_PRICE_ID` | test-mode prices (one-time $19; $9/month; $36/year); the `billing` function refuses to boot without them |
| `APP_URL` | `http://localhost:3000` — Checkout's `success_url` (`/account?checkout=success`), `cancel_url` (`/#pricing`) and the portal's `return_url` |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected by the runtime; do not put them in the file.

## Run order

```sh
npm run db:start            # local Supabase (API http://127.0.0.1:54331)
npm run functions:serve     # terminal 2: both functions, hot reload, reads supabase/functions/.env
npm run stripe:listen       # terminal 3: forwards test-mode events to the local webhook; prints the whsec_
npm run dev                 # terminal 4
```

`stripe:listen` uses the Stripe CLI's `diceify` profile (`stripe login --project-name diceify`; the CLI key expires after 90
days), so the CLI's default login can stay on another account. Pass `--project-name diceify` to `stripe trigger` and other CLI
commands too. Type-check the functions with
`npm run functions:check` (Deno, not part of `npm run typecheck`).

## Test cards

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | succeeds |
| `4000 0025 0000 3155` | 3D Secure challenge |
| `4000 0000 0000 9995` | declined (insufficient funds) |

Any future expiry, any CVC, any postal code.

## Flows

Purchases start from the pricing cards (landing `#pricing`, the editor's upgrade modal, or `/account`): `POST /billing/checkout`
creates the Stripe customer on first use (one per user, persisted before the session) and sends the browser to Checkout;
Stripe returns to `/account?checkout=success`, which polls `GET /billing/sync` every 2 s (up to 10×) until the profile is on a
paid plan ("Confirming your purchase…" → "You're all set!"; after 20 s: "Still processing — refresh in a minute"). Cancel returns
to `/#pricing`.

1. **Buy Creator** (4242) → `checkout.session.completed` → sync → `profiles.plan = 'creator'`, `plan_expires_at` = session
   `created` + 30 d; `/account` shows "Access until …". A second creator purchase later raises the expiry (monotonic), never lowers it.
2. **Buy Studio** → `customer.subscription.created` (+ `invoice.paid`) → `plan = 'studio'`, `subscription_status = 'active'`,
   `current_period_end` set, `cancel_at` null; `/account` shows "Renews on …" and a **Cancel subscription** button.
3. **Second checkout while on a paid plan** → the cards show "You already have access"; the function answers 409 `ALREADY_SUBSCRIBED`
   (no stacking — an active Creator pass blocks Studio until it ends).
4. **Cancel in the app** (`/account` → Cancel subscription → confirm) → `POST /billing/cancel` → `cancel_at_period_end: true` → sync →
   `cancel_at` set, still Studio until then (`renews = false`, "Cancels on …"). **Resume subscription** → `POST /billing/resume` clears it.
   The webhook's `customer.subscription.updated` lands too and recomputes the same snapshot.
5. **Cancel in the dashboard with `stripe listen` stopped** → nothing arrives; open `/account` (it syncs on load) or press **Refresh** →
   the snapshot is recomputed from Stripe and shows `cancel_at` (or `canceled`). This is the "Stripe is the source of truth" path.
6. **Manage billing** (`/account`, any profile with a Stripe customer) → `POST /billing/portal` → the Customer Portal, back to `/account`.
   The portal must be configured once per Stripe mode (dashboard → Settings → Billing → Customer portal); until then Stripe rejects
   the session and the route answers 500 (`billing: POST /portal failed … No configuration provided` in the serve log). The sandbox
   account used for local testing already has it.
7. **Renewal / payment failure** → Stripe dashboard → Test clocks: create a clock, a customer on it, subscribe, advance past the period
   end → `invoice.paid` (renews; `current_period_end` moves) or, with card `4000 0000 0000 0341` attached, `invoice.payment_failed`
   → `subscription_status = 'past_due'` (still Studio: grace period) and later `unpaid`/`canceled` (→ explorer entitlements).
8. **Fixture events**: `stripe trigger checkout.session.completed` (with `stripe listen` running) → the webhook answers 200 and logs
   `unknown customer cus_… — no profile, ignored` (the fixture customer is not a diceify user).

Watch the columns: `psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -c "select plan, subscription_status,
current_period_end, cancel_at, plan_expires_at, synced_at from profiles"` (or Studio, http://127.0.0.1:54333).

## Calling the functions by hand

```sh
# JWT from a password grant against the local auth (docs/DEPLOY.md for creating a user); every route needs it + the anon key
H=(-H "Authorization: Bearer $USER_JWT" -H "apikey: $ANON_KEY" -H 'Content-Type: application/json')
B=http://127.0.0.1:54331/functions/v1/billing
curl -s $B/sync "${H[@]}"                                                  # → { "billing": { plan, subscriptionStatus, currentPeriodEnd, cancelAt, planExpiresAt, hasStripeCustomer, syncedAt } }
curl -s -X POST $B/checkout "${H[@]}" -d '{"plan":"studio_monthly"}'       # → { "url": "https://checkout.stripe.com/…" } | 409 ALREADY_SUBSCRIBED
curl -s -X POST $B/portal   "${H[@]}" -d '{"returnPath":"/account"}'       # → { "url": "https://billing.stripe.com/…" }  | 404 NO_SUBSCRIPTION
curl -s -X POST $B/cancel   "${H[@]}"                                      # → { "billing": … } | 404 NO_SUBSCRIPTION | 409 ALREADY_SCHEDULED
curl -s -X POST $B/resume   "${H[@]}"                                      # → { "billing": … } | 404 NO_SUBSCRIPTION | 409 NOT_SCHEDULED
```

Errors are `{ "error": { "code", "message", "details"? } }`; a 409 `STALE` on cancel/resume means Stripe disagreed with the stored
row (it has been re-synced — reload). A second `/sync` within 30 s answers from the row without touching Stripe
(`billing/sync: … skipped (synced Ns ago)` in the serve log). Link a profile to a Stripe test customer by hand:
`update profiles set stripe_customer_id = 'cus_…' where email = '…'`, then sync.

The whole route set runs browser-less as an opt-in vitest suite (`lib/supabase/billing.integration.test.ts`, header comment for the
env): checkout URL, one customer per user, API-created subscription → sync, 409, cancel/resume, portal. Only the Creator pass needs
a real Checkout (its `mode=payment` completion cannot be created through the API).

Without `stripe listen`, deliver a signed event yourself (same `t=…,v1=HMAC-SHA256(secret, "t.payload")` scheme Stripe uses):

```sh
SECRET=$(grep STRIPE_WEBHOOK_SECRET supabase/functions/.env | cut -d= -f2)
TS=$(date +%s); PAYLOAD='{"id":"evt_local","object":"event","type":"customer.subscription.updated","created":'$TS',"data":{"object":{"object":"subscription","customer":"cus_nobody"}}}'
SIG=$(printf '%s.%s' "$TS" "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')
curl -s -X POST http://127.0.0.1:54331/functions/v1/stripe-webhook -H 'Content-Type: application/json' -H "stripe-signature: t=$TS,v1=$SIG" -d "$PAYLOAD"
# → {"received":true,"unknownCustomer":true}; a wrong secret → 400 INVALID_SIGNATURE; an unhandled type → {"received":true,"ignored":true}
```

## Production

- Secrets: `supabase secrets set --env-file supabase/functions/.env.production` (live key, live prices, the dashboard endpoint's
  `whsec_`, `APP_URL=https://diceify.art`). Never the test key: the boot guard throws.
- Webhook endpoint, events and API version pin: `docs/DEPLOY.md` → Stripe.
