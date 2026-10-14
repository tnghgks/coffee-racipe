import "server-only";

import { getCurrentUser } from "@/features/auth/queries";
import { isUuid, summaryColumns, toSummary } from "@/features/recipe/mappers";
import type { RecipeAuthor, RecipeSummary } from "@/features/recipe/types";
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
export async function listSavedRecipes(limit = 200): Promise<RecipeSummary[]> {
  return listReactedRecipes("recipe_saves", limit);
}

/** The viewer's liked recipes, newest like first. */
export async function listLikedRecipes(limit = 200): Promise<RecipeSummary[]> {
  return listReactedRecipes("recipe_likes", limit);
}

async function listReactedRecipes(table: "recipe_saves" | "recipe_likes", limit: number): Promise<RecipeSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select(`created_at, recipes(${summaryColumns})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
  // RLS hides recipes the viewer can no longer see; the embed is then null.
  return data.flatMap((row) => (row.recipes ? [toSummary(row.recipes)] : []));
}

export type RecipeComment = {
  id: string;
  /** "" once deleted. */
  body: string;
  createdAt: string;
  edited: boolean;
  deleted: boolean;
  /** null if the author has no username (or was removed). */
  author: RecipeAuthor | null;
  isMine: boolean;
};

/** Comments on a recipe, oldest first. RLS returns nothing if the viewer can't see the recipe. */
export async function listComments(recipeId: string): Promise<RecipeComment[]> {
  if (!isUuid(recipeId)) return [];
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, user_id, body, created_at, updated_at, deleted_at, profiles!comments_user_id_fkey(username, display_name, avatar_url)",
    )
    .eq("recipe_id", recipeId)
    .order("created_at")
    .limit(500);
  if (error) throw new Error(`Failed to load comments for ${recipeId}: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    edited: row.updated_at !== row.created_at,
    deleted: row.deleted_at !== null,
    author: row.profiles?.username
      ? { username: row.profiles.username, displayName: row.profiles.display_name, avatarUrl: row.profiles.avatar_url }
      : null,
    isMine: !!user && row.user_id === user.id,
  }));
}
