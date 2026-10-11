-- Comments (visibility, ownership, soft delete, rate limit), reports, admin role.
begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'bob@test.local'),
  ('44444444-4444-4444-8444-444444444444', 'admin@test.local');
update public.profiles set role = 'admin' where id = '44444444-4444-4444-8444-444444444444';

insert into public.recipes (id, author_id, title, dripper_id, dose_g, ratio, total_time_s, visibility)
select v.id::uuid, '11111111-1111-4111-8111-111111111111', v.title, (select id from public.drippers where slug = 'v60'),
       15, 16, 180, v.visibility::public.recipe_visibility
from (values
  ('eeeeeeee-0000-4000-8000-0000000000e1', '댓글 공개', 'public'),
  ('eeeeeeee-0000-4000-8000-0000000000e2', '댓글 비공개', 'private')
) as v(id, title, visibility);

-- Alice's comment on her private recipe (inserted directly; she can see it).
insert into public.comments (id, recipe_id, user_id, body) values
  ('eeeeeeee-0000-4000-8000-0000000000c2', 'eeeeeeee-0000-4000-8000-0000000000e2', '11111111-1111-4111-8111-111111111111', '비공개 메모');

create temporary table ids (name text primary key, id uuid);
grant all on ids to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Bob comments on the public recipe
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select lives_ok(
  $$ with c as (
       insert into public.comments (recipe_id, body) values ('eeeeeeee-0000-4000-8000-0000000000e1', '좋은 레시피네요')
       returning id)
     insert into ids select 'bob', id from c $$,
  'a signed-in user can comment on a public recipe'
);
select is(
  (select user_id from public.comments where id = (select id from ids where name = 'bob')),
  '22222222-2222-4222-8222-222222222222'::uuid,
  'user_id comes from the session'
);
select throws_ok(
  $$ insert into public.comments (recipe_id, body) values ('eeeeeeee-0000-4000-8000-0000000000e2', '몰래') $$,
  '42501', null, 'cannot comment on a recipe you cannot see'
);
select throws_ok(
  $$ insert into public.comments (recipe_id, user_id, body)
     values ('eeeeeeee-0000-4000-8000-0000000000e1', '11111111-1111-4111-8111-111111111111', '사칭') $$,
  '42501', null, 'cannot comment as someone else'
);
select throws_ok(
  $$ insert into public.comments (recipe_id, body) values ('eeeeeeee-0000-4000-8000-0000000000e1', '   ') $$,
  '23514', null, 'blank comments are rejected'
);
select throws_ok(
  $$ insert into public.comments (recipe_id, body) values ('eeeeeeee-0000-4000-8000-0000000000e1', repeat('가', 1001)) $$,
  '23514', null, 'comments over 1000 characters are rejected'
);
select is_empty(
  $$ select 1 from public.comments where id = 'eeeeeeee-0000-4000-8000-0000000000c2' $$,
  'comments on a private recipe are hidden from others'
);

-- ---------------------------------------------------------------------------
-- Editing and soft delete
-- ---------------------------------------------------------------------------
update public.comments set body = '정말 좋은 레시피네요' where id = (select id from ids where name = 'bob');
select is(
  (select body from public.comments where id = (select id from ids where name = 'bob')),
  '정말 좋은 레시피네요', 'the author can edit'
);
select ok(
  (select deleted_at is null from public.comments where id = (select id from ids where name = 'bob')),
  'editing does not delete'
);

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
update public.comments set body = '고쳐버림' where id = (select id from ids where name = 'bob');
select is(
  (select body from public.comments where id = (select id from ids where name = 'bob')),
  '정말 좋은 레시피네요', 'others cannot edit (RLS hides the row from update)'
);
select throws_ok(
  $$ delete from public.comments where id = (select id from ids where name = 'bob') $$,
  '42501', null, 'no hard deletes'
);
select throws_ok(
  $$ update public.comments set recipe_id = 'eeeeeeee-0000-4000-8000-0000000000e2' where id = (select id from ids where name = 'bob') $$,
  '42501', null, 'recipe_id cannot change'
);

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
update public.comments set deleted_at = '2000-01-01' where id = (select id from ids where name = 'bob');
select results_eq(
  $$ select body, deleted_at > now() - interval '1 minute' from public.comments where id = (select id from ids where name = 'bob') $$,
  $$ values (''::text, true) $$,
  'soft delete clears the text and stamps the real time'
);
update public.comments set body = '되살리기', deleted_at = null where id = (select id from ids where name = 'bob');
select is(
  (select body from public.comments where id = (select id from ids where name = 'bob')),
  '', 'a deleted comment cannot be edited or restored'
);

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select isnt_empty(
  $$ select 1 from public.comments where recipe_id = 'eeeeeeee-0000-4000-8000-0000000000e1' $$,
  'anon can read comments on public recipes'
);
select throws_ok(
  $$ insert into public.comments (recipe_id, body) values ('eeeeeeee-0000-4000-8000-0000000000e1', '익명') $$,
  '42501', null, 'anon cannot comment'
);
select throws_ok($$ select * from public.reports $$, '42501', null, 'anon cannot read reports');

-- ---------------------------------------------------------------------------
-- Rate limit: 5 per minute (Bob already wrote 1)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.comments (recipe_id, body)
     select 'eeeeeeee-0000-4000-8000-0000000000e1', '연속 ' || n from generate_series(1, 4) n $$,
  'up to 5 comments a minute'
);
select throws_ok(
  $$ insert into public.comments (recipe_id, body) values ('eeeeeeee-0000-4000-8000-0000000000e1', '6번째') $$,
  'P0429', null, 'the 6th comment within a minute is rejected'
);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.reports (target_type, target_id, reason, detail)
     values ('recipe', 'eeeeeeee-0000-4000-8000-0000000000e1', 'spam', '광고 같아요') $$,
  'a signed-in user can report a visible recipe'
);
select throws_ok(
  $$ insert into public.reports (target_type, target_id, reason)
     values ('recipe', 'eeeeeeee-0000-4000-8000-0000000000e1', 'abuse') $$,
  '23505', null, 'one report per target per person'
);
select throws_ok(
  $$ insert into public.reports (target_type, target_id, reason)
     values ('recipe', 'eeeeeeee-0000-4000-8000-0000000000e2', 'abuse') $$,
  'P0002', null, 'cannot report a recipe you cannot see'
);
select throws_ok(
  $$ insert into public.reports (target_type, target_id, reason, status)
     values ('comment', 'eeeeeeee-0000-4000-8000-0000000000c2', 'abuse', 'resolved') $$,
  '42501', null, 'reporters cannot set the status'
);
select is_empty($$ select 1 from public.reports $$, 'non-admins cannot read reports, even their own');

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
select results_eq(
  $$ select reason::text, status::text, public.is_admin() from public.reports
     where target_id = 'eeeeeeee-0000-4000-8000-0000000000e1' $$,
  $$ values ('spam'::text, 'open'::text, true) $$,
  'admins read reports'
);

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '22222222-2222-4222-8222-222222222222' $$,
  '42501', null, 'users cannot make themselves admin'
);

select * from finish();
rollback;
