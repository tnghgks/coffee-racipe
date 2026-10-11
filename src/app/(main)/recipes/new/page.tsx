import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireProfile } from "@/features/auth/queries";
import { RecipeEditor } from "@/features/recipe/components/editor/recipe-editor";
import { emptyRecipeForm, recipeToForm } from "@/features/recipe/editor-schema";
import { getRecipeForViewer } from "@/features/recipe/my-queries";
import { getDrippers } from "@/features/recipe/queries";

export const metadata: Metadata = { title: "새 레시피", robots: { index: false } };

/** New recipe, or `?fork=<id>`: a copy of another recipe that records where it came from. */
export default async function NewRecipePage({ searchParams }: PageProps<"/recipes/new">) {
  const { fork } = await searchParams;
  const forkId = typeof fork === "string" ? fork : null;
  await requireProfile(forkId ? `/recipes/new?fork=${forkId}` : "/recipes/new");

  const [drippers, source] = await Promise.all([getDrippers(), forkId ? getRecipeForViewer(forkId) : null]);
  if (forkId && !source) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{source ? "복제해서 수정" : "새 레시피"}</h1>
        {source && <p className="text-sm text-muted-foreground">「{source.title}」을 바탕으로 내 버전을 만들어요.</p>}
      </header>
      <RecipeEditor
        drippers={drippers}
        defaultValues={
          source ? recipeToForm(source, { forkedFrom: source.id, titleSuffix: " (내 버전)" }) : emptyRecipeForm()
        }
        recipeId={null}
        cancelHref={source ? `/recipes/${source.id}` : "/me/recipes"}
      />
    </div>
  );
}
