-- Initial schema for the Supabase backend (revamp step C1).
-- Source of truth for the design: plans/revamp/revamp-tiered-plan.md → "Data model".
--
-- Tables: profiles (1:1 with auth.users, billing snapshot written only by the edge functions / migration
-- script via service role) and projects (owner-only CRUD from the browser under RLS). Storage bucket
-- `project-images` holds one immutable `{owner_id}/{project_id}/original.jpg` per project.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  -- Billing snapshot: written ONLY by the edge functions (service role) and the migration script.
  plan text not null default 'explorer' check (plan in ('explorer', 'creator', 'studio', 'lifetime')),
  plan_expires_at timestamptz,            -- creator pass end (monotonic: sync only raises it)
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  current_period_end timestamptz,
  cancel_at timestamptz,
  synced_at timestamptz,
  legacy_id text unique,                  -- old Prisma User.id (migration idempotency)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auth.users → profiles: create the row on sign-up, keep the email in sync.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end
$$;

create or replace trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------------------------------
-- Entitlements in SQL. MUST mirror core/billing/entitlements.ts (`deriveEntitlements`) and
-- core/billing/plans.ts (`PLAN_LIMITS.projectLimit`): same priority, same PRO statuses, same strict `>`
-- on the creator expiry. Change both together.
-- ---------------------------------------------------------------------------------------------------

create or replace function public.effective_plan(p public.profiles)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p.plan = 'lifetime' then 'lifetime'
    when p.plan = 'studio' and p.subscription_status in ('active', 'trialing', 'past_due') then 'studio'
    when p.plan = 'creator' and p.plan_expires_at > now() then 'creator'
    else 'explorer'
  end
$$;

create or replace function public.project_limit(plan text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case plan
    when 'studio' then 5
    when 'lifetime' then 5
    when 'creator' then 1
    else 1
  end
$$;

-- ---------------------------------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Untitled Project',
  document jsonb not null,                -- ProjectDocument (core/dice/document.ts); validated client-side, schemaVersion inside
  image_path text not null,               -- '{owner_id}/{id}/original.jpg' (immutable)
  total_dice int not null default 0,      -- projected from document by the client on write
  completed_dice int not null default 0,
  percent_complete numeric(5, 2) generated always as (
    case when total_dice > 0 then least(100, completed_dice * 100.0 / total_dice) else 0 end
  ) stored,
  cloud_version int not null default 1,   -- compare-and-set: update ... where cloud_version = expected
  legacy_id text unique,                  -- old Prisma Project.id (migration idempotency)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_path_in_owner_folder check (image_path like owner_id::text || '/%')
);

create index if not exists projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

create or replace trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- The client never sets cloud_version: any supplied value is discarded and the row goes to old + 1.
create or replace function public.bump_cloud_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cloud_version := old.cloud_version + 1;
  return new;
end
$$;

create or replace trigger projects_bump_version
  before update on public.projects
  for each row execute function public.bump_cloud_version();

-- Plan project limit. Raises PROJECT_LIMIT (errcode P0001) with a JSON detail the client can parse.
-- The owner's profile row is locked so two concurrent inserts by the same user cannot both pass the count.
create or replace function public.enforce_project_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
  n int;
  lim int;
begin
  select * into p from public.profiles where id = new.owner_id for update;
  select count(*) into n from public.projects where owner_id = new.owner_id;
  lim := public.project_limit(public.effective_plan(p));
  if n >= lim then
    raise exception 'PROJECT_LIMIT'
      using errcode = 'P0001',
            detail = format('{"current":%s,"limit":%s}', n, lim);
  end if;
  return new;
end
$$;

create or replace trigger projects_enforce_limit
  before insert on public.projects
  for each row execute function public.enforce_project_limit();

-- ---------------------------------------------------------------------------------------------------
-- Row level security: owner only. Every policy is `to authenticated`, so `anon` sees nothing.
-- ---------------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
-- No insert/update/delete policies: billing columns are written by the service role only.

alter table public.projects enable row level security;

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own on public.projects
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------------
-- Storage: private bucket, one folder per user. Created here (not in config.toml) so `db push` creates
-- it on the hosted project too.
-- ---------------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', false, 10485760, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

-- SELECT is required for upserts: storage-api compiles `x-upsert` to INSERT ... ON CONFLICT DO UPDATE and
-- Postgres runs the conflict-arbiter read through the SELECT policies (recordio finding, 2026-07-24).
drop policy if exists project_images_select_own on storage.objects;
create policy project_images_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists project_images_insert_own on storage.objects;
create policy project_images_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists project_images_update_own on storage.objects;
create policy project_images_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists project_images_delete_own on storage.objects;
create policy project_images_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
