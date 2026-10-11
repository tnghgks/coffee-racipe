import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OfficialBadge } from "@/features/recipe/components/official-badge";
import { RecipeCalculator } from "@/features/recipe/components/recipe-calculator";
import { getRecipe } from "@/features/recipe/queries";
import { formatGrams, formatRatio, formatSeconds } from "@/lib/brew";

export async function generateMetadata({ params }: PageProps<"/recipes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return { title: "레시피를 찾을 수 없어요" };

  const summary = `${recipe.dripper.name} · 원두 ${formatGrams(recipe.doseG)} · ${formatRatio(recipe.ratio)}`;
  return {
    title: recipe.title,
    description: recipe.description ? `${summary} — ${recipe.description}` : summary,
  };
}

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const facts = [
    { label: "원두량", value: formatGrams(recipe.doseG) },
    { label: "비율", value: formatRatio(recipe.ratio) },
    { label: "물 온도", value: recipe.waterTempC ? `${recipe.waterTempC}°C` : "–" },
    { label: "총 시간", value: formatSeconds(recipe.totalTimeS) },
    { label: "분쇄도", value: recipe.grindText ?? "–", wide: true },
  ];

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/recipes"
          className="-ml-1 inline-flex w-fit items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          레시피 목록
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {recipe.dripper.brand} {recipe.dripper.name}
          </span>
          {recipe.isOfficial && <OfficialBadge />}
        </div>
        <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance">{recipe.title}</h1>
        {recipe.sourceName && (
          <p className="text-sm text-muted-foreground">
            원작:{" "}
            {recipe.sourceUrl ? (
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {recipe.sourceName}
              </a>
            ) : (
              recipe.sourceName
            )}
          </p>
        )}
        {recipe.description && <p className="max-w-prose text-muted-foreground">{recipe.description}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {facts.map(({ label, value, wide }) => (
          <div key={label} className={wide ? "col-span-2 bg-card p-3 sm:col-span-4" : "bg-card p-3"}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <RecipeCalculator doseG={recipe.doseG} ratio={recipe.ratio} steps={recipe.steps} />
    </article>
  );
}
