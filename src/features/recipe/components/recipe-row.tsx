import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatRatio, formatSeconds } from "@/lib/brew";

import type { RecipeSummary } from "../types";

import { ReactionCounts } from "./recipe-card";
import { RecipeImage } from "./recipe-image";

/** Compact one-line recipe link (home lists): thumbnail, title, specs, optional meta line. */
export function RecipeRow({
  recipe,
  meta,
  showCounts = false,
}: {
  recipe: RecipeSummary;
  /** Extra line under the specs, e.g. author and time. Must not contain links (the row is one). */
  meta?: ReactNode;
  showCounts?: boolean;
}) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex items-center gap-3 rounded-xl border bg-card p-2 pr-3 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <RecipeImage recipe={recipe} sizes="64px" className="size-16 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="truncate font-semibold">{recipe.title}</h3>
        <p className="truncate text-sm text-muted-foreground tabular-nums">
          {recipe.dripper.name} · {formatRatio(recipe.ratio)} · {formatSeconds(recipe.totalTimeS)}
        </p>
        {meta && <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">{meta}</div>}
      </div>
      {showCounts && (
        <span className="hidden text-xs text-muted-foreground min-[400px]:inline-flex">
          <ReactionCounts likes={recipe.likeCount} saves={recipe.saveCount} />
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
