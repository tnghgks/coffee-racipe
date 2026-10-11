-- save_recipe: atomic create/update, ownership via RLS, step ordering.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'bob@test.local');

create temporary table fixture as
select jsonb_build_object(
  'title', '내 V60', 'dripper_id', (select id from public.drippers where slug = 'v60'),
  'dose_g', 15, 'ratio', 16, 'total_time_s', 165, 'visibility', 'private'
) as recipe,
jsonb_build_array(
  jsonb_build_object('label', '뜸', 'start_at_s', 0, 'water_ratio', 2),
  jsonb_build_object('label', '1차', 'start_at_s', 40, 'water_ratio', 8, 'note', '천천히'),
  jsonb_build_object('label', '2차', 'start_at_s', 80, 'water_ratio', 16)
) as steps;
grant select on fixture to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok(
  $$ select public.save_recipe((select recipe from fixture), (select steps from fixture)) $$,
  '42501', null, 'anon cannot call save_recipe'
);

-- ---------------------------------------------------------------------------
-- Alice creates and edits
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

create temporary table saved (id uuid);
grant all on saved to authenticated;
insert into saved select public.save_recipe((select recipe from fixture), (select steps from fixture));

select results_eq(
  $$ select author_id, visibility::text, is_official from public.recipes where id = (select id from saved) $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid, 'private'::text, false) $$,
  'creates a private recipe owned by the caller'
);

select results_eq(
  $$ select position::int, label, note from public.recipe_steps where recipe_id = (select id from saved) order by position $$,
  $$ values (0, '뜸'::text, null::text), (1, '1차'::text, '천천히'::text), (2, '2차'::text, null::text) $$,
  'stores steps in order'
);

select lives_ok(
  $$ select public.save_recipe(
       (select recipe from fixture) || '{"title":"내 V60 v2","dose_g":20}',
       '[{"label":"한 번에","start_at_s":0,"water_ratio":16}]',
       (select id from saved)) $$,
  'the author can update and replace steps'
);

select results_eq(
  $$ select title, dose_g::numeric, (select count(*)::int from public.recipe_steps where recipe_id = r.id)
     from public.recipes r where id = (select id from saved) $$,
  $$ values ('내 V60 v2'::text, 20::numeric, 1) $$,
  'update applied and old steps replaced'
);

select throws_ok(
  $$ select public.save_recipe((select recipe from fixture),
       '[{"label":"a","start_at_s":30,"water_ratio":2},{"label":"b","start_at_s":10,"water_ratio":8}]') $$,
  '22023', null, 'rejects steps that go back in time'
);

select throws_ok(
  $$ select public.save_recipe((select recipe from fixture),
       '[{"label":"a","start_at_s":0,"water_ratio":8},{"label":"b","start_at_s":30,"water_ratio":4}]') $$,
  '22023', null, 'rejects steps whose water decreases'
);

select is(
  (select count(*)::int from public.recipes where author_id = '11111111-1111-4111-8111-111111111111'), 1,
  'failed saves leave nothing behind (transaction rolled back)'
);

select throws_ok(
  $$ select public.save_recipe((select recipe from fixture), '[]') $$,
  '22023', null, 'requires at least one step'
);

create temporary table sneaky (id uuid);
grant all on sneaky to authenticated;
insert into sneaky select public.save_recipe((select recipe from fixture) || '{"is_official":true}', (select steps from fixture));
select is(
  (select is_official from public.recipes where id = (select id from sneaky)), false,
  'is_official in the payload is ignored'
);

-- ---------------------------------------------------------------------------
-- Bob cannot touch Alice's recipe
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select throws_ok(
  $$ select public.save_recipe((select recipe from fixture) || '{"title":"hijacked"}', (select steps from fixture), (select id from saved)) $$,
  'P0002', null, 'another user cannot update the recipe (RLS hides it)'
);

reset role;
select is(
  (select title from public.recipes where id = (select id from saved)), '내 V60 v2',
  'the recipe is unchanged after the attempt'
);

select * from finish();
rollback;
