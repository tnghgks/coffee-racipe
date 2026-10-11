-- Phase 4: personal brew logs. Private to their owner — no one else can read them.

create type public.roast_level as enum ('light', 'medium_light', 'medium', 'medium_dark', 'dark');

create table public.brew_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- kept when the recipe is deleted, so the log survives as a free-form entry
  recipe_id uuid references public.recipes (id) on delete set null,
  bean_name text check (char_length(bean_name) <= 100),
  roaster text check (char_length(roaster) <= 100),
  roast_level public.roast_level,
  dose_g numeric(5, 1) not null check (dose_g > 0 and dose_g <= 200),
  -- all water in the cup (hot water + ice when iced)
  water_g integer not null check (water_g > 0 and water_g <= 6000),
  iced boolean not null default false,
  grind_text text check (char_length(grind_text) <= 100),
  water_temp_c smallint check (water_temp_c between 60 and 100),
  total_time_s integer check (total_time_s > 0 and total_time_s <= 3600),
  rating smallint not null check (rating between 1 and 5),
  acidity smallint check (acidity between 1 and 5),
  sweetness smallint check (sweetness between 1 and 5),
  body smallint check (body between 1 and 5),
  notes text check (char_length(notes) <= 2000),
  next_adjustment text check (char_length(next_adjustment) <= 500),
  brewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.brew_logs.water_g is 'Total water in the cup, including ice for iced brews.';
comment on column public.brew_logs.next_adjustment is 'What to change next time; surfaced on the recipe page.';

create index brew_logs_user_brewed_at_idx on public.brew_logs (user_id, brewed_at desc);
create index brew_logs_user_recipe_idx on public.brew_logs (user_id, recipe_id, brewed_at desc);

create trigger brew_logs_set_updated_at
  before update on public.brew_logs
  for each row execute function public.set_updated_at();

alter table public.brew_logs enable row level security;

create policy "users read their own logs"
  on public.brew_logs for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "users create their own logs"
  on public.brew_logs for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update their own logs"
  on public.brew_logs for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users delete their own logs"
  on public.brew_logs for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Logs are never visible to anonymous visitors; owners can't move a log to another user.
revoke all on public.brew_logs from anon;
revoke update on public.brew_logs from authenticated;
grant update (
  recipe_id, bean_name, roaster, roast_level, dose_g, water_g, iced, grind_text, water_temp_c,
  total_time_s, rating, acidity, sweetness, body, notes, next_adjustment, brewed_at
) on public.brew_logs to authenticated;
