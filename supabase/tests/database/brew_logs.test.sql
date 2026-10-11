-- brew_logs: strictly private to the owner.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'bob@test.local');

insert into public.brew_logs (id, user_id, recipe_id, bean_name, dose_g, water_g, rating, next_adjustment) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-4111-8111-111111111111',
   '00000000-0000-4000-8000-000000000003', '에티오피아 예가체프', 15, 240, 4, '분쇄 한 칸 굵게');

-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$ select * from public.brew_logs $$, '42501', null, 'anon cannot read logs at all');

-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select is_empty($$ select id from public.brew_logs $$, 'another user sees no logs');

update public.brew_logs set rating = 1 where id = 'aaaaaaaa-0000-4000-8000-0000000000a1';
delete from public.brew_logs where id = 'aaaaaaaa-0000-4000-8000-0000000000a1';

select throws_ok(
  $$ insert into public.brew_logs (user_id, dose_g, water_g, rating)
     values ('11111111-1111-4111-8111-111111111111', 15, 240, 5) $$,
  '42501', null, 'cannot create a log for someone else'
);

select lives_ok(
  $$ insert into public.brew_logs (dose_g, water_g, rating) values (18, 300, 3) $$,
  'creating a log defaults user_id to the caller'
);

-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select results_eq(
  $$ select rating::int, next_adjustment from public.brew_logs $$,
  $$ values (4, '분쇄 한 칸 굵게'::text) $$,
  'the owner sees only their own log, untouched by the other user'
);

select lives_ok(
  $$ update public.brew_logs set rating = 5, notes = '단맛 좋음' where id = 'aaaaaaaa-0000-4000-8000-0000000000a1' $$,
  'the owner can update their log'
);

select throws_ok(
  $$ update public.brew_logs set user_id = '22222222-2222-4222-8222-222222222222' $$,
  '42501', null, 'user_id cannot be changed'
);

select throws_ok(
  $$ insert into public.brew_logs (dose_g, water_g, rating) values (15, 240, 6) $$,
  '23514', null, 'rating must be 1–5'
);

reset role;

select is(
  (select user_id from public.brew_logs where dose_g = 18), '22222222-2222-4222-8222-222222222222'::uuid,
  'the other user''s own log belongs to them'
);

-- Use a throwaway recipe to check that deleting it keeps the log.
insert into public.recipes (id, author_id, title, dripper_id, dose_g, ratio, total_time_s)
values ('bbbbbbbb-0000-4000-8000-0000000000b1', '11111111-1111-4111-8111-111111111111', 'temp',
        (select id from public.drippers limit 1), 15, 16, 120);
update public.brew_logs set recipe_id = 'bbbbbbbb-0000-4000-8000-0000000000b1' where id = 'aaaaaaaa-0000-4000-8000-0000000000a1';
delete from public.recipes where id = 'bbbbbbbb-0000-4000-8000-0000000000b1';
select is(
  (select recipe_id from public.brew_logs where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'), null,
  'deleting a recipe keeps the log (recipe_id set null)'
);

select * from finish();
rollback;
