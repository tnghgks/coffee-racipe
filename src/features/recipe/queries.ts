import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

import { detailColumns, dripperColumns, isUuid, summaryColumns, toDetail, toDripper, toSummary } from "./mappers";
import type { RecipeListParams } from "./search-params";
import type { Dripper, RecipeDetail, RecipeSummary } from "./types";

// Public data only: these run with the anon key and no session, so results are shared across visitors
// and safe to cache. A signed-in user's own (private) recipes are read in my-queries.ts.

export const recipeTags = {
  all: "recipes",
  detail: (id: string) => `recipe:${id}`,
  drippers: "drippers",
  /** Public profile data (also embedded in recipe lists as the author). */
  profiles: "profiles",
} as const;

export type DripperOption = Dripper & { id: string };

export async function getDrippers(): Promise<DripperOption[]> {
  "use cache";
  cacheLife("days");
  cacheTag(recipeTags.drippers);

  const { data, error } = await createPublicClient().from("drippers").select(dripperColumns).order("name");
  if (error) throw new Error(`Failed to load drippers: ${error.message}`);
  return data.map((row) => ({ id: row.id, ...toDripper(row) }));
}

/** Official recipes for /recipes. Community recipes live on author profiles and /explore. */
export async function listOfficialRecipes({ dripper, sort }: RecipeListParams): Promise<RecipeSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(recipeTags.all);

  let query = createPublicClient()
    .from("recipes")
    .select(summaryColumns)
    .eq("is_official", true)
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
  cacheTag(recipeTags.all, recipeTags.detail(id), recipeTags.profiles);

  if (!isUuid(id)) return null;

  const { data, error } = await createPublicClient()
    .from("recipes")
    .select(detailColumns)
    .eq("id", id)
    .order("position", { referencedTable: "recipe_steps" })
    .maybeSingle();

  if (error) throw new Error(`Failed to load recipe ${id}: ${error.message}`);
  return data ? toDetail(data) : null;
}
