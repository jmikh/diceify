# Step C2 — Client auth + profile + entitlements; remove NextAuth

Scope (tiered plan): `lib/supabase/{client,auth,profile}.ts`, `features/account/useUser.tsx` (`ProfileProvider`, `useUser`,
`useEntitlements`), `features/editor/hooks/useGate.ts`, every `useSession`/`getSession`/`signIn`/`signOut` site migrated,
NextAuth + its API routes + both `next-auth.d.ts` deleted, Google birthday scope gone. Not in scope: projects/storage/autosave
on Supabase (C3), billing edge functions and the Account page (D1/D2), `app/api/projects/**` deletion (C3).

## Repo state found

- 17 files touch NextAuth: `app/(editor)/layout.tsx` (`auth()` + `SessionProvider`), `AnalyticsTracker` (`User` type prop),
  `SignInModal` (`signIn(provider, { callbackUrl })`), `CheckoutSuccessHandler` (`useSession().update`), `PricingCards`
  (`getSession()` + `GET /api/user/subscription` before checkout), `Pricing` (its own `SessionProvider`), `UserMenu`/`MobileMenu`
  (`session.user.{planType,subscriptionStatus,subscriptionExpiresAt,image,name,email}` + `signOut()`), `BuilderLimitToast` +
  `ProgressPreviewModal` + `useBlueprintDownload` (`session.user.isPro`), `useBuildNavigation.useBuildGate` (`planType`),
  `EditorHeader`/`EditorScreen` (`status`, `PLAN_LIMITS` from `lib/subscription`), `useEditorBootstrap`/`useProjectManager`
  (`status`, `session.user.id`). `PlanBadge` imports `PlanType` from `lib/subscription`.
- `maxProjects` is threaded as a prop (default `= 3`, wrong for every plan) through `EditorScreen → EditorHeader/MobileBottomBar
  → ProjectSelector/MobileMenu → ProjectListMenu` and `ProjectSelectionModal`.
- `app/api/{auth,user/subscription,user/commission-interest,stripe/checkout,stripe/portal}` import `auth()`; `stripe/webhook`
  imports only `lib/{stripe,prisma}` (stays until D1). `app/api/projects/**` import `auth()` and `canCreateProject`.
- `.env.local` still lacks `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`; `supabase/.env` already holds the Google credentials.
- `core/billing` has everything the client needs (`deriveEntitlements`, `EXPLORER_ENTITLEMENTS`, `PLAN_LIMITS`, `CheckoutPlan`).

## Client modules

```ts
// lib/supabase/client.ts — lazy singleton so importing never touches publicEnv during prerender
getSupabase(): SupabaseClient<Database>   // createClient(url, anon, { auth: { persistSession, autoRefreshToken, detectSessionInUrl, flowType: 'pkce' } })

// lib/supabase/auth.ts
signInWithGoogle(redirectTo: string): Promise<void>   // signInWithOAuth({ provider:'google', options:{ redirectTo, queryParams:{ prompt:'select_account' } } }); throws the AuthError
signOut(): Promise<void>                              // auth.signOut({ scope:'global' }) (warn on error) + wipe `sb-*` localStorage keys
getAccessToken(): Promise<string | null>              // for the C3 keepalive flush helper

// lib/supabase/profile.ts
type ProfileRow = Tables<'profiles'>
fetchProfile(): Promise<ProfileRow | null>            // from('profiles').select('*').maybeSingle() — RLS returns the own row or nothing
toBillingState(row: ProfileRow): BillingState         // snake_case → core; unknown plan → 'explorer'; hasStripeCustomer = !!stripe_customer_id
```

## `features/account/useUser.tsx`

```ts
type UserStatus = 'loading' | 'anon' | 'authed'
interface UserInfo { id: string; email: string | null; name: string | null; avatarUrl: string | null }   // from session.user (+metadata full_name|name, avatar_url|picture), profile as fallback
interface UserContextValue { status; user: UserInfo | null; profile: ProfileRow | null; entitlements: Entitlements; refresh(): Promise<void>; signOut(): Promise<void> }
ProfileProvider({ children })   // client component
useUser(): UserContextValue     // throws outside a provider
useEntitlements(): Entitlements // = useUser().entitlements (EXPLORER_ENTITLEMENTS while loading/anon)
```

- Mount: `getSession()` → no session → `anon`; session → `fetchProfile()` → `deriveEntitlements(toBillingState(row), new Date())`
  → `authed`. `status` stays `loading` until the profile has been fetched (no explorer flash for a pro user); a failed profile
  fetch logs a warning and still yields `authed` with explorer entitlements.
- `onAuthStateChange`: `SIGNED_OUT` → clear; `SIGNED_IN | TOKEN_REFRESHED | USER_UPDATED` → reload, skipped when the access
  token is unchanged (tab refocus re-emits `SIGNED_IN`; the post-OAuth `getSession()` already loaded it). The reload is deferred
  with `setTimeout(0)` — supabase-js holds its auth lock while notifying subscribers, and a PostgREST call inside the callback
  deadlocks on it. `refresh()` always refetches. `signOut()` clears state immediately (does not wait for the event).
- Mounted in `app/(editor)/layout.tsx` (server component: metadata + JSON-LD kept, `auth()`/`SessionProvider` removed;
  `<ProfileProvider>{children}<AnalyticsTracker/></ProfileProvider>`) and in `features/marketing/components/Pricing.tsx`
  (`Pricing` = `<ProfileProvider><PricingSection/></ProfileProvider>`; `getSession()` is a local read, no network unless signed in).

## `features/editor/hooks/useGate.ts`

```ts
interface GateOptions { signInMessage?: string; modal?: 'limit' | 'proFeature' }
type GateAction = { kind: 'allow' } | { kind: 'signIn'; message?: string } | { kind: 'modal'; modal: 'limit' | 'proFeature' }
resolveGate(allowed: boolean, signedIn: boolean, opts?: GateOptions): GateAction   // pure, tested
useGate(): { ent: Entitlements; user: UserInfo | null; gate(allowed, opts?): boolean }   // opens the modal via useEditorUiStore; returns `allowed`
```
Not allowed: anonymous → `openModal('signIn', { message: signInMessage })`; signed in → `openModal(modal ?? 'proFeature')`.

## Call sites

| Site | Before | After |
|---|---|---|
| `app/(editor)/layout.tsx` | `await auth()`, `SessionProvider`, `AnalyticsTracker user=` | plain server layout; `ProfileProvider` wraps children + `AnalyticsTracker` |
| `AnalyticsTracker` | `user` prop (`next-auth` `User`) | `useUser().user?.id` |
| `SignInModal` | `signIn(provider, { callbackUrl })` | `await onBeforeSignIn?.()` → `signInWithGoogle(`${location.origin}${redirectTo}`)`; errors shown in the modal (`err.message`) |
| `CheckoutSuccessHandler` | `useSession().update()` + `router.refresh()` | `useUser().refresh()` then `router.replace('/')` + `onComplete()`; `TODO(D2)` |
| `PricingCards` `CreatorCard`/`StudioCard` | `getSession()`, `GET /api/user/subscription` | `useUser()`: no user → `onAuthRequired()`; `entitlements.isPro` with the card's plan set → `onAlreadyPro(plan)`; checkout `POST /api/stripe/checkout` left with `TODO(D2)` (401 now). `PlanType` → `CheckoutPlan` from core |
| `Pricing` | `SessionProvider` around the handler | `ProfileProvider` around the section |
| `ProFeatureModal` | `PlanType` from PricingCards | `CheckoutPlan` |
| `PlanBadge` | `PlanType` from `lib/subscription` | `Plan` from `core/billing` |
| `UserMenu` / `MobileMenu` | `session.user.*`, `signOut` from next-auth, portal button | `useUser()`: `user`, `ent.plan/accessUntil/cancelAt/renews`, `signOut`; "Manage subscription" hidden (`TODO(D2)`); mobile "Upgrade" shown when `!ent.isPro` |
| `BuilderLimitToast` | `session.user.isPro`, manual modal choice | `ent.builderRowLimit === null → null`; copy uses the number; `gate(false, { signInMessage, modal:'proFeature' })` |
| `ProgressPreviewModal` | `session.user.isPro` | `useEntitlements().hasSvgExport` |
| `useBlueprintDownload` | two `openModal` branches | `gate(ent.hasSvgExport, { signInMessage })` |
| `useBuildGate` | `planType` → `PLAN_LIMITS.explorer` | `{ rowLimit: ent.builderRowLimit, onBlocked: () => gate(false, { modal:'limit' }) }` (`moveTo` already applies `rowLimitAllows`) |
| `EditorHeader` | `useSession()` `status`/`session.user` | `useUser().user` |
| `EditorScreen` | `status === 'loading'`, `maxProjects` prop | `useUser().status === 'loading'`; `maxProjects` gone |
| `ProjectListMenu` / `ProjectSelector` / `ProjectSelectionModal` | `maxProjects = 3` prop | `useEntitlements().projectLimit` inside the component; props deleted |
| `useEditorBootstrap` | `status` `'loading'|'unauthenticated'|'authenticated'`, `session.user.id` | `useUser()` `status` `'loading'|'anon'|'authed'`, `user?.id` |
| `useProjectManager` | `session.user.id`; non-OK responses silently ignored | `user?.id`; every non-OK response `console.warn('[TODO(C3)] …')` and degrades to `[]`/`null`/no-op |

## Deleted / kept

- Deleted: `lib/auth.ts`, `lib/subscription.ts`, root `next-auth.d.ts`, `types/next-auth.d.ts` (folder goes with it),
  `app/api/auth/`, `app/api/user/` (subscription + dead commission-interest), `app/api/stripe/{checkout,portal}/`,
  `features/billing/openBillingPortal.ts` (its only two callers are hidden; D2 replaces it with `lib/supabase/billing.ts`).
  Packages: `next-auth`, `@auth/prisma-adapter`. Added: `@supabase/supabase-js@^2`.
- Kept until C3: `app/api/projects/**` on `lib/api/legacy-auth.ts` — a shim whose `auth()` resolves `null`, so every project
  route answers 401; the `canCreateProject` block in `POST /api/projects` is removed (unreachable; the DB trigger enforces the
  limit in C3). `lib/prisma.ts`, `prisma/`, `lib/stripe.ts` + `app/api/stripe/webhook` (D1) untouched.
- Transitional (knowingly broken until C3/D2): project list/create/delete/load/rename and DB autosave (all 401 → empty list,
  no-op, warning); Stripe checkout from the pricing cards (401 → "Billing Error" in the console, spinner resets); "Manage
  subscription" hidden; `CheckoutSuccessHandler` refreshes a profile the old webhook cannot update. Anonymous drafts, gating,
  sign-in/out and the OAuth round trip all work.

## Env / docs / tests

- `.env.local` gains `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331` + the demo anon key (legacy vars kept until C3).
- `docs/DEPLOY.md`: Google OAuth section — Google Cloud redirect URIs (local `http://127.0.0.1:54331/auth/v1/callback`, hosted
  `https://<ref>.supabase.co/auth/v1/callback`), `supabase/.env` for local credentials, Supabase redirect allow-list entries.
- Tests: `lib/supabase/profile.test.ts` (`toBillingState`), `features/editor/hooks/useGate.test.ts` (`resolveGate`), and
  `lib/supabase/auth.integration.test.ts` (skipped unless `SUPABASE_TEST=1`; needs `SUPABASE_SERVICE_ROLE_KEY`): admin-creates a
  user, signs in with password on the browser-less client, `fetchProfile()` → own row, service-role update to
  `plan='studio', subscription_status='active'` → refetch → studio limits, deletes the user.

## Verification

1. `npm run db:start`; env as above; `SUPABASE_TEST=1 SUPABASE_SERVICE_ROLE_KEY=… npx vitest run lib/supabase/auth.integration.test.ts`
   (green: anonymous → no row; sign-in → own row + explorer limits; service-role plan change → studio limits; client
   `update profiles` → `[]` under RLS; sign-out → no token, no row). Provider sanity: `GET /auth/v1/authorize?provider=google&redirect_to=…`
   on the local API answers 302 to `accounts.google.com` (`scope=email+profile`, no birthday scope).
   `rm -rf .next` before `typecheck` — stale `.next/types` for the deleted routes fail `tsc` otherwise.
2. `git grep -n "next-auth\|useSession\|getSession\|lib/auth\|lib/subscription\|maxProjects\|birthday" -- app components lib features core` → empty (`birthday` only in blog copy — excluded by content, see report).
3. `npm run typecheck && npm test && npm run lint && npm run build` → 0.
4. Manual (user): Google console callback URI added once; local Google sign-in round trip lands on `/editor?restored=true`
   with the draft intact; `auth.users` + `profiles` rows exist; edit `profiles.plan` in Studio → gating changes after refresh.
