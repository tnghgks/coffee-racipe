-- explore_recipe_ids: visibility, search (incl. special characters), filters, ordering, pagination.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email) values ('11111111-1111-4111-8111-111111111111', 'alice@test.local');

insert into public.recipes (id, author_id, title, dripper_id, dose_g, ratio, total_time_s, visibility, like_count, save_count, created_at)
select v.id::uuid, '11111111-1111-4111-8111-111111111111', v.title, (select id from public.drippers where slug = 'v60'),
       15, 16, 180, v.visibility::public.recipe_visibility, v.likes, v.saves, now() - (v.hours || ' hours')::interval
from (values
  -- 0 hours: created at the transaction's now(), newer than anything already in a local DB
  ('cccccccc-0000-4000-8000-0000000000c1', '탐색 테스트 공개', 'public', 0, 0, 0),
  ('cccccccc-0000-4000-8000-0000000000c2', '탐색 테스트 링크', 'unlisted', 0, 0, 1),
  ('cccccccc-0000-4000-8000-0000000000c3', '탐색 테스트 비공개', 'private', 0, 0, 1),
  -- far above anything E2E leaves behind (a fresh recipe with a few likes scores ~1)
  ('cccccccc-0000-4000-8000-0000000000c4', '탐색 테스트 인기', 'public', 500, 200, 1)
) as v(id, title, visibility, likes, saves, hours);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select set_eq(
  $$ select id from public.explore_recipe_ids(query => '탐색 테스트') $$,
  $$ values ('cccccccc-0000-4000-8000-0000000000c1'::uuid), ('cccccccc-0000-4000-8000-0000000000c4'::uuid) $$,
  'only public recipes are listed (no unlisted or private)'
);

select results_eq(
  $$ select id from public.explore_recipe_ids(query => '4:6') $$,
  $$ values ('00000000-0000-4000-8000-000000000002'::uuid) $$,
  'searching "4:6" finds the 4:6 method'
);

select lives_ok(
  $$ select * from public.explore_recipe_ids(query => $q$% _ \ ' " ( ) & | ! :* <-> 4:6:$q$) $$,
  'special characters never raise'
);

select is_empty(
  $$ select id from public.explore_recipe_ids(query => '%') $$,
  'a bare % is matched literally, not as a wildcard'
);

select ok(
  (select count(*) from public.explore_recipe_ids(query => '울티밋')) >= 1,
  'partial Korean words match titles'
);

select ok(
  (select count(*) from public.explore_recipe_ids(query => '산미')) >= 1,
  'full-text search covers descriptions'
);

select is_empty(
  $$ select r.id from public.explore_recipe_ids(dripper_slug => 'chemex', page_size => 50) e
     join public.recipes r on r.id = e.id
     join public.drippers d on d.id = r.dripper_id
     where d.slug <> 'chemex' $$,
  'dripper filter'
);

select is_empty(
  $$ select r.id from public.explore_recipe_ids(ratio_min => 15.5, ratio_max => 16.5, page_size => 50) e
     join public.recipes r on r.id = e.id where r.ratio < 15.5 or r.ratio > 16.5 $$,
  'ratio range filter'
);

select is_empty(
  $$ select r.id from public.explore_recipe_ids(time_max => 180, page_size => 50) e
     join public.recipes r on r.id = e.id where r.total_time_s > 180 $$,
  'time filter'
);

select is(
  (select id from public.explore_recipe_ids(sort => 'popular', page_size => 1)),
  'cccccccc-0000-4000-8000-0000000000c4'::uuid,
  'popular puts a well-liked recipe first'
);

select is(
  (select id from public.explore_recipe_ids(sort => 'latest', page_size => 1)),
  'cccccccc-0000-4000-8000-0000000000c1'::uuid,
  'latest puts the newest recipe first'
);

-- Keyset pagination: walk all pages of 3 and compare with a single big page.
create temporary table walked (id uuid, page int);
grant all on walked to anon;
do $$
declare
  fixed_at timestamptz := now();
  k bigint;
  last_id uuid;
  n int := 0;
  rows_in_page int;
begin
  loop
    with page as (
      select * from public.explore_recipe_ids(sort => 'popular', at => fixed_at, after_key => k, after_id => last_id, page_size => 3)
    ), ins as (
      insert into walked select page.id, n from page returning id
    )
    select count(*) into rows_in_page from ins;
    exit when rows_in_page = 0;
    select e.sort_key, e.id into k, last_id
    from public.explore_recipe_ids(sort => 'popular', at => fixed_at, after_key => k, after_id => last_id, page_size => 3) e
    order by e.sort_key asc, e.id asc limit 1;
    n := n + 1;
    exit when n > 50;
  end loop;
end $$;

select is(
  (select count(*) from walked), (select count(distinct id) from walked),
  'pages never repeat a recipe'
);
select is(
  (select count(*)::int from walked), (select count(*)::int from public.recipes where visibility = 'public'),
  'pages together cover every public recipe'
);

select * from finish();
rollback;
