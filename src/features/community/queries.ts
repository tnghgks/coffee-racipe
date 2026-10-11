import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { summaryColumns, toSummary } from "@/features/recipe/mappers";
import { recipeTags } from "@/features/recipe/queries";
import type { RecipeAuthor, RecipeSummary } from "@/features/recipe/types";
import { createPublicClient } from "@/lib/supabase/public";

// Public community reads: anon client, shared cache. Invalidated by recipe saves (recipeTags.all)
// and profile edits (recipeTags.profiles).

export type PublicProfile = RecipeAuthor & { id: string; bio: string | null };

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(recipeTags.profiles);

  if (!USERNAME_RE.test(username)) return null;
  const { data, error } = await createPublicClient()
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(`Failed to load profile ${username}: ${error.message}`);
  if (!data?.username) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
  };
}

/** An author's public recipes (unlisted ones are reachable by link only, so they're not listed). */
export async function listPublicRecipesByAuthor(authorId: string): Promise<RecipeSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(recipeTags.all, recipeTags.profiles);

  const { data, error } = await createPublicClient()
    .from("recipes")
    .select(summaryColumns)
    .eq("author_id", authorId)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load recipes by ${authorId}: ${error.message}`);
  return data.map(toSummary);
}
