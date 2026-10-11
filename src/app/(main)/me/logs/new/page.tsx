import type { Metadata } from "next";

import { requireProfile } from "@/features/auth/queries";
import { LogForm } from "@/features/log/components/log-form";
import { logDefaultsFromQuery } from "@/features/log/prefill";
import { getRecipeForViewer } from "@/features/recipe/my-queries";

export const metadata: Metadata = { title: "기록 남기기", robots: { index: false } };

/** New log, usually opened from the brew-finished screen with ?recipe=&dose=&ratio=&time=&iced=. */
export default async function NewLogPage({ searchParams }: PageProps<"/me/logs/new">) {
  const query = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();
  await requireProfile(qs ? `/me/logs/new?${qs}` : "/me/logs/new");

  const recipeId = typeof query.recipe === "string" ? query.recipe : null;
  const recipe = recipeId ? await getRecipeForViewer(recipeId) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">기록 남기기</h1>
      <LogForm
        defaultValues={logDefaultsFromQuery(query, recipe)}
        logId={null}
        recipe={recipe ? { id: recipe.id, title: recipe.title } : null}
        cancelHref={recipe ? `/recipes/${recipe.id}` : "/me/logs"}
      />
    </div>
  );
}
