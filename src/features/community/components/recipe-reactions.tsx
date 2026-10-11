import { loginHref } from "@/features/auth/paths";
import type { RecipeSummary } from "@/features/recipe/types";

import { getReactionState } from "../my-queries";

import { ReactionButtons } from "./reaction-buttons";

/** Like/save buttons with fresh counts and the viewer's state. Reads the session: render in <Suspense>. */
export async function RecipeReactions({ recipeId }: { recipeId: string }) {
  const state = await getReactionState(recipeId);
  if (!state) return null;
  const { signedIn, ...initial } = state;
  return (
    <ReactionButtons
      recipeId={recipeId}
      initial={initial}
      loginHref={signedIn ? null : loginHref(`/recipes/${recipeId}`)}
    />
  );
}

/** Suspense fallback: the cached counts, not clickable yet. */
export function RecipeReactionsFallback({ recipe }: { recipe: Pick<RecipeSummary, "id" | "likeCount" | "saveCount"> }) {
  return (
    <ReactionButtons
      recipeId={recipe.id}
      initial={{ likes: recipe.likeCount, saves: recipe.saveCount, liked: false, saved: false }}
      loginHref={null}
      pending
    />
  );
}
