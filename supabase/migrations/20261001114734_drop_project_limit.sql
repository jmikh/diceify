-- G1: projects are unlimited on every plan (user decision, 2026-10-01). The insert trigger, its function and the
-- plan → limit mapping go. `effective_plan` stays: it still mirrors core/billing/entitlements.ts and is handy for
-- support queries (e.g. "who is on studio right now").

drop trigger if exists projects_enforce_limit on public.projects;
drop function if exists public.enforce_project_limit();
drop function if exists public.project_limit(text);
