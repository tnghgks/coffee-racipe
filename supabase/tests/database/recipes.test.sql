-- RLS, column privileges, and seed integrity for drippers / recipes / recipe_steps.
-- Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

-- ---------------------------------------------------------------------------
-- Fixtures: two users, each with a private / unlisted / public recipe
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'bob@test.local');

insert into public.recipes (id, author_id, title, dripper_id, dose_g, ratio, total_time_s, visibility)
select v.id::uuid, '11111111-1111-4111-8111-111111111111', v.title,
       (select id from public.drippers where slug = 'v60'), 15, 16, 180, v.visibility::public.recipe_visibility
from (values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alice private', 'private'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'alice unlisted', 'unlisted'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'alice public', 'public')
) as v(id, title, visibility);

insert into public.recipe_steps (recipe_id, position, label, start_at_s, water_ratio) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 0, '뜸', 0, 2),
  ('aaaaaaaa-0000-4000-8000-000000000003', 0, '뜸', 0, 2);

-- ---------------------------------------------------------------------------
-- Seed integrity (as postgres, RLS bypassed)
-- ---------------------------------------------------------------------------

select ok(
  (select count(*) from public.recipes where is_official) >= 10,
  'at least 10 official recipes are seeded'
);

select bag_has(
  $$ select d.slug from public.recipes r join public.drippers d on d.id = r.dripper_id where r.is_official $$,
  $$ values ('v60'), ('kalita-wave'), ('origami'), ('chemex') $$,
  'official recipes cover V60, Kalita Wave, Origami and Chemex'
);

select is_empty(
  $$ select slug from public.drippers where max_dose_g is null or size_label is null $$,
  'every seeded dripper has a capacity'
);

select is_empty(
  $$ select r.id from public.recipes r where r.is_official and not exists (
       select 1 from public.recipe_steps s where s.recipe_id = r.id) $$,
  'every official recipe has steps'
);

select is_empty(
  $$ select r.id from public.recipes r
     join lateral (
       select s.water_ratio from public.recipe_steps s where s.recipe_id = r.id order by s.position desc limit 1
     ) last_step on true
     where r.is_official and last_step.water_ratio <> r.ratio $$,
  'every official recipe ends at its total ratio'
);

select is_empty(
  $$ select s.id from public.recipe_steps s
     join public.recipe_steps prev on prev.recipe_id = s.recipe_id and prev.position = s.position - 1
     where s.water_ratio < prev.water_ratio or s.start_at_s < prev.start_at_s $$,
  'step water and start time never decrease'
);

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select ok((select count(*) from public.drippers) >= 4, 'anon can read drippers');
select ok((select count(*) from public.recipes where is_official) >= 10, 'anon can read official recipes');
select is_empty(
  $$ select id from public.recipes where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'anon cannot read a private recipe'
);
select isnt_empty(
  $$ select id from public.recipes where id = 'aaaaaaaa-0000-4000-8000-000000000002' $$,
  'anon can open an unlisted recipe by id'
);
select is_empty(
  $$ select id from public.recipe_steps where recipe_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'anon cannot read steps of a private recipe'
);
select isnt_empty(
  $$ select id from public.recipe_steps where recipe_id = 'aaaaaaaa-0000-4000-8000-000000000003' $$,
  'anon can read steps of a public recipe'
);
select throws_ok(
  $$ insert into public.recipes (author_id, title, dripper_id, dose_g, ratio, total_time_s)
     values (null, 'x', (select id from public.drippers limit 1), 15, 16, 180) $$,
  '42501', null, 'anon cannot create recipes'
);

-- ---------------------------------------------------------------------------
-- Bob (another signed-in user)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select is_empty(
  $$ select id from public.recipes where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'another user cannot read a private recipe'
);

update public.recipes set title = 'hacked' where id = 'aaaaaaaa-0000-4000-8000-000000000003';
delete from public.recipes where id = 'aaaaaaaa-0000-4000-8000-000000000003';
select results_eq(
  $$ select title from public.recipes where id = 'aaaaaaaa-0000-4000-8000-000000000003' $$,
  $$ values ('alice public'::text) $$,
  'another user cannot update or delete a recipe'
);

select throws_ok(
  $$ insert into public.recipes (author_id, title, dripper_id, dose_g, ratio, total_time_s)
     values ('11111111-1111-4111-8111-111111111111', 'impersonated', (select id from public.drippers limit 1), 15, 16, 180) $$,
  '42501', null, 'cannot create a recipe as someone else'
);

select throws_ok(
  $$ insert into public.recipe_steps (recipe_id, position, label, start_at_s, water_ratio)
     values ('aaaaaaaa-0000-4000-8000-000000000003', 1, '침입', 30, 5) $$,
  '42501', null, 'cannot add steps to someone else''s recipe'
);

select throws_ok(
  $$ insert into public.recipes (author_id, title, dripper_id, dose_g, ratio, total_time_s, is_official)
     values ('22222222-2222-4222-8222-222222222222', 'fake official', (select id from public.drippers limit 1), 15, 16, 180, true) $$,
  '42501', null, 'users cannot create official recipes'
);

-- ---------------------------------------------------------------------------
-- Alice (the author)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select isnt_empty(
  $$ select id from public.recipes where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'author can read own private recipe'
);

select lives_ok(
  $$ update public.recipes set title = 'alice private v2' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'author can update own recipe'
);

select throws_ok(
  $$ update public.recipes set like_count = 999 where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null, 'like_count is not client-writable'
);

select throws_ok(
  $$ update public.recipes set is_official = true where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null, 'is_official is not client-writable'
);

update public.recipes set title = 'official hijack' where id = '00000000-0000-4000-8000-000000000001';
reset role;
select results_eq(
  $$ select title from public.recipes where id = '00000000-0000-4000-8000-000000000001' $$,
  $$ values ('V60 울티밋 레시피'::text) $$,
  'users cannot modify official recipes'
);

select * from finish();
rollback;
