import { Bookmark, Heart } from "lucide-react";
import Link from "next/link";

import { AuthorLabel } from "@/features/community/components/author-link";

import { formatGrams, formatRatio, formatSeconds, roundGrams } from "@/lib/brew";
import { formatCount } from "@/lib/format";

import { dripperLabel } from "../dripper";
import type { RecipeSummary } from "../types";

import { OfficialBadge } from "./official-badge";
import { RecipeImage } from "./recipe-image";
import { VisibilityBadge } from "./visibility-badge";

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <RecipeImage recipe={recipe} sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw" className="aspect-video" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{dripperLabel(recipe.dripper)}</span>
          {recipe.isOfficial ? <OfficialBadge /> : <VisibilityBadge visibility={recipe.visibility} />}
        </div>
        <h2 className="font-semibold leading-snug">{recipe.title}</h2>
        {recipe.description && <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>}
        <p className="mt-auto pt-1 text-sm tabular-nums">
          원두 {formatGrams(recipe.doseG)} · {formatRatio(recipe.ratio)} · 물 {roundGrams(recipe.doseG * recipe.ratio)}g ·{" "}
          {formatSeconds(recipe.totalTimeS)}
        </p>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {recipe.author ? <AuthorLabel author={recipe.author} /> : <span />}
          <ReactionCounts likes={recipe.likeCount} saves={recipe.saveCount} />
        </div>
      </div>
    </Link>
  );
}

/** Abbreviated like/save totals ("1.2천"). Cached lists may lag the real counts by the cache lifetime. */
export function ReactionCounts({ likes, saves }: { likes: number; saves: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-3 tabular-nums">
      <span className="inline-flex items-center gap-1">
        <Heart className="size-3.5" aria-hidden />
        <span className="sr-only">좋아요</span>
        {formatCount(likes)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Bookmark className="size-3.5" aria-hidden />
        <span className="sr-only">저장</span>
        {formatCount(saves)}
      </span>
    </span>
  );
}
