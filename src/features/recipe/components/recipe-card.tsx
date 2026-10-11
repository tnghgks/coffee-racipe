import Link from "next/link";

import { formatGrams, formatRatio, formatSeconds, roundGrams } from "@/lib/brew";

import { dripperLabel } from "../dripper";
import type { RecipeSummary } from "../types";

import { DripperIcon } from "./dripper-icon";
import { OfficialBadge } from "./official-badge";
import { VisibilityBadge } from "./visibility-badge";

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group relative isolate flex h-full flex-col gap-2 overflow-hidden rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {/* Dripper watermark: large, faint and cropped so it reads as texture, not content. */}
      <DripperIcon
        slug={recipe.dripper.slug}
        className="pointer-events-none absolute -right-5 -bottom-6 -z-10 size-36 -rotate-12 text-primary opacity-[0.08] transition-opacity group-hover:opacity-[0.14]"
      />
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
    </Link>
  );
}
