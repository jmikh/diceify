-- iOS step 1 (plans/ios/ios-app-plan.md § 7.3): Apple as a second billing source. In-app purchases are reported by
-- RevenueCat (webhook → `revenuecat-webhook` function) and stored in these columns, written ONLY by the edge functions
-- (service role), like the Stripe columns. Entitlements take the better of the two sources:
-- core/billing/entitlements.ts `deriveEntitlements` — `effective_plan` below MUST stay its mirror.

alter table public.profiles
  add column if not exists apple_plan text check (apple_plan in ('creator', 'studio')),  -- what the latest Apple purchase grants
  add column if not exists apple_product_id text,                                         -- App Store product id behind it
  add column if not exists apple_expires_at timestamptz,                                  -- when that grant ends (pass end / period end)
  add column if not exists apple_will_renew boolean not null default false,               -- auto-renewable and not cancelled
  add column if not exists apple_environment text check (apple_environment in ('sandbox', 'production')),
  add column if not exists apple_synced_at timestamptz;

-- Priority (same as deriveEntitlements): lifetime → studio from either source → creator from either source → explorer.
-- Apple grants count while `apple_expires_at > now()` (strict, like the creator pass).
create or replace function public.effective_plan(p public.profiles)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p.plan = 'lifetime' then 'lifetime'
    when (p.plan = 'studio' and p.subscription_status in ('active', 'trialing', 'past_due'))
      or (p.apple_plan = 'studio' and p.apple_expires_at > now()) then 'studio'
    when (p.plan = 'creator' and p.plan_expires_at > now())
      or (p.apple_plan = 'creator' and p.apple_expires_at > now()) then 'creator'
    else 'explorer'
  end
$$;
