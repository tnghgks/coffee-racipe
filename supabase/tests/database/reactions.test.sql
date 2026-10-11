-- Likes, saves and forks: RLS, column privileges, counters.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'bob@test.local'),
  ('33333333-3333-4333-8333-333333333333', 'carol@test.local');

insert into public.recipes (id, author_id, title, dripper_id, dose_g, ratio, total_time_s, visibility, updated_at)
select v.id::uuid, '11111111-1111-4111-8111-111111111111', v.title, (select id from public.drippers where slug = 'v60'),
       15, 16, 180, v.visibility::public.recipe_visibility, '2026-01-01'
from (values
  ('dddddddd-0000-4000-8000-0000000000d1', '반응 공개', 'public'),
  ('dddddddd-0000-4000-8000-0000000000d2', '반응 비공개', 'private')
) as v(id, title, visibility);

create temporary table fixture as
select jsonb_build_object(
  'title', '포크', 'dripper_slug', 'v60', 'dose_g', 15, 'ratio', 16, 'total_time_s', 180,
  'visibility', 'private', 'forked_from', 'dddddddd-0000-4000-8000-0000000000d1'
) as recipe,
'[{"label":"한 번에","start_at_s":0,"water_ratio":16}]'::jsonb as steps;
create temporary table forks (id uuid);
grant all on fixture, forks to authenticated;

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ select * from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d1', 'like', true) $$,
  '42501', null, 'anon cannot react'
);
select throws_ok($$ select * from public.recipe_likes $$, '42501', null, 'anon cannot read likes');

-- ---------------------------------------------------------------------------
-- Bob and Carol like the public recipe
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select results_eq(
  $$ select likes, liked from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d1', 'like', true) $$,
  $$ values (1, true) $$,
  'liking returns the new count and state'
);
select results_eq(
  $$ select likes, liked from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d1', 'like', true) $$,
  $$ values (1, true) $$,
  'liking twice is a no-op'
);

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select results_eq(
  $$ select likes from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d1', 'like', true) $$,
  $$ values (2) $$,
  'a second user adds to the count'
);
select results_eq(
  $$ select user_id from public.recipe_likes $$,
  $$ values ('33333333-3333-4333-8333-333333333333'::uuid) $$,
  'users see only their own likes'
);

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select results_eq(
  $$ select likes, liked from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d1', 'like', false) $$,
  $$ values (1, false) $$,
  'unliking decrements'
);
select results_eq(
  $$ select likes from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d1', 'like', false) $$,
  $$ values (1) $$,
  'unliking twice is a no-op'
);

select results_eq(
  $$ select saves, saved, liked from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d1', 'save', true) $$,
  $$ values (1, true, false) $$,
  'saving counts separately from likes'
);

-- ---------------------------------------------------------------------------
-- What Bob must not be able to do
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ select * from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d2', 'like', true) $$,
  '42501', null, 'cannot like a recipe you cannot see'
);
select throws_ok(
  $$ insert into public.recipe_likes (user_id, recipe_id)
     values ('33333333-3333-4333-8333-333333333333', 'dddddddd-0000-4000-8000-0000000000d1') $$,
  '42501', null, 'cannot like on behalf of someone else'
);
select throws_ok(
  $$ update public.recipes set like_count = 999 where id = 'dddddddd-0000-4000-8000-0000000000d1' $$,
  '42501', null, 'cannot write counters directly'
);
select throws_ok(
  $$ select * from public.set_recipe_reaction('dddddddd-0000-4000-8000-0000000000d1', 'boost', true) $$,
  '22023', null, 'unknown reaction kinds are rejected'
);
-- RLS hides other users' rows from delete: the statement succeeds but removes nothing (checked below).
delete from public.recipe_likes where user_id = '33333333-3333-4333-8333-333333333333';

-- ---------------------------------------------------------------------------
-- Forks
-- ---------------------------------------------------------------------------
insert into forks select public.save_recipe((select recipe from fixture), (select steps from fixture));
select throws_ok(
  $$ select public.save_recipe(
       (select recipe from fixture) || '{"forked_from":"dddddddd-0000-4000-8000-0000000000d2"}',
       (select steps from fixture)) $$,
  '42501', null, 'cannot fork a recipe you cannot see'
);

-- ---------------------------------------------------------------------------
-- Counters as the database sees them
-- ---------------------------------------------------------------------------
reset role;

select results_eq(
  $$ select like_count, save_count, fork_count from public.recipes where id = 'dddddddd-0000-4000-8000-0000000000d1' $$,
  $$ values (1, 1, 1) $$,
  'counters match: 1 like, 1 save, 1 fork'
);
select is(
  (select like_count from public.recipes where id = 'dddddddd-0000-4000-8000-0000000000d1'),
  (select count(*)::int from public.recipe_likes where recipe_id = 'dddddddd-0000-4000-8000-0000000000d1'),
  'like_count equals the number of like rows'
);
select ok(
  exists (select 1 from public.recipe_likes where user_id = '33333333-3333-4333-8333-333333333333'),
  'cannot remove someone else''s like'
);
select is(
  (select updated_at from public.recipes where id = 'dddddddd-0000-4000-8000-0000000000d1'),
  '2026-01-01'::timestamptz,
  'reactions and forks do not touch updated_at'
);

delete from public.recipes where id = (select id from forks);
select is(
  (select fork_count from public.recipes where id = 'dddddddd-0000-4000-8000-0000000000d1'), 0,
  'deleting a fork decrements the original'
);

-- Counters never go negative even if a row disappears twice (e.g. cascades).
update public.recipes set like_count = 0 where id = 'dddddddd-0000-4000-8000-0000000000d1';
delete from public.recipe_likes where recipe_id = 'dddddddd-0000-4000-8000-0000000000d1';
select is(
  (select like_count from public.recipes where id = 'dddddddd-0000-4000-8000-0000000000d1'), 0,
  'counters are clamped at zero'
);

select lives_ok(
  $$ delete from public.recipes where id = 'dddddddd-0000-4000-8000-0000000000d1' $$,
  'deleting a recipe removes its reactions'
);
select is_empty(
  $$ select 1 from public.recipe_saves where recipe_id = 'dddddddd-0000-4000-8000-0000000000d1' $$,
  'saves are gone with the recipe'
);

select * from finish();
rollback;
