-- Profiles: sign-up trigger, RLS and column privileges.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'g@test.local',
   '{"full_name":"구글 사용자","avatar_url":"https://example.com/a.png"}'),
  ('22222222-2222-4222-8222-222222222222', 'k@test.local',
   '{"nickname":"카카오","picture":"https://example.com/k.jpg"}'),
  ('33333333-3333-4333-8333-333333333333', 'plain@test.local', null);

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------

select results_eq(
  $$ select display_name, avatar_url from public.profiles where id = '11111111-1111-4111-8111-111111111111' $$,
  $$ values ('구글 사용자'::text, 'https://example.com/a.png'::text) $$,
  'Google metadata pre-fills the profile'
);

select results_eq(
  $$ select display_name, avatar_url from public.profiles where id = '22222222-2222-4222-8222-222222222222' $$,
  $$ values ('카카오'::text, 'https://example.com/k.jpg'::text) $$,
  'Kakao metadata pre-fills the profile'
);

select results_eq(
  $$ select display_name, username from public.profiles where id = '33333333-3333-4333-8333-333333333333' $$,
  $$ values (null::text, null::text) $$,
  'a user without metadata still gets an empty profile'
);

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is((select count(*)::int from public.profiles), 3, 'anon can read profiles');

select throws_ok(
  $$ update public.profiles set display_name = 'hacked' $$,
  '42501', null, 'anon cannot update profiles'
);
reset role;

-- ---------------------------------------------------------------------------
-- Signed in as the Google user
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ update public.profiles set username = 'drip_lover', bio = '핸드드립 입문'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  'a user can set their own username and bio'
);

update public.profiles set display_name = 'hacked' where id = '22222222-2222-4222-8222-222222222222';
select is(
  (select display_name from public.profiles where id = '22222222-2222-4222-8222-222222222222'), '카카오',
  'a user cannot update someone else''s profile'
);

select throws_ok(
  $$ update public.profiles set id = gen_random_uuid() where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null, 'id is not writable'
);

select throws_ok(
  $$ insert into public.profiles (id) values (gen_random_uuid()) $$,
  '42501', null, 'users cannot insert profiles directly'
);

select throws_ok(
  $$ update public.profiles set username = 'Bad Name!' where id = '11111111-1111-4111-8111-111111111111' $$,
  '23514', null, 'username format is enforced'
);

-- Switch to the Kakao user to test uniqueness against drip_lover.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok(
  $$ update public.profiles set username = 'drip_lover' where id = '22222222-2222-4222-8222-222222222222' $$,
  '23505', null, 'usernames are unique'
);

reset role;

-- ---------------------------------------------------------------------------
-- Cascade
-- ---------------------------------------------------------------------------

delete from auth.users where id = '33333333-3333-4333-8333-333333333333';
select is_empty(
  $$ select id from public.profiles where id = '33333333-3333-4333-8333-333333333333' $$,
  'deleting the auth user deletes the profile'
);

select * from finish();
rollback;
