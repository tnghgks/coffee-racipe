-- Dripper capacity: the recommended maximum dose for the most common size of each dripper.
-- Used only to warn in the calculator; doses above it are still allowed.

alter table public.drippers
  add column size_label text check (char_length(size_label) <= 20),
  add column max_dose_g numeric(5, 1) check (max_dose_g > 0 and max_dose_g <= 200);

comment on column public.drippers.size_label is 'Size the capacity refers to, e.g. "02" for V60 02.';
comment on column public.drippers.max_dose_g is 'Recommended maximum coffee dose (g) for size_label; null = unknown.';
