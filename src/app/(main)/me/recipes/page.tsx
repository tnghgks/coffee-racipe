import { BookOpen, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireProfile } from "@/features/auth/queries";
import { RecipeCard } from "@/features/recipe/components/recipe-card";
import { listMyRecipes } from "@/features/recipe/my-queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "내 레시피", robots: { index: false } };

export default async function MyRecipesPage() {
  await requireProfile("/me/recipes");
  const recipes = await listMyRecipes();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">내 레시피</h1>
          <p className="text-sm text-muted-foreground">레시피 {recipes.length}개</p>
        </div>
        <Link href="/recipes/new" className={cn(buttonVariants({ size: "lg" }), "h-11")}>
          <Plus aria-hidden />새 레시피
        </Link>
      </header>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">아직 만든 레시피가 없어요</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            처음부터 만들거나, 마음에 드는 공식 레시피에서 &ldquo;복제해서 수정&rdquo;으로 시작해 보세요.
          </p>
          <Link href="/recipes" className={cn(buttonVariants({ variant: "outline" }), "mt-2 h-10")}>
            공식 레시피 둘러보기
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="my-recipe-list">
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
