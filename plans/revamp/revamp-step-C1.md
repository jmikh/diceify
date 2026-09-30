# Step C1 — Supabase scaffold + schema

Scope (tiered plan): `supabase/config.toml`, `migrations/<ts>_initial_schema.sql` (full DDL, RLS, triggers, storage policies),
`seed.sql`, generated `lib/supabase/database.types.ts`, `lib/env.public.ts`, `.env.example` rewritten, npm `db:*` scripts,
`docs/DEPLOY.md` skeleton. No client code (C2/C3). The legacy `.env.local` + Prisma app keep working untouched.

## Repo state found

- No `supabase/`, `docs/`, or `lib/supabase/` yet. `lib/` holds the Prisma-era `auth/prisma/stripe/subscription.ts` plus `image/`.
- Supabase CLI 2.84.2 (Homebrew). `supabase init` (non-interactive by default; `-i` enables the IDE prompts) writes a
  config.toml with `[auth] site_url = "http://127.0.0.1:3000"`, `[analytics] enabled = true`, `[storage] file_size_limit = "50MiB"`.
- **The recordio stack is running on the default ports 54321–54324/54327** (kong, db, studio, inbucket, analytics). Two local
  stacks cannot share ports, and stopping the user's other project from a build step is not acceptable, so diceify gets its own
  port block (design change, see below).
- `core/billing/entitlements.ts` already carries the "MUST be mirrored by SQL" comment; `plans.ts` limits: explorer 1, creator 1,
  studio 5, lifetime 5.

## Decisions

### Ports (design change)

| Service | recordio (default) | diceify |
|---|---|---|
| API (kong) | 54321 | **54331** |
| Postgres | 54322 | **54332** |
| shadow db | 54320 | **54330** |
| Studio | 54323 | **54333** |
| Inbucket | 54324 | **54334** |
| pooler (disabled) | 54329 | 54339 |
| analytics (disabled) | 54327 | 54337 |
| edge inspector | 8083 | 8093 |

Local URL is therefore `http://127.0.0.1:54331`; the plan's "Client data access"/E1 texts that say 54321 are updated.

### config.toml

- `project_id = "diceify"`; `[auth] site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/**"]`.
- `[auth.external.google] enabled = true, client_id = "env(GOOGLE_CLIENT_ID)", secret = "env(GOOGLE_CLIENT_SECRET)",
  skip_nonce_check = true` — supabase-js's `signInWithOAuth` PKCE flow does not send a nonce, and the local GoTrue rejects Google
  ID tokens whose nonce does not match; the hosted dashboard has the same toggle. Values come from `supabase/.env` (gitignored).
- `[analytics] enabled = false` (slower boot, unused). `[storage] file_size_limit = "10MiB"` (global ceiling = bucket ceiling).
  `[edge_runtime]`, `[studio]`, `[inbucket]`, `[realtime]` left enabled.
- Bucket is created **in the migration** (`insert into storage.buckets … on conflict do nothing`) so `db push` creates it on
  the hosted project too; no `[storage.buckets.*]` entry (the CLI would otherwise seed it a second time and — on newer CLIs —
  try to manage its attributes).
- `[functions.stripe-webhook] verify_jwt = false` is committed **commented out**: tested on 2.84, `supabase start` boots but
  logs `WARN: failed to read file: .../stripe-webhook/index.ts` twice per start while the folder is missing. D1 uncomments it.
  A missing `supabase/.env` is silent (empty Google credentials) — also recorded in agent-suggestions.

### Migration `supabase/migrations/20260930110540_initial_schema.sql`

The plan's DDL verbatim plus the parts it only described in comments:

- `bump_cloud_version()` — `new.cloud_version := old.cloud_version + 1` unconditionally (a client-supplied value is discarded).
- `handle_user_email_change()` — `after update of email on auth.users` → `update profiles set email = new.email`.
- `effective_plan(profiles)` / `project_limit(text)` — same priority, statuses and strict `>` as `deriveEntitlements`; comment
  points at `core/billing/entitlements.ts` (and vice versa, already there). `project_limit` is a `case` over all four plans.
- `enforce_project_limit()` — `security definer`, `set search_path = ''`, `raise exception 'PROJECT_LIMIT' using errcode =
  'P0001', detail = '{"current":n,"limit":m}'`; the owner's profile row is read `for update` first so two concurrent inserts
  by the same user serialize on it and the second one sees the first one's count.
- `image_path_in_owner_folder` CHECK; `projects_owner_updated_idx (owner_id, updated_at desc)`; `set_updated_at` triggers.
- Trigger order on `projects` update: `projects_bump_version` and `projects_set_updated_at` both `before update`, both fine
  in any order (independent columns).
- RLS: `profiles` select-own only (`to authenticated`); `projects` select/insert/update/delete own. `anon` gets nothing because
  every policy is `to authenticated` (verified by REST below). No explicit revokes needed: Supabase's default grants stay, RLS gates.
- Storage: bucket `project-images` (private, 10 MiB, jpeg/webp/png) + 4 `storage.objects` policies (`select` included — needed
  for upsert, recordio finding 2026-07-24), all `bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text)`.
- Naming follows recordio's rules (`YYYYMMDDHHMMSS_`, `if not exists` where the DDL supports it; one greenfield file).

### Env layout

| File | Contents | Git |
|---|---|---|
| `.env.local` | legacy Prisma/NextAuth vars (until C3) **plus** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN` | ignored |
| `.env.example` | rewritten: the four public vars with local values + pointers to the two secret files | committed |
| `supabase/.env` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (read by `env(...)` in config.toml) | ignored |
| `supabase/functions/.env` | Stripe secrets (D1) | ignored |

`lib/env.public.ts`: literal `process.env.NEXT_PUBLIC_*` reads (Next inlines them), zod schema, **lazy** validation via a
`Proxy`/getter so importing the module never throws at build time; throws with a clear message on first access of a missing var.

### Scripts / docs

`db:start`, `db:stop`, `db:reset`, `db:status`, `db:migration` (`supabase migration new`), `db:push`, `db:types`
(`supabase gen types typescript --local --schema public > lib/supabase/database.types.ts`). CLI stays a Homebrew install
(documented in `docs/DEPLOY.md`); no `supabase` npm package. `docs/DEPLOY.md` skeleton with the five sections.
`.gitignore` gains `supabase/.temp`, `supabase/.branches`, `supabase/.env`, `supabase/.env.*`, `supabase/functions/.env*`.

## Verification (exact commands)

```sh
API=http://127.0.0.1:54331; eval "$(supabase status -o env | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
supabase start && supabase db reset                                     # 1
curl -s -X POST $API/auth/v1/admin/users -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' -d '{"email":"a@test.dev","password":"pass1234","email_confirm":true,"user_metadata":{"full_name":"A"}}'
psql "$DB_URL" -c "select id, email, name, plan from profiles"          # 2
psql "$DB_URL" <<SQL                                                    # 3
insert into projects (owner_id, document, image_path) values ('<A>', '{}', '<A>/11111111-1111-1111-1111-111111111111/original.jpg');
insert into projects (owner_id, document, image_path) values ('<A>', '{}', '<A>/22222222-2222-2222-2222-222222222222/original.jpg'); -- PROJECT_LIMIT
insert into projects (owner_id, document, image_path) values ('<A>', '{}', 'other/x/original.jpg');                                 -- CHECK
SQL
psql "$DB_URL" -c "update projects set name='x' returning cloud_version, updated_at"                  # 4: 2
psql "$DB_URL" -c "update projects set cloud_version=99 returning cloud_version"                       # 4: 3
psql "$DB_URL" -c "update projects set total_dice=100, completed_dice=25 returning percent_complete"   # 4: 25.00
# 5: create b@test.dev the same way; tokens:
JWT_A=$(curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' -d '{"email":"a@test.dev","password":"pass1234"}' | jq -r .access_token)
curl -s "$API/rest/v1/projects?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $JWT_B"      # []
curl -s "$API/rest/v1/projects?select=id" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $JWT_A"      # [{id}]
curl -s "$API/rest/v1/projects?select=id" -H "apikey: $ANON_KEY"                                        # []
curl -s -X PATCH "$API/rest/v1/projects?id=eq.<P>" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $JWT_B" -H 'Content-Type: application/json' -H 'Prefer: return=representation' -d '{"name":"hacked"}'   # []
curl -s -X PATCH "$API/rest/v1/profiles?id=eq.<A>" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $JWT_A" -H 'Content-Type: application/json' -H 'Prefer: return=representation' -d '{"plan":"studio"}'  # []
# 6: storage
curl -s -o /dev/null -w '%{http_code}' -X POST "$API/storage/v1/object/project-images/<A>/test/x.jpg" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $JWT_A" -H 'Content-Type: image/jpeg' --data-binary @file.jpg   # 200
curl … "$API/storage/v1/object/project-images/<B>/test/x.jpg" … Bearer $JWT_A …                                                                                                                             # 400/403
npm run db:types && npm run db:types && git diff --exit-code lib/supabase/database.types.ts   # 7
npm run typecheck && npm test && npm run lint && npm run build                                 # 8
supabase stop
```
