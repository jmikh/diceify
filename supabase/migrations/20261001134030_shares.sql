-- H1: public share links for dice art (plans/revamp/revamp-step-H1.md). A share is an immutable snapshot: a row
-- (who, which grid size) plus its social card image `share-images/<id>.jpg` in a PUBLIC bucket, so X/Facebook
-- crawlers can fetch it. There is no unshare (user decision): no update/delete policies anywhere.
--
-- Order of writes (client, lib/supabase/shares.ts): insert the row, then upload the image; the storage insert
-- policy requires the caller's own row. A failed upload leaves a row that `get_share` hides (no image object).

create table if not exists public.shares (
  id text primary key constraint share_id_format check (id ~ '^[a-km-np-z2-9]{10}$'),  -- core/share/ids.ts
  owner_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,                  -- the share outlives its project
  grid_cols int not null check (grid_cols > 0),
  grid_rows int not null check (grid_rows > 0),
  created_at timestamptz not null default now()
);

create index if not exists shares_owner_idx on public.shares (owner_id);
create index if not exists shares_project_idx on public.shares (project_id);

-- RLS: the owner creates and reads their own rows; nobody updates or deletes. The public reads through get_share.
alter table public.shares enable row level security;

drop policy if exists shares_select_own on public.shares;
create policy shares_select_own on public.shares
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists shares_insert_own on public.shares;
create policy shares_insert_own on public.shares
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (project_id is null or exists (
      select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())
    ))
  );

-- ---------------------------------------------------------------------------------------------------
-- Storage: public bucket (anyone with the URL can fetch an object; listing needs a SELECT policy, so nobody can
-- enumerate). Object names are `<share id>.jpg`: no user id in public URLs.
-- ---------------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('share-images', 'share-images', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

-- Upload only for an own share row; `upsert` is impossible without update/select policies, so an image never changes.
drop policy if exists share_images_insert_own on storage.objects;
create policy share_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'share-images'
    and exists (
      select 1 from public.shares s
      where s.owner_id = (select auth.uid()) and storage.objects.name = s.id || '.jpg'
    )
  );

-- ---------------------------------------------------------------------------------------------------
-- Public read: one share by id (the Pages Function's meta tags), only once its image exists. No owner data.
-- ---------------------------------------------------------------------------------------------------

create or replace function public.get_share(share_id text)
returns table (id text, grid_cols int, grid_rows int, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.grid_cols, s.grid_rows, s.created_at
  from public.shares s
  where s.id = share_id
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'share-images' and o.name = s.id || '.jpg'
    );
$$;

revoke all on function public.get_share(text) from public;
grant execute on function public.get_share(text) to anon, authenticated;
