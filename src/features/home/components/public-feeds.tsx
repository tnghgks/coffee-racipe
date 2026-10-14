import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { AuthorLabel } from "@/features/community/components/author-link";
import { exploreRecipes } from "@/features/community/explore";
import { exploreHref, parseExploreParams, type ExploreSort } from "@/features/community/explore-params";
import { OfficialBadge } from "@/features/recipe/components/official-badge";
import { ReactionCounts } from "@/features/recipe/components/recipe-card";
import { RecipeImage } from "@/features/recipe/components/recipe-image";
import { RecipeRow } from "@/features/recipe/components/recipe-row";
import type { RecipeSummary } from "@/features/recipe/types";
import { formatRatio, formatSeconds } from "@/lib/brew";
import { formatTimeAgo } from "@/lib/format";

import { HomeSection } from "./home-section";

// Public feeds shared by both home variants. They reuse the cached first page of /explore,
// so the home page and the explore feed rank recipes the same way. Render inside <Suspense>.

const POPULAR_COUNT = 8;
const NEW_COUNT = 5;

function feedParams(sort: ExploreSort) {
  return { ...parseExploreParams({}), sort };
}

/** "2시간 전" reads the clock: per request, never while prerendering. */
async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

export async function PopularRecipes() {
  const params = feedParams("popular");
  const { recipes } = await exploreRecipes(params, null);
  if (recipes.length === 0) return null;
  return (
    <HomeSection title="지금 인기 있는 레시피" moreHref={exploreHref(params)}>
      {/* Bleeds to the screen edges on mobile so the cut-off card hints at scrolling. `relative` makes the
          scroller the containing block of the cards' sr-only labels; otherwise they widen the page. */}
      <ol
        className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="popular-recipes"
      >
        {recipes.slice(0, POPULAR_COUNT).map((recipe, index) => (
          <li key={recipe.id} className="w-64 shrink-0 snap-start">
            <RankedRecipeCard recipe={recipe} rank={index + 1} />
          </li>
        ))}
      </ol>
    </HomeSection>
  );
}

function RankedRecipeCard({ recipe, rank }: { recipe: RecipeSummary; rank: number }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative">
        <RecipeImage recipe={recipe} sizes="256px" className="aspect-4/3" />
        <span
          className="absolute top-2 left-2 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums"
          aria-label={`${rank}위`}
        >
          {rank}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="truncate font-semibold">{recipe.title}</h3>
        <p className="text-sm text-muted-foreground tabular-nums">
          {recipe.dripper.name} · {formatRatio(recipe.ratio)} · {formatSeconds(recipe.totalTimeS)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
          {recipe.author ? <AuthorLabel author={recipe.author} /> : recipe.isOfficial ? <OfficialBadge /> : <span />}
          <ReactionCounts likes={recipe.likeCount} saves={recipe.saveCount} />
        </div>
      </div>
    </Link>
  );
}

export async function NewRecipes() {
  const params = feedParams("latest");
  const { recipes } = await exploreRecipes(params, null);
  if (recipes.length === 0) return null;
  const now = await requestTime();
  return (
    <HomeSection title="새로 올라온 레시피" moreHref={exploreHref(params)}>
      <ul className="flex flex-col gap-2" data-testid="new-recipes">
        {recipes.slice(0, NEW_COUNT).map((recipe) => (
          <li key={recipe.id}>
            <RecipeRow
              recipe={recipe}
              meta={
                <>
                  {recipe.author ? (
                    <AuthorLabel author={recipe.author} />
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      공식
                    </span>
                  )}
                  <span aria-hidden>·</span>
                  <time dateTime={recipe.createdAt} className="shrink-0">
                    {formatTimeAgo(recipe.createdAt, now)}
                  </time>
                </>
              }
            />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
