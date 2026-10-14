import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireProfile } from "@/features/auth/queries";
import { listLikedRecipes } from "@/features/community/my-queries";
import { RecipeCard } from "@/features/recipe/components/recipe-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "좋아요한 레시피", robots: { index: false } };

export default async function LikedRecipesPage() {
  await requireProfile("/me/liked");
  const recipes = await listLikedRecipes();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">좋아요한 레시피</h1>
        <p className="text-sm text-muted-foreground">레시피 {recipes.length}개</p>
      </header>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Heart className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">아직 좋아요한 레시피가 없어요</p>
          <p className="max-w-xs text-sm text-muted-foreground">레시피 상세에서 &ldquo;좋아요&rdquo;를 누르면 여기에 모여요.</p>
          <Link href="/explore" className={cn(buttonVariants({ variant: "outline" }), "mt-2 h-10")}>
            레시피 탐색하기
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="liked-recipe-list">
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
