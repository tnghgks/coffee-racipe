-- Phase 5-C: likes, saves and fork counts.

-- ---------------------------------------------------------------------------
-- Counters must not touch updated_at ("내 레시피" is ordered by it), so the timestamp trigger now fires
-- only when an author-editable column is assigned.
-- ---------------------------------------------------------------------------

drop trigger recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update of title, description, dripper_id, dose_g, ratio, water_temp_c, grind_text, total_time_s,
    source_name, source_url, source_note, visibility
  on public.recipes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- recipe_likes / recipe_saves: one row per (user, recipe). The primary key makes a repeated like a no-op,
-- and the counters below change by ±1 per row inside the same transaction, so they can't drift.
-- ---------------------------------------------------------------------------

create table public.recipe_likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
create index recipe_likes_recipe_id_idx on public.recipe_likes (recipe_id);

create table public.recipe_saves (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
create index recipe_saves_recipe_id_idx on public.recipe_saves (recipe_id);
-- "/me/saved" lists newest first
create index recipe_saves_user_created_idx on public.recipe_saves (user_id, created_at desc);

alter table public.recipe_likes enable row level security;
alter table public.recipe_saves enable row level security;

-- Rows are private: everyone sees the totals on recipes, only you see what you liked or saved.
create policy "users read their own likes" on public.recipe_likes for select
  to authenticated using (user_id = (select auth.uid()));
create policy "users like recipes they can see" on public.recipe_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "users remove their own likes" on public.recipe_likes for delete
  to authenticated using (user_id = (select auth.uid()));

create policy "users read their own saves" on public.recipe_saves for select
  to authenticated using (user_id = (select auth.uid()));
create policy "users save recipes they can see" on public.recipe_saves for insert
  to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "users remove their own saves" on public.recipe_saves for delete
  to authenticated using (user_id = (select auth.uid()));

-- user_id comes from the default (auth.uid()); clients only choose the recipe. No updates.
revoke all on public.recipe_likes, public.recipe_saves from anon, authenticated;
grant select, delete on public.recipe_likes, public.recipe_saves to authenticated;
grant insert (recipe_id) on public.recipe_likes, public.recipe_saves to authenticated;

-- ---------------------------------------------------------------------------
-- Counters. security definer: clients have no UPDATE grant on the count columns.
-- `count = count ± 1` takes the recipe's row lock, so concurrent likes serialize instead of racing.
-- ---------------------------------------------------------------------------

create or replace function public.update_recipe_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer;
  target uuid;
begin
  if tg_op = 'INSERT' then
    delta := 1;
    target := new.recipe_id;
  else
    delta := -1;
    target := old.recipe_id;
  end if;

  if tg_table_name = 'recipe_likes' then
    update public.recipes set like_count = greatest(like_count + delta, 0) where id = target;
  else
    update public.recipes set save_count = greatest(save_count + delta, 0) where id = target;
  end if;
  return null;
end;
$$;

create trigger recipe_likes_count
  after insert or delete on public.recipe_likes
  for each row execute function public.update_recipe_reaction_count();
create trigger recipe_saves_count
  after insert or delete on public.recipe_saves
  for each row execute function public.update_recipe_reaction_count();

-- ---------------------------------------------------------------------------
-- Forks: counted on the original. forked_from is set on insert only (no UPDATE grant), and becomes null
-- when the original is deleted, so insert/delete of the fork are the only changes to count.
-- ---------------------------------------------------------------------------

alter table public.recipes add column fork_count integer not null default 0 check (fork_count >= 0);
update public.recipes p set fork_count = (select count(*) from public.recipes c where c.forked_from = p.id);

create or replace function public.update_recipe_fork_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.recipes set fork_count = fork_count + 1 where id = new.forked_from;
  else
    update public.recipes set fork_count = greatest(fork_count - 1, 0) where id = old.forked_from;
  end if;
  return null;
end;
$$;

create trigger recipes_fork_count_insert
  after insert on public.recipes
  for each row when (new.forked_from is not null)
  execute function public.update_recipe_fork_count();
create trigger recipes_fork_count_delete
  after delete on public.recipes
  for each row when (old.forked_from is not null)
  execute function public.update_recipe_fork_count();

-- A fork may only point at a recipe its author can see (otherwise anyone could bump a private recipe's
-- fork count or probe for ids). A policy can't query its own table (infinite recursion), so this is a
-- trigger. It is security invoker on purpose: the lookup runs under the caller's RLS.
create or replace function public.check_fork_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.recipes r where r.id = new.forked_from) then
    raise exception 'cannot fork a recipe you cannot see' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger recipes_check_fork_source
  before insert on public.recipes
  for each row when (new.forked_from is not null)
  execute function public.check_fork_source();

-- ---------------------------------------------------------------------------
-- One call to like/unlike/save/unsave. Takes the desired state (not a toggle), so repeated or
-- reordered requests converge, and returns the fresh totals for the button to show.
-- security invoker: the policies above decide what is allowed.
-- ---------------------------------------------------------------------------

create or replace function public.set_recipe_reaction(target uuid, kind text, active boolean)
returns table (likes integer, saves integer, liked boolean, saved boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  if kind = 'like' then
    if active then
      insert into public.recipe_likes (recipe_id) values (target) on conflict do nothing;
    else
      delete from public.recipe_likes l where l.user_id = me and l.recipe_id = target;
    end if;
  elsif kind = 'save' then
    if active then
      insert into public.recipe_saves (recipe_id) values (target) on conflict do nothing;
    else
      delete from public.recipe_saves s where s.user_id = me and s.recipe_id = target;
    end if;
  else
    raise exception 'unknown reaction %', kind using errcode = '22023';
  end if;

  return query
    select r.like_count,
           r.save_count,
           exists (select 1 from public.recipe_likes l where l.user_id = me and l.recipe_id = target),
           exists (select 1 from public.recipe_saves s where s.user_id = me and s.recipe_id = target)
    from public.recipes r
    where r.id = target;
end;
$$;

revoke execute on function public.set_recipe_reaction(uuid, text, boolean) from public, anon;
grant execute on function public.set_recipe_reaction(uuid, text, boolean) to authenticated;
