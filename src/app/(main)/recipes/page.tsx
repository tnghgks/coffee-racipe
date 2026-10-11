import type { Metadata } from "next";

import { RecipeCard } from "@/features/recipe/components/recipe-card";
import { RecipeFilters } from "@/features/recipe/components/recipe-filters";
import { getDrippers, listPublicRecipes } from "@/features/recipe/queries";
import { parseRecipeListParams } from "@/features/recipe/search-params";

export const metadata: Metadata = {
  title: "레시피",
  description: "드리퍼별 핸드드립 레시피. 원두량만 바꾸면 단계별 물량이 자동으로 환산됩니다.",
};

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const params = parseRecipeListParams(await searchParams);
  const [drippers, recipes] = await Promise.all([getDrippers(), listPublicRecipes(params)]);
  const dripperName = drippers.find((d) => d.slug === params.dripper)?.name;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">레시피</h1>
        <p className="text-sm text-muted-foreground">
          {dripperName ? `${dripperName} 레시피 ${recipes.length}개` : `레시피 ${recipes.length}개`}
        </p>
      </header>

      <RecipeFilters drippers={drippers} params={params} />

      {recipes.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">조건에 맞는 레시피가 없습니다.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="recipe-list">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
