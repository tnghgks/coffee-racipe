-- Short credit for the original author of a well-known recipe (1–2 lines, written in-house).

alter table public.recipes
  add column source_note text check (char_length(source_note) <= 200);

comment on column public.recipes.source_note is 'Brief note about source_name, e.g. who they are. Written in-house.';

-- Authors may write it like the other source columns (see column grants in the recipes migration).
grant insert (source_note), update (source_note) on public.recipes to authenticated;
