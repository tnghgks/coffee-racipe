import type { Tables } from "@/lib/supabase/database.types";

import type { Dripper, RecipeDetail, RecipeStep, RecipeSummary } from "./types";

// Column lists and the row types they produce live side by side. Row types derive from the generated
// schema so a renamed or retyped column fails typecheck instead of drifting silently.
// Shared by the public cached reads (queries.ts) and the session reads (my-queries.ts).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID_RE.test(value);

export const dripperColumns = "id, slug, name, brand, size_label, max_dose_g";
type DripperRow = Pick<Tables<"drippers">, "slug" | "name" | "brand" | "size_label" | "max_dose_g">;

const authorColumns = "username, display_name, avatar_url";
type AuthorRow = Pick<Tables<"profiles">, "username" | "display_name" | "avatar_url">;

// The author embed names its foreign key: recipe_likes/recipe_saves also link recipes and profiles,
// which makes a bare `profiles(...)` ambiguous.
export const summaryColumns = `id, author_id, visibility, title, description, dose_g, ratio, water_temp_c, total_time_s,
  is_official, like_count, save_count, created_at, drippers!inner(${dripperColumns}),
  profiles!recipes_author_id_profiles_fkey(${authorColumns})`;
type SummaryRow = Pick<
  Tables<"recipes">,
  | "id"
  | "author_id"
  | "visibility"
  | "title"
  | "description"
  | "dose_g"
  | "ratio"
  | "water_temp_c"
  | "total_time_s"
  | "is_official"
  | "like_count"
  | "save_count"
  | "created_at"
> & { drippers: DripperRow; profiles: AuthorRow | null };

export const detailColumns = `${summaryColumns}, grind_text, source_name, source_url, source_note, forked_from, fork_count,
  recipe_steps(position, label, start_at_s, water_ratio, note)`;
type DetailRow = SummaryRow &
  Pick<Tables<"recipes">, "grind_text" | "source_name" | "source_url" | "source_note" | "forked_from" | "fork_count"> & {
    recipe_steps: Pick<Tables<"recipe_steps">, "position" | "label" | "start_at_s" | "water_ratio" | "note">[];
  };

export function toDripper(row: DripperRow): Dripper {
  return {
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    sizeLabel: row.size_label,
    maxDoseG: row.max_dose_g,
  };
}

export function toSummary(row: SummaryRow): RecipeSummary {
  return {
    id: row.id,
    authorId: row.author_id,
    visibility: row.visibility,
    title: row.title,
    description: row.description,
    doseG: row.dose_g,
    ratio: row.ratio,
    waterTempC: row.water_temp_c,
    totalTimeS: row.total_time_s,
    isOfficial: row.is_official,
    likeCount: row.like_count,
    saveCount: row.save_count,
    createdAt: row.created_at,
    dripper: toDripper(row.drippers),
    // Official recipes have no author; authors without a username can't publish, but guard anyway.
    author: row.profiles?.username
      ? {
          username: row.profiles.username,
          displayName: row.profiles.display_name,
          avatarUrl: row.profiles.avatar_url,
        }
      : null,
  };
}

/** Steps must already be ordered by position (see `.order("position", { referencedTable })`). */
export function toDetail(row: DetailRow): RecipeDetail {
  return {
    ...toSummary(row),
    grindText: row.grind_text,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceNote: row.source_note,
    forkedFrom: row.forked_from,
    forkCount: row.fork_count,
    steps: row.recipe_steps.map(
      (step): RecipeStep => ({
        position: step.position,
        label: step.label,
        startAtS: step.start_at_s,
        waterRatio: step.water_ratio,
        note: step.note,
      }),
    ),
  };
}
