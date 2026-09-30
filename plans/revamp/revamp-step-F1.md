# Step F1 — Migration script, rehearsed locally

Implements the "Existing data" decision of `revamp-tiered-plan.md`: paid users (any non-explorer plan, subscription
status or Stripe customer) plus unpaid users active in the last 30 days are copied from the legacy Prisma/Postgres
database into Supabase (`auth.users` + `profiles` + `projects` + storage). Everything else is dropped. The legacy
database is only ever **read** (`SET default_transaction_read_only = on` on the connection).

## Repo state found

- `core/dice/document.ts` already has `LegacyProjectRow`, `fromLegacyProjectRow`, `scaleCrop`, `nearestAspectRatio`,
  `documentStats` (A3). `supabase/functions/_shared/billing-snapshot.ts` is pure; `billing-sync.ts` only has type
  imports (`stripe`, `@supabase/supabase-js`) so it runs under Node with the npm `stripe` SDK injected — no port needed.
- Legacy schema (`git show master:prisma/schema.prisma`): `User` (`planType`, `subscriptionStatus`,
  `subscriptionExpiresAt`, `stripeCustomerId`, `stripeSubscriptionId`, `isPro`, `name`, `image`, timestamps) and
  `Project` (`originalImage` = raw upload data URL, dice params, `crop*`, `gridWidth/Height`, `currentX/Y`,
  `totalDice/completedDice/percentComplete`, timestamps). All 930 legacy accounts are Google (`Account.provider`).
- Legacy shape (read-only probe, 2026-09-30): 926 users / 932 projects; **110 selected users, 154 projects (6 without an
  image)**; plans creator 30 (all `subscriptionStatus='creator_pass'`, 3 unexpired) / lifetime 12 / studio 45 (33 active,
  12 canceled + lapsed); 87 Stripe customers, 0 `isPro && explorer`, 0 duplicate emails (case-insensitive); images are
  data URLs (jpeg 740, png 138, webp 15, avif 2, svg 2, heic 1; largest 4.3 MB); 1 user is over the plan limit by 1 project.
- The legacy uploader stored the file as-is (`readAsDataURL`, no downscale); the cropper worked in the browser-decoded
  pixel space of that original (`naturalWidth/Height`, EXIF auto-rotated). The new editor's crop is in stored-image
  (≤ 2048 px) coordinates, so every legacy crop is scaled by `stored / original`.

## Selection (read-only, `scripts/migrate/select.ts`)

```sql
select <User columns> from "User" u
where u."planType" <> 'explorer' or u."subscriptionStatus" is not null or u."stripeCustomerId" is not null
   or u."updatedAt" >= $1
   or exists (select 1 from "Project" p where p."userId" = u.id and p."updatedAt" >= $1)
  [and lower(u.email) = lower($2)]      -- --only=<email>
order by u."createdAt"
```

`$1` = `--since` (ISO date; default now − 30 days). `User.updatedAt` bumps on every login through the NextAuth adapter,
which is the intended "active" signal. Projects per user: `select * from "Project" where "userId" = $1 order by
"updatedAt" desc` (newest first, so a `--no-ignore-limit` run keeps the most recent ones).

## Mapping

Per user (`scripts/migrate/mapUser.ts`, pure, table-driven test):

| Legacy | New |
|---|---|
| `id` | `profiles.legacy_id`; `user_metadata.legacy_id` on the auth user |
| `email` (trimmed, lower-cased) | `auth.users.email` (`email_confirm: true`) → `profiles.email` via `handle_new_user` |
| `name`, `image` | `user_metadata.full_name`, `user_metadata.avatar_url` → `profiles.name`, `avatar_url` (trigger) |
| `createdAt` | `profiles.created_at` (explicit update after the trigger created the row); `updated_at` is set by the trigger |
| `planType='lifetime'` | `plan='lifetime'`, `stripe_customer_id`; everything else null |
| `planType='creator'` **or** `subscriptionStatus='creator_pass'` | `plan='creator'`, `plan_expires_at=subscriptionExpiresAt`, `subscription_status=null`, `stripe_subscription_id=null` (a pass is not a subscription), `stripe_customer_id` |
| `planType='studio'` | `plan='studio'`, `stripe_subscription_id`, `subscription_status` (raw: active/canceled/…), `current_period_end=subscriptionExpiresAt`, `stripe_customer_id` |
| anything else | `plan='explorer'`, `stripe_customer_id` kept (portal access); other billing columns null |
| — | `cancel_at`, `synced_at` null until the Stripe sync fills them |

`isPro`, `proSince`, `birthday`, `commissionInterest`, `emailVerified`, `Account`, `Session` are dropped. A lapsed studio
row (`canceled`) keeps `plan='studio'` + `subscription_status='canceled'`; `deriveEntitlements`/`effective_plan` derive
explorer from it, and `cancel_at` only appears once the live-mode Stripe sync runs (F2).

Per project (`scripts/migrate/mapProject.ts`):

| Legacy | New |
|---|---|
| `id` | `projects.legacy_id` |
| `name` | `name` (blank → `Untitled Project`) |
| `originalImage` (data URL) | decoded → `sharp(buf).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 })` → storage `{owner_id}/{id}/original.jpg` (`image_path`) |
| `numRows, colorMode, contrast, gamma, edgeSharpening, rotate6/3/2, gridWidth/Height, currentX/Y, crop*` | `document` = `fromLegacyProjectRow(row)` (normalized/clamped, `schemaVersion: 1`), then `crop = scaleCrop(crop, factor)` |
| `totalDice`, `completedDice`, `percentComplete` | `total_dice`/`completed_dice = documentStats(document)`; `percent_complete` is generated |
| `createdAt`, `updatedAt` | inserted explicitly (the `set_updated_at` trigger is BEFORE UPDATE only, verified in the migration) |
| — | `id = randomUUID()`, `owner_id`, `cloud_version` default 1 |

`factor = outputWidth / autoRotatedOriginalWidth` where the auto-rotated size swaps width/height for EXIF orientations
5–8 (`sharp.metadata()`; browsers decode with `image-orientation: from-image`, so the legacy crop was in the rotated
space). Rows without an image are skipped (a project needs an image). A crop scaled by the factor that fails validation
(never in the probe) falls back to `crop: null` and step `crop`.

## Idempotency

- User: profile by `legacy_id`, else by `lower(email)`, else `auth.admin.createUser` (if GoTrue answers `email_exists`
  the auth user is looked up by email and adopted). The profile patch is applied on every run (safe: same values), so a
  rerun re-stamps `legacy_id` on a profile that was matched by email.
- Project: `projects.legacy_id` unique — existing rows are skipped (`skipped_existing`), the image is not re-uploaded.
- The storage upload uses `upsert: true` and happens **before** the insert; an insert failure removes the object.
- Project limit: `--ignore-limit` (default **on**) wraps each insert in a transaction that disables
  `projects_enforce_limit` and re-enables it (needs the table owner = `postgres` on `TARGET_DATABASE_URL`). Limits are
  only enforced on create, so an over-limit user keeps everything and simply cannot add more. `--no-ignore-limit` lets
  the trigger reject the oldest projects (counted as `skipped_over_limit`).

## Stripe sync from Node

`stripe@20.4.1` is a devDependency (exact, the Deno pin) and the script calls `syncBillingFromStripe(admin, stripe,
{ profileId }, now)` from `_shared/billing-sync.ts` directly (`tsx` resolves its `.ts` imports; the module has no Deno
API). Client: `new Stripe(key, { apiVersion: '2026-02-25.clover' })` (the `_shared/stripe.ts` pin; the SDK types the
literal so a drift fails `typecheck`). The key comes from `supabase/functions/.env` `STRIPE_SECRET_KEY`; the script prints
its mode. With a test key every legacy customer id (live mode) answers `resource_missing` → logged as `customer not
found in this Stripe mode`, counted as `stripe.not_found`, and the mapped columns stay (the sync writes nothing when a
Stripe call throws). Off with `--no-sync-stripe`; never called in `--dry-run`.

## CLI

`npm run migrate:legacy -- [--dry-run] [--since=YYYY-MM-DD] [--only=<email>] [--no-sync-stripe] [--no-ignore-limit]
[--report=<file.json>] [--report-emails] [--target=hosted]`

Env (`scripts/migrate/env.ts`, `util.parseEnv`, nothing hardcoded): `LEGACY_DATABASE_URL` (process env or `.env.local`;
falls back to `DATABASE_URL` with a warning); `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TARGET_DATABASE_URL`
(process env; when unset and the target is local they are read from `supabase status -o env`); `STRIPE_SECRET_KEY`
(process env, else `supabase/functions/.env` — never `.env.local`'s legacy key). Guards: refuses a non-local
`SUPABASE_URL` without `--target=hosted`; refuses `--target=hosted` with an `sk_test_` key.

Dry run does every read (selection, image decode + resize in memory, document mapping, existing-row lookups) and no
write (no auth user, no upload, no insert, no Stripe call). Output, both modes:

```
users     selected 110 | created 0 | existed(legacy_id) 0 | existed(email) 0 | updated 0 | failed 0
projects  selected 154 | migrated 0 | skipped: no-image 6, existing 0, over-limit 0 | failed 0
storage   uploaded 0 B (would upload 61.2 MB)
stripe    synced 0 | not-found 0 | errors 0 | skipped 87 (dry-run)
```

`--report=<file>` writes `{ generatedAt, dryRun, counts, users: [{ legacyId, profileId, action, plan, stripe, projects:
[{ legacyId, projectId, action, reason? }] }] }`; emails only with `--report-emails`.

## Rehearsal (local stack, 2026-09-30) — results

1. `npm run db:start && npm run db:reset`.
2. `--dry-run`: users selected 110 (would create 110); projects selected 154 → migrated 148, skipped no-image 6, failed 0;
   would upload 30.8 MB; Stripe skipped 87 (dry-run). Matches the read-only probe.
3. Real run: created 110 / updated 110 / failed 0; migrated 148 (30.8 MB uploaded), no-image 6, over-limit 0, failed 0;
   Stripe not-found 87 (test key vs live customer ids; columns kept), errors 0. Rerun: created 0, existed(legacy_id) 110,
   updated 110; migrated 0, skipped existing 148, uploaded 0 B — a no-op apart from the (idempotent) profile patch.
4. Spot checks (psql on the local DB, counts only): `auth.users` 110 (all confirmed, all with `legacy_id` metadata, 110
   email identities); `profiles` 110 with `legacy_id`, 87 with a customer id, `synced_at` null (sync never wrote);
   lifetime 12; studio/active 33 → `effective_plan` studio; studio/canceled 12 → `subscription_status='canceled'`,
   `current_period_end` set, `effective_plan` explorer; creator 30 with `plan_expires_at` (3 unexpired → `effective_plan`
   creator), `subscription_status` null; explorer 23. `projects` 148 = `storage.objects` 148, all paths
   `{owner}/{id}/original.jpg`, `schemaVersion` 1, 137 crops all with `aspectRatio`, `cloud_version` 1, trigger
   `projects_enforce_limit` re-enabled. Three objects downloaded through the admin client: JPEG, max side 948 px
   (≤ 2048), crops inside the image. Bulk comparison with the legacy rows: `created_at`/`updated_at` identical to the
   millisecond for 148/148 projects and `created_at` for 110/110 profiles, `plan_expires_at`/`current_period_end` =
   `subscriptionExpiresAt` for 110/110; `percent_complete` within 0.5 of legacy `percentComplete` for 128/148 — the other
   20 had legacy `completedDice = 0` while `currentX/Y` recorded progress, and the new value is derived from the progress
   (recorded in agent-suggestions).
5. Stripe: 87× `customer not found in this Stripe mode (test)`; the legacy-mapped columns survived (checked above).
6. Google linking: manual browser step for the user (`docs/DEPLOY.md` → "Google-linking check").
7. `npm run typecheck && npm test && npm run lint && npm run build` → all 0.

Found and fixed during the rehearsal: node-postgres parses the legacy `timestamp(3)` (no zone, UTC) columns as local
time, which shifted every timestamp by the machine's UTC offset (2 h) — `parseLegacyTimestamp` is installed as the OID
1114 parser (tested). `pg` v8 also warns about `sslmode=require`; the script strips it from non-loopback URLs and passes
`ssl` explicitly.

## Cut-over notes for F2

- Freeze the old site first (`User.updatedAt` keeps moving while logins are possible; `--since` is evaluated at run time).
- Env for the hosted run: `SUPABASE_URL=https://<ref>.supabase.co`, `SUPABASE_SERVICE_ROLE_KEY`, `TARGET_DATABASE_URL`
  (the project's direct/pooler URL as `postgres`, needed for the trigger toggle and the explicit `created_at`), `STRIPE_SECRET_KEY=sk_live_…`
  in the environment, `LEGACY_DATABASE_URL` in `.env.local`; `--target=hosted`. Dry-run, then the real run, then a rerun
  (must be a no-op); keep the `--report` files.
- Live sync fills `cancel_at`/`current_period_end`/`plan_expires_at` from Stripe for the 87 customers; a studio user
  canceled in the dashboard shows `cancel_at` after it.
- Only "paid or active" users are copied; anyone else signs in with Google and starts fresh (explorer).
- Google identity linking for admin-created users is verified manually before the hosted run (see `docs/DEPLOY.md`).
  Supabase docs (Identity linking → Automatic linking): "Supabase Auth automatically links identities with the same email
  address to a single user. […] When a new user signs in with OAuth, Supabase Auth will attempt to look for an existing
  user that uses the same email address. If a match is found, the new identity is linked to the user." and "It would also
  be an insecure practice to automatically link an identity to a user with an unverified email address since that could
  lead to pre-account takeover attacks." The page does not mention admin-created users; `email_confirm: true` marks the
  migrated address confirmed and Google reports verified emails, so linking is expected — hence the manual check.
  Fallback: manual linking (`GOTRUE_SECURITY_MANUAL_LINKING_ENABLED` / dashboard toggle).
