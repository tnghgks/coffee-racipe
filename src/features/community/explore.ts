import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

import { summaryColumns, toSummary } from "@/features/recipe/mappers";
import { recipeTags } from "@/features/recipe/queries";
import type { RecipeSummary } from "@/features/recipe/types";
import { createPublicClient } from "@/lib/supabase/public";

import { encodeCursor, feedMoment, toRpcFilters, type ExploreCursor, type ExploreParams } from "./explore-params";

export const EXPLORE_PAGE_SIZE = 20;

export type ExplorePage = {
  recipes: RecipeSummary[];
  /** Opaque cursor for the next page; null on the last page. */
  nextCursor: string | null;
};

/** One page of the public feed. Public data only, so pages are cached and shared across visitors. */
export async function exploreRecipes(params: ExploreParams, cursor: ExploreCursor | null): Promise<ExplorePage> {
  // A new feed session starts "now": read the clock per request, never during prerendering.
  // The page data itself stays cached, keyed by the rounded moment.
  if (!cursor) await connection();
  return explorePage(params, cursor?.at ?? feedMoment(), cursor?.key ?? null, cursor?.id ?? null);
}

async function explorePage(
  params: ExploreParams,
  at: string,
  afterKey: number | null,
  afterId: string | null,
): Promise<ExplorePage> {
  "use cache";
  cacheLife("minutes");
  cacheTag(recipeTags.all, recipeTags.profiles);

  const supabase = createPublicClient();
  const { data: rows, error } = await supabase.rpc("explore_recipe_ids", {
    ...toRpcFilters(params),
    at,
    after_key: afterKey ?? undefined,
    after_id: afterId ?? undefined,
    page_size: EXPLORE_PAGE_SIZE,
  });
  if (error) throw new Error(`Failed to explore recipes: ${error.message}`);
  if (rows.length === 0) return { recipes: [], nextCursor: null };

  const { data, error: detailError } = await supabase
    .from("recipes")
    .select(summaryColumns)
    .in(
      "id",
      rows.map((row) => row.id),
    );
  if (detailError) throw new Error(`Failed to load explored recipes: ${detailError.message}`);

  // Keep the ranking from explore_recipe_ids.
  const byId = new Map(data.map((row) => [row.id, toSummary(row)]));
  const recipes = rows.flatMap((row) => byId.get(row.id) ?? []);
  const last = rows.at(-1)!;
  return {
    recipes,
    nextCursor: rows.length === EXPLORE_PAGE_SIZE ? encodeCursor({ key: last.sort_key, id: last.id, at }) : null,
  };
}
