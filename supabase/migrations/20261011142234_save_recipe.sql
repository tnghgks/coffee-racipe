-- Phase 3-B: save a recipe and its steps in one transaction.
--
-- security invoker: runs as the calling user, so RLS and column grants apply exactly as for direct
-- table access. Updating someone else's recipe matches no row (RLS) and raises "not found".

create or replace function public.save_recipe(recipe jsonb, steps jsonb, recipe_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(steps) is distinct from 'array' or jsonb_array_length(steps) = 0 then
    raise exception 'a recipe needs at least one step' using errcode = '22023';
  end if;

  if recipe_id is null then
    insert into public.recipes (
      author_id, title, description, dripper_id, dose_g, ratio, water_temp_c, grind_text, total_time_s,
      visibility, forked_from, source_name, source_url, source_note
    ) values (
      (select auth.uid()),
      recipe ->> 'title',
      recipe ->> 'description',
      (recipe ->> 'dripper_id')::uuid,
      (recipe ->> 'dose_g')::numeric,
      (recipe ->> 'ratio')::numeric,
      (recipe ->> 'water_temp_c')::smallint,
      recipe ->> 'grind_text',
      (recipe ->> 'total_time_s')::integer,
      coalesce((recipe ->> 'visibility')::public.recipe_visibility, 'private'),
      (recipe ->> 'forked_from')::uuid,
      recipe ->> 'source_name',
      recipe ->> 'source_url',
      recipe ->> 'source_note'
    )
    returning id into saved_id;
  else
    update public.recipes r set
      title = recipe ->> 'title',
      description = recipe ->> 'description',
      dripper_id = (recipe ->> 'dripper_id')::uuid,
      dose_g = (recipe ->> 'dose_g')::numeric,
      ratio = (recipe ->> 'ratio')::numeric,
      water_temp_c = (recipe ->> 'water_temp_c')::smallint,
      grind_text = recipe ->> 'grind_text',
      total_time_s = (recipe ->> 'total_time_s')::integer,
      visibility = coalesce((recipe ->> 'visibility')::public.recipe_visibility, r.visibility)
    where r.id = recipe_id
    returning r.id into saved_id;

    if saved_id is null then
      raise exception 'recipe not found' using errcode = 'P0002';
    end if;
    delete from public.recipe_steps s where s.recipe_id = saved_id;
  end if;

  insert into public.recipe_steps (recipe_id, position, label, start_at_s, water_ratio, note)
  select saved_id,
         (e.ord - 1)::smallint,
         e.step ->> 'label',
         (e.step ->> 'start_at_s')::integer,
         (e.step ->> 'water_ratio')::numeric,
         nullif(e.step ->> 'note', '')
  from jsonb_array_elements(steps) with ordinality as e(step, ord);

  -- Same rule as the editor's schema, enforced here too: time and water never go backwards.
  if exists (
    select 1
    from public.recipe_steps a
    join public.recipe_steps b on b.recipe_id = a.recipe_id and b.position = a.position + 1
    where a.recipe_id = saved_id
      and (b.start_at_s < a.start_at_s or b.water_ratio < a.water_ratio)
  ) then
    raise exception 'steps must not go back in time or water' using errcode = '22023';
  end if;

  return saved_id;
end;
$$;

revoke execute on function public.save_recipe(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_recipe(jsonb, jsonb, uuid) to authenticated;
