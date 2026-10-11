import "server-only";

import { cache } from "react";

import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

import { detailColumns, isUuid, summaryColumns, toDetail, toSummary } from "./mappers";
import { getRecipe } from "./queries";
import type { RecipeDetail, RecipeSummary } from "./types";

// Session-aware reads (RLS sees the viewer's private recipes). Never cached across users;
// render inside <Suspense>/loading.tsx because they read cookies.

const getOwnRecipe = cache(async (id: string): Promise<RecipeDetail | null> => {
  if (!isUuid(id)) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(detailColumns)
    .eq("id", id)
    .eq("author_id", user.id)
    .order("position", { referencedTable: "recipe_steps" })
    .maybeSingle();
  if (error) throw new Error(`Failed to load recipe ${id}: ${error.message}`);
  return data ? toDetail(data) : null;
});

/** Public/unlisted recipes from the shared cache, falling back to the viewer's own private recipe. */
export async function getRecipeForViewer(id: string): Promise<RecipeDetail | null> {
  return (await getRecipe(id)) ?? (await getOwnRecipe(id));
}

/** A recipe the signed-in user may edit, or null (missing, or someone else's). */
export async function getEditableRecipe(id: string): Promise<RecipeDetail | null> {
  return getOwnRecipe(id);
}

export async function listMyRecipes(): Promise<RecipeSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(summaryColumns)
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load my recipes: ${error.message}`);
  return data.map(toSummary);
}
