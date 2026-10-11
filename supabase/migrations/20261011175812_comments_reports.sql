-- Phase 5-D: comments (soft delete, rate limit), reports, and an admin role.

-- ---------------------------------------------------------------------------
-- Roles. Not in the profiles UPDATE grant, so only SQL/service role can promote someone.
-- ---------------------------------------------------------------------------

create type public.profile_role as enum ('user', 'admin');
alter table public.profiles add column role public.profile_role not null default 'user';

-- For RLS policies and the app. security definer so it works no matter how profiles' policies evolve.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.id = (select auth.uid())), false);
$$;

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft delete keeps the row (and its place in the thread, and any report about it) but drops the text.
  deleted_at timestamptz,
  constraint comments_body_check check (
    (deleted_at is null and char_length(btrim(body)) between 1 and 1000)
    or (deleted_at is not null and body = '')
  )
);

create index comments_recipe_created_idx on public.comments (recipe_id, created_at);
create index comments_user_created_idx on public.comments (user_id, created_at desc);

alter table public.comments enable row level security;

-- Visible wherever the recipe is (the subquery runs under the recipes select policy).
create policy "comments are readable with their recipe" on public.comments for select
  to anon, authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));

create policy "users comment on recipes they can see" on public.comments for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and deleted_at is null
    and exists (select 1 from public.recipes r where r.id = recipe_id)
  );

-- Edit or soft-delete your own comment; a deleted comment can't be changed again.
create policy "users edit their own comments" on public.comments for update
  to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null)
  with check (user_id = (select auth.uid()));

-- No hard deletes from clients.
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (recipe_id, body) on public.comments to authenticated;
grant update (body, deleted_at) on public.comments to authenticated;

-- Normalizes updates: deleting stamps the time and clears the text; editing bumps updated_at.
create or replace function public.prepare_comment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    new.deleted_at := now();
    new.body := '';
  elsif new.body is distinct from old.body then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger comments_prepare_update
  before update on public.comments
  for each row execute function public.prepare_comment_update();

-- Rate limit: at most 5 comments per user per minute. security definer so it counts every comment
-- (including ones on recipes the user can no longer see); the advisory lock makes parallel inserts
-- from the same user wait for each other instead of all passing the check at once.
create or replace function public.limit_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('comment_rate:' || new.user_id::text, 0));
  if (
    select count(*) from public.comments c
    where c.user_id = new.user_id and c.created_at > now() - interval '1 minute'
  ) >= 5 then
    raise exception 'too many comments' using errcode = 'P0429', hint = 'Wait a minute before commenting again.';
  end if;
  return new;
end;
$$;

create trigger comments_limit_rate
  before insert on public.comments
  for each row execute function public.limit_comment_rate();

-- ---------------------------------------------------------------------------
-- reports: anyone signed in can file one; only admins read and resolve them.
-- ---------------------------------------------------------------------------

create type public.report_target as enum ('recipe', 'comment');
create type public.report_reason as enum ('spam', 'abuse', 'copyright', 'other');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  -- recipe or comment id (polymorphic, so no foreign key; the target may later be deleted)
  target_id uuid not null,
  reason public.report_reason not null,
  detail text check (char_length(detail) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- one report per person per target
  unique (reporter_id, target_type, target_id)
);

create index reports_open_idx on public.reports (created_at desc) where status = 'open';

alter table public.reports enable row level security;

create policy "users file reports" on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

create policy "admins read reports" on public.reports for select
  to authenticated
  using ((select public.is_admin()));

create policy "admins resolve reports" on public.reports for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (target_type, target_id, reason, detail) on public.reports to authenticated;
grant update (status, resolved_at) on public.reports to authenticated;

-- The target must exist and be visible to the reporter. security invoker: the lookups run under the
-- reporter's RLS, so private recipes can't be probed.
create or replace function public.check_report_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not (
    (new.target_type = 'recipe' and exists (select 1 from public.recipes r where r.id = new.target_id))
    or (new.target_type = 'comment'
        and exists (select 1 from public.comments c where c.id = new.target_id and c.deleted_at is null))
  ) then
    raise exception 'report target not found' using errcode = 'P0002';
  end if;
  return new;
end;
$$;

create trigger reports_check_target
  before insert on public.reports
  for each row execute function public.check_report_target();
