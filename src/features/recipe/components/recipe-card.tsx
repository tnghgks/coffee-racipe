import Link from "next/link";

import { formatGrams, formatRatio, formatSeconds, roundGrams } from "@/lib/brew";

import { dripperLabel } from "../dripper";
import type { RecipeSummary } from "../types";

import { OfficialBadge } from "./official-badge";

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{dripperLabel(recipe.dripper)}</span>
        {recipe.isOfficial && <OfficialBadge />}
      </div>
      <h2 className="font-semibold leading-snug">{recipe.title}</h2>
      {recipe.description && <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>}
      <p className="mt-auto pt-1 text-sm tabular-nums">
        원두 {formatGrams(recipe.doseG)} · {formatRatio(recipe.ratio)} · 물 {roundGrams(recipe.doseG * recipe.ratio)}g ·{" "}
        {formatSeconds(recipe.totalTimeS)}
      </p>
    </Link>
  );
}
