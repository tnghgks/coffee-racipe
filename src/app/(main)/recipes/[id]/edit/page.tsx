import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireProfile } from "@/features/auth/queries";
import { DeleteRecipeButton } from "@/features/recipe/components/editor/delete-recipe-button";
import { RecipeEditor } from "@/features/recipe/components/editor/recipe-editor";
import { recipeToForm } from "@/features/recipe/editor-schema";
import { getEditableRecipe } from "@/features/recipe/my-queries";
import { getDrippers } from "@/features/recipe/queries";

export const metadata: Metadata = { title: "레시피 수정", robots: { index: false } };

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  await requireProfile(`/recipes/${id}/edit`);

  // Someone else's recipe (or a missing one) looks the same: not found.
  const [recipe, drippers] = await Promise.all([getEditableRecipe(id), getDrippers()]);
  if (!recipe) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">레시피 수정</h1>
      <RecipeEditor
        drippers={drippers}
        defaultValues={recipeToForm(recipe, { forkedFrom: recipe.forkedFrom })}
        recipeId={recipe.id}
        cancelHref={`/recipes/${recipe.id}`}
      />
      <div className="border-t pt-4">
        <DeleteRecipeButton recipeId={recipe.id} title={recipe.title} />
      </div>
    </div>
  );
}
