-- Phase 1-A: drippers, recipes, recipe_steps
-- Community columns (visibility, forked_from, like_count, save_count, search) are created now
-- and used from Phase 5, so later phases never need to migrate existing rows.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- drippers: reference data, readable by everyone, written only via migrations/seed
-- ---------------------------------------------------------------------------

create table public.drippers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 50),
  brand text not null check (char_length(brand) between 1 and 50),
  created_at timestamptz not null default now()
);

comment on table public.drippers is 'Brewing devices used to filter recipes.';

alter table public.drippers enable row level security;

create policy "drippers are readable by everyone"
  on public.drippers for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------

create type public.recipe_visibility as enum ('private', 'unlisted', 'public');

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  -- null only for official recipes; profiles(id) shares this id from Phase 3
  author_id uuid references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 2000),
  dripper_id uuid not null references public.drippers (id) on delete restrict,
  dose_g numeric(5, 1) not null check (dose_g > 0 and dose_g <= 200),
  -- total water ÷ dose (e.g. 16.0 means 1:16)
  ratio numeric(6, 3) not null check (ratio >= 1 and ratio <= 30),
  water_temp_c smallint check (water_temp_c between 60 and 100),
  grind_text text check (char_length(grind_text) <= 100),
  total_time_s integer not null check (total_time_s > 0 and total_time_s <= 3600),
  -- attribution for well-known recipes: numbers only, description written in-house
  source_name text check (char_length(source_name) <= 100),
  source_url text check (source_url ~ '^https?://'),
  visibility public.recipe_visibility not null default 'private',
  is_official boolean not null default false,
  forked_from uuid references public.recipes (id) on delete set null,
  like_count integer not null default 0 check (like_count >= 0),
  save_count integer not null default 0 check (save_count >= 0),
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_official_has_no_author check (
    (is_official and author_id is null) or (not is_official and author_id is not null)
  ),
  constraint recipes_official_is_public check (not is_official or visibility = 'public'),
  constraint recipes_not_forked_from_self check (forked_from is distinct from id)
);

comment on column public.recipes.ratio is 'Total water divided by dose (water_g / dose_g).';
comment on column public.recipes.search is 'Full-text search vector; GIN index is added in Phase 5.';

create index recipes_dripper_id_idx on public.recipes (dripper_id);
create index recipes_author_id_idx on public.recipes (author_id);
create index recipes_visibility_created_at_idx on public.recipes (visibility, created_at desc);
create index recipes_forked_from_idx on public.recipes (forked_from);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

-- public/unlisted are readable by anyone with the id; feeds must filter visibility = 'public' themselves.
create policy "recipes are readable when public, unlisted, or own"
  on public.recipes for select
  to anon, authenticated
  using (visibility in ('public', 'unlisted') or author_id = (select auth.uid()));

create policy "users can create their own recipes"
  on public.recipes for insert
  to authenticated
  with check (author_id = (select auth.uid()) and not is_official);

create policy "users can update their own recipes"
  on public.recipes for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and not is_official);

create policy "users can delete their own recipes"
  on public.recipes for delete
  to authenticated
  using (author_id = (select auth.uid()));

-- Column privileges: counters, search and official flag are never client-writable.
-- like_count/save_count are maintained by triggers (Phase 5); is_official only by service role.
revoke insert, update on public.recipes from anon, authenticated;
grant insert (
  author_id, title, description, dripper_id, dose_g, ratio, water_temp_c, grind_text,
  total_time_s, source_name, source_url, visibility, forked_from
) on public.recipes to authenticated;
grant update (
  title, description, dripper_id, dose_g, ratio, water_temp_c, grind_text,
  total_time_s, source_name, source_url, visibility
) on public.recipes to authenticated;

-- ---------------------------------------------------------------------------
-- recipe_steps: permissions follow the parent recipe
-- ---------------------------------------------------------------------------

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null check (position >= 0),
  label text not null check (char_length(label) between 1 and 50),
  start_at_s integer not null check (start_at_s >= 0 and start_at_s <= 3600),
  -- cumulative water poured by the end of this step ÷ dose
  water_ratio numeric(6, 3) not null check (water_ratio >= 0 and water_ratio <= 30),
  note text check (char_length(note) <= 500),
  constraint recipe_steps_recipe_position_key unique (recipe_id, position)
);

comment on column public.recipe_steps.water_ratio is 'Cumulative water at the end of this step divided by recipes.dose_g.';

alter table public.recipe_steps enable row level security;

-- The subquery on recipes is itself filtered by the recipes select policy.
create policy "steps are readable when the recipe is"
  on public.recipe_steps for select
  to anon, authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));

create policy "authors can create steps"
  on public.recipe_steps for insert
  to authenticated
  with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid()))
  );

create policy "authors can update steps"
  on public.recipe_steps for update
  to authenticated
  using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid()))
  );

create policy "authors can delete steps"
  on public.recipe_steps for delete
  to authenticated
  using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid()))
  );

revoke insert, update on public.recipe_steps from anon;
