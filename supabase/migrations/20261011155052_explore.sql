-- Phase 5-B: explore feed — full-text search, popularity score and keyset pagination.

create index recipes_search_idx on public.recipes using gin (search);
-- Supports the public feed's "latest" order and visibility filter.
create index recipes_public_created_idx on public.recipes (created_at desc, id desc) where visibility = 'public';

-- Popularity with time decay (Hacker News style). Saves weigh more than likes; +1 so new recipes
-- without reactions still rank by freshness. `at` is fixed per feed session so pages stay consistent.
create or replace function public.recipe_hot_score(like_count integer, save_count integer, created_at timestamptz, at timestamptz)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $$
  select (like_count + 2 * save_count + 1)::double precision
       / power(greatest(extract(epoch from (at - created_at)) / 3600.0, 0) + 2, 1.5);
$$;

-- Ids (and the sort key for the next cursor) of public recipes matching the filters, one page at a time.
-- Keyset pagination on (sort_key, id) descending; pass the last row's values as after_key/after_id.
-- sort_key is a bigint on purpose: a float key goes through JSON to the client and back, and any rounding
-- makes the boundary row reappear on the next page. Integers below 2^53 round-trip exactly.
-- security invoker: RLS applies, and only visibility = 'public' rows are considered anyway.
create or replace function public.explore_recipe_ids(
  query text default null,
  dripper_slug text default null,
  ratio_min numeric default null,
  ratio_max numeric default null,
  time_max integer default null,
  sort text default 'popular',
  at timestamptz default now(),
  after_key bigint default null,
  after_id uuid default null,
  page_size integer default 20
)
returns table (id uuid, sort_key bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      nullif(btrim(query), '') as q,
      -- websearch_to_tsquery never raises on user input ("4:6", quotes, operators…)
      websearch_to_tsquery('simple', coalesce(nullif(btrim(query), ''), '')) as tsq,
      -- substring match for partial Korean words; escape LIKE wildcards in the input
      '%' || replace(replace(replace(coalesce(btrim(query), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  candidates as (
    select
      r.id,
      case
        -- microseconds since epoch
        when sort = 'latest' then (extract(epoch from r.created_at) * 1000000)::bigint
        -- score scaled to an integer (9 decimal places; stays below 2^53 up to a score of ~9 million)
        else floor(public.recipe_hot_score(r.like_count, r.save_count, r.created_at, at) * 1e9)::bigint
      end as sort_key
    from public.recipes r
    join public.drippers d on d.id = r.dripper_id
    cross join params p
    where r.visibility = 'public'
      and (p.q is null or r.search @@ p.tsq or r.title ilike p.pattern)
      and (dripper_slug is null or d.slug = dripper_slug)
      and (ratio_min is null or r.ratio >= ratio_min)
      and (ratio_max is null or r.ratio <= ratio_max)
      and (time_max is null or r.total_time_s <= time_max)
  )
  select c.id, c.sort_key
  from candidates c
  where after_key is null or (c.sort_key, c.id) < (after_key, after_id)
  order by c.sort_key desc, c.id desc
  limit least(greatest(page_size, 1), 50);
$$;

grant execute on function public.explore_recipe_ids(text, text, numeric, numeric, integer, text, timestamptz, bigint, uuid, integer)
  to anon, authenticated;
