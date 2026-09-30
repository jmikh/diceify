-- C3: a project's image is immutable (plan → Decisions → Images). The client never sends image_path or
-- owner_id on update; this makes it a guarantee rather than a convention. "Different photo" = new project.

create or replace function public.reject_project_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.image_path <> old.image_path or new.owner_id <> old.owner_id then
    raise exception 'IMAGE_PATH_IMMUTABLE' using errcode = 'P0001',
      detail = 'projects.image_path and projects.owner_id cannot change; create a new project instead';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_image_path_immutable on public.projects;
create trigger projects_image_path_immutable
  before update on public.projects
  for each row execute function public.reject_project_identity_change();
