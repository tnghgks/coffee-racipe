-- Phase 3-A: public user profiles, created automatically on sign-up.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- null until the user picks one on first login (/me/setup)
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 50),
  avatar_url text check (avatar_url ~ '^https?://'),
  bio text check (char_length(bio) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.username is 'Public handle used in /u/[username]; lowercase letters, digits, underscore.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Profiles are public (author names on recipes, /u/[username] in Phase 5).
create policy "profiles are readable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Rows are only created by the trigger below; id can never change.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, bio) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Create a profile for every new auth user, pre-filled from the OAuth provider.
-- Google sends full_name/name + avatar_url/picture; Kakao sends name/nickname + avatar_url/picture.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := nullif(left(coalesce(meta ->> 'full_name', meta ->> 'name', meta ->> 'nickname', ''), 50), '');
  avatar text := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, name, case when avatar ~ '^https?://' then avatar end);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Let PostgREST embed authors: recipes.author_id → profiles.id (same ids as auth.users).
-- ---------------------------------------------------------------------------

alter table public.recipes
  add constraint recipes_author_id_profiles_fkey
  foreign key (author_id) references public.profiles (id) on delete cascade;
