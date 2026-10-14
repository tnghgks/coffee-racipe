import { Bean, ChevronLeft, Coffee, Droplet, Play, Thermometer, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { brewSettingsQuery, parseBrewSettings } from "@/features/brew/settings";
import { AuthorLink } from "@/features/community/components/author-link";
import { RecipeComments } from "@/features/community/components/recipe-comments";
import { RecipeReactions, RecipeReactionsFallback } from "@/features/community/components/recipe-reactions";
import { MyRecipeLogs } from "@/features/log/components/recipe-log-sections";
import { OfficialBadge } from "@/features/recipe/components/official-badge";
import { ForkLink, ForkOrigin, RecipeActions } from "@/features/recipe/components/recipe-actions";
import { RecipeImage } from "@/features/recipe/components/recipe-image";
import { SourceCredit } from "@/features/recipe/components/source-credit";
import { StepTimeline } from "@/features/recipe/components/step-timeline";
import { VisibilityBadge } from "@/features/recipe/components/visibility-badge";
import { dripperLabel } from "@/features/recipe/dripper";
import { CacheForOffline } from "@/features/pwa/components/cache-for-offline";
import { getRecipeForViewer } from "@/features/recipe/my-queries";
import { formatGrams, formatRatio, formatSeconds, scaleRecipe } from "@/lib/brew";
import { recipeOfflineUrls } from "@/lib/pwa/offline";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/recipes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipeForViewer(id);
  if (!recipe) return { title: "레시피를 찾을 수 없어요" };

  const summary = `${dripperLabel(recipe.dripper)} · 원두 ${formatGrams(recipe.doseG)} · ${formatRatio(recipe.ratio)}`;
  return {
    title: recipe.title,
    description: recipe.description ? `${summary} — ${recipe.description}` : summary,
    // Unlisted/private recipes are reachable by link only; keep them out of search engines.
    robots: recipe.visibility === "public" ? undefined : { index: false, follow: false },
  };
}

export default async function RecipePage({ params, searchParams }: PageProps<"/recipes/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const recipe = await getRecipeForViewer(id);
  if (!recipe) notFound();

  // The recipe as written; dose, ratio and hot/iced are dialed in on the brew prep view.
  const scaled = scaleRecipe(recipe, recipe.doseG);
  // Settings carried back from brew mode go along again, so leaving and coming back keeps them.
  const brewHref = `/recipes/${recipe.id}/brew${brewSettingsQuery(parseBrewSettings(query, recipe), recipe)}`;
  const specs = [
    { icon: Coffee, label: "원두", value: `원두 ${formatGrams(recipe.doseG)}` },
    { icon: Droplet, label: "물", value: `${formatRatio(recipe.ratio)} · 물 ${scaled.brewWaterG}g` },
    recipe.waterTempC && { icon: Thermometer, label: "물 온도", value: `${recipe.waterTempC}°C` },
    { icon: Timer, label: "총 시간", value: formatSeconds(recipe.totalTimeS) },
    recipe.grindText && { icon: Bean, label: "분쇄도", value: recipe.grindText },
  ].filter((spec) => !!spec);

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* recently viewed recipes (and their brew mode) open offline */}
      <CacheForOffline urls={recipeOfflineUrls(recipe.id)} />
      <header className="flex flex-col gap-3">
        <Link
          href="/recipes"
          className="-ml-1 inline-flex w-fit items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          레시피 목록
        </Link>

        <RecipeImage
          recipe={recipe}
          sizes="(min-width: 672px) 672px, 100vw"
          preload
          className="aspect-video max-h-80 w-full rounded-2xl"
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{dripperLabel(recipe.dripper)}</span>
            {recipe.isOfficial ? <OfficialBadge /> : <VisibilityBadge visibility={recipe.visibility} />}
          </div>
          <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance">{recipe.title}</h1>
          {recipe.author && <AuthorLink author={recipe.author} size="md" className="w-fit text-sm" />}
        </div>

        {recipe.forkedFrom && (
          <Suspense>
            <ForkOrigin forkedFrom={recipe.forkedFrom} />
          </Suspense>
        )}

        {recipe.description && <p className="text-muted-foreground">{recipe.description}</p>}

        {recipe.sourceName && (
          <SourceCredit name={recipe.sourceName} url={recipe.sourceUrl} note={recipe.sourceNote} />
        )}

        <ul className="flex flex-wrap gap-2" aria-label="추출 조건">
          {specs.map(({ icon: Icon, label, value }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
            >
              <Icon className="size-4 opacity-70" aria-hidden />
              <span className="sr-only">{label}</span>
              {value}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-start gap-2">
          <Suspense fallback={<RecipeReactionsFallback recipe={recipe} />}>
            <RecipeReactions recipeId={recipe.id} />
          </Suspense>
          <Suspense fallback={<ForkLink recipe={recipe} />}>
            <RecipeActions recipe={recipe} />
          </Suspense>
        </div>
      </header>

      <Link href={brewHref} className={cn(buttonVariants({ size: "lg" }), "h-14 text-base")}>
        <Play aria-hidden />
        추출하기
      </Link>

      <section aria-labelledby="steps-heading" className="flex flex-col gap-4">
        <h2 id="steps-heading" className="text-lg font-semibold">
          단계
        </h2>
        <StepTimeline steps={scaled.steps} totalWaterG={scaled.brewWaterG} />
      </section>

      <Suspense>
        <MyRecipeLogs recipeId={recipe.id} />
      </Suspense>

      <Suspense>
        <RecipeComments recipeId={recipe.id} authorId={recipe.authorId} />
      </Suspense>
    </article>
  );
}
