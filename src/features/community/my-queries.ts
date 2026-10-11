import "server-only";

import { getCurrentUser } from "@/features/auth/queries";
import { isUuid, summaryColumns, toSummary } from "@/features/recipe/mappers";
import type { RecipeSummary } from "@/features/recipe/types";
import { createClient } from "@/lib/supabase/server";

import type { ReactionState } from "./reactions";

// Session reads for reactions: never cached (counts must match the viewer's own like/save state).
// Render inside <Suspense>.

/** Fresh counts plus the viewer's like/save state; null if the recipe isn't visible. */
export async function getReactionState(recipeId: string): Promise<(ReactionState & { signedIn: boolean }) | null> {
  if (!isUuid(recipeId)) return null;
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [recipe, like, save] = await Promise.all([
    supabase.from("recipes").select("like_count, save_count").eq("id", recipeId).maybeSingle(),
    user
      ? supabase.from("recipe_likes").select("recipe_id").eq("recipe_id", recipeId).eq("user_id", user.id).maybeSingle()
      : null,
    user
      ? supabase.from("recipe_saves").select("recipe_id").eq("recipe_id", recipeId).eq("user_id", user.id).maybeSingle()
      : null,
  ]);
  const error = recipe.error ?? like?.error ?? save?.error;
  if (error) throw new Error(`Failed to load reactions for ${recipeId}: ${error.message}`);
  if (!recipe.data) return null;

  return {
    likes: recipe.data.like_count,
    saves: recipe.data.save_count,
    liked: !!like?.data,
    saved: !!save?.data,
    signedIn: !!user,
  };
}

/** The viewer's saved recipes, newest save first. Recipes that became private or were deleted drop out. */
export async function listSavedRecipes(): Promise<RecipeSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_saves")
    .select(`created_at, recipes(${summaryColumns})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load saved recipes: ${error.message}`);
  // RLS hides recipes the viewer can no longer see; the embed is then null.
  return data.flatMap((row) => (row.recipes ? [toSummary(row.recipes)] : []));
}
