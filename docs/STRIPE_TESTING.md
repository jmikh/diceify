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
| `STRIPE_CREATOR_PRICE_ID`, `STRIPE_STUDIO_MONTHLY_PRICE_ID`, `STRIPE_STUDIO_YEARLY_PRICE_ID` | test-mode prices (one-time $19; $9/month; $36/year) — used by checkout (D2) |
| `APP_URL` | `http://localhost:3000` |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected by the runtime; do not put them in the file.

## Run order

```sh
npm run db:start            # local Supabase (API http://127.0.0.1:54331)
npm run functions:serve     # terminal 2: both functions, hot reload, reads supabase/functions/.env
npm run stripe:listen       # terminal 3: forwards test-mode events to the local webhook; prints the whsec_
npm run dev                 # terminal 4
```

`stripe:listen` uses the Stripe CLI login (`stripe login`). If the CLI is logged into another account, target the key's account
explicitly: `npm run stripe:listen -- --api-key sk_test_…` (same for `stripe trigger`). Type-check the functions with
`npm run functions:check` (Deno, not part of `npm run typecheck`).

## Test cards

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | succeeds |
| `4000 0025 0000 3155` | 3D Secure challenge |
| `4000 0000 0000 9995` | declined (insufficient funds) |

Any future expiry, any CVC, any postal code.

## Flows

1. **Buy Creator** (D2 checkout, 4242) → `checkout.session.completed` → sync → `profiles.plan = 'creator'`, `plan_expires_at` =
   session `created` + 30 d. A second creator purchase later raises the expiry (monotonic), never lowers it.
2. **Buy Studio** → `customer.subscription.created` (+ `invoice.paid`) → `plan = 'studio'`, `subscription_status = 'active'`,
   `current_period_end` set, `cancel_at` null.
3. **Cancel in the app** (D2) → `cancel_at_period_end: true` → `customer.subscription.updated` → `cancel_at` set, still Studio until then
   (`renews = false` in the entitlements). Resume clears it.
4. **Cancel in the dashboard with `stripe listen` stopped** → nothing arrives; open the account page / call `GET /billing/sync` →
   the snapshot is recomputed from Stripe and shows `cancel_at` (or `canceled`). This is the "Stripe is the source of truth" path.
5. **Renewal / payment failure** → Stripe dashboard → Test clocks: create a clock, a customer on it, subscribe, advance past the period
   end → `invoice.paid` (renews; `current_period_end` moves) or, with card `4000 0000 0000 0341` attached, `invoice.payment_failed`
   → `subscription_status = 'past_due'` (still Studio: grace period) and later `unpaid`/`canceled` (→ explorer entitlements).
6. **Fixture events**: `stripe trigger customer.subscription.updated` (with `stripe listen` running) → the webhook answers 200 and logs
   `unknown customer cus_… — no profile, ignored` (the fixture customer is not a diceify user).

Watch the columns: `psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -c "select plan, subscription_status,
current_period_end, cancel_at, plan_expires_at, synced_at from profiles"` (or Studio, http://127.0.0.1:54333).

## Calling the functions by hand

```sh
# signed-in user's sync (JWT from a password grant against the local auth; see docs/DEPLOY.md for creating a user)
curl -s http://127.0.0.1:54331/functions/v1/billing/sync -H "Authorization: Bearer $USER_JWT" -H "apikey: $ANON_KEY"
# → { "billing": { "plan": "…", "subscriptionStatus": …, "currentPeriodEnd": …, "cancelAt": …, "planExpiresAt": …,
#                  "hasStripeCustomer": …, "syncedAt": … } }
```

A second call within 30 s answers from the row without touching Stripe (`billing/sync: … skipped (synced Ns ago)` in the serve log).
Link a profile to a Stripe test customer by hand: `update profiles set stripe_customer_id = 'cus_…' where email = '…'`, then sync.

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
