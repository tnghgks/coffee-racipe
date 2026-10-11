import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

import type { RecipeListParams } from "./search-params";
import type { Dripper, RecipeDetail, RecipeStep, RecipeSummary } from "./types";

// Public data only: these run with the anon key and no session, so results are shared across visitors.
// Phase 3 adds a session-aware path for a user's own private recipes.

export const recipeTags = {
  all: "recipes",
  detail: (id: string) => `recipe:${id}`,
  drippers: "drippers",
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const summaryColumns =
  "id, title, description, dose_g, ratio, water_temp_c, total_time_s, is_official, like_count, created_at";

type SummaryRow = {
  id: string;
  title: string;
  description: string | null;
  dose_g: number;
  ratio: number;
  water_temp_c: number | null;
  total_time_s: number;
  is_official: boolean;
  like_count: number;
  created_at: string;
  drippers: { slug: string; name: string; brand: string; size_label: string | null; max_dose_g: number | null };
};

function toDripper(row: SummaryRow["drippers"]): Dripper {
  return {
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    sizeLabel: row.size_label,
    maxDoseG: row.max_dose_g,
  };
}

function toSummary(row: SummaryRow): RecipeSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    doseG: row.dose_g,
    ratio: row.ratio,
    waterTempC: row.water_temp_c,
    totalTimeS: row.total_time_s,
    isOfficial: row.is_official,
    likeCount: row.like_count,
    createdAt: row.created_at,
    dripper: toDripper(row.drippers),
  };
}

export async function getDrippers(): Promise<Dripper[]> {
  "use cache";
  cacheLife("days");
  cacheTag(recipeTags.drippers);

  const { data, error } = await createPublicClient()
    .from("drippers")
    .select("slug, name, brand, size_label, max_dose_g")
    .order("name");
  if (error) throw new Error(`Failed to load drippers: ${error.message}`);
  return data.map(toDripper);
}

export async function listPublicRecipes({ dripper, sort }: RecipeListParams): Promise<RecipeSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(recipeTags.all);

  let query = createPublicClient()
    .from("recipes")
    .select(`${summaryColumns}, drippers!inner(slug, name, brand, size_label, max_dose_g)`)
    .eq("visibility", "public")
    .limit(100);

  if (dripper) query = query.eq("drippers.slug", dripper);

  // Phase 5 replaces "popular" with a time-decayed score.
  query =
    sort === "popular"
      ? query.order("like_count", { ascending: false }).order("save_count", { ascending: false })
      : query;
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load recipes: ${error.message}`);
  return data.map(toSummary);
}

/** Returns a public or unlisted recipe with ordered steps, or null when it does not exist or is private. */
export async function getRecipe(id: string): Promise<RecipeDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(recipeTags.all, recipeTags.detail(id));

  if (!UUID_RE.test(id)) return null;

  const { data, error } = await createPublicClient()
    .from("recipes")
    .select(
      `${summaryColumns}, grind_text, source_name, source_url,
       drippers!inner(slug, name, brand, size_label, max_dose_g),
       recipe_steps(position, label, start_at_s, water_ratio, note)`,
    )
    .eq("id", id)
    .order("position", { referencedTable: "recipe_steps" })
    .maybeSingle();

  if (error) throw new Error(`Failed to load recipe ${id}: ${error.message}`);
  if (!data) return null;

  return {
    ...toSummary(data),
    grindText: data.grind_text,
    sourceName: data.source_name,
    sourceUrl: data.source_url,
    steps: data.recipe_steps.map(
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
