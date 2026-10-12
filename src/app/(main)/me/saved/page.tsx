import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireProfile } from "@/features/auth/queries";
import { listSavedRecipes } from "@/features/community/my-queries";
import { CacheForOffline } from "@/features/pwa/components/cache-for-offline";
import { RecipeCard } from "@/features/recipe/components/recipe-card";
import { recipeOfflineUrls } from "@/lib/pwa/offline";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "저장한 레시피", robots: { index: false } };

export default async function SavedRecipesPage() {
  await requireProfile("/me/saved");
  const recipes = await listSavedRecipes();

  return (
    <div className="flex flex-col gap-6">
      {/* saved recipes stay available offline, brew mode included */}
      <CacheForOffline urls={["/me/saved", ...recipes.flatMap((recipe) => recipeOfflineUrls(recipe.id))]} />
      <header>
        <h1 className="text-2xl font-bold tracking-tight">저장한 레시피</h1>
        <p className="text-sm text-muted-foreground">레시피 {recipes.length}개</p>
      </header>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Bookmark className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">아직 저장한 레시피가 없어요</p>
          <p className="max-w-xs text-sm text-muted-foreground">레시피 상세에서 &ldquo;저장&rdquo;을 누르면 여기에 모여요.</p>
          <Link href="/explore" className={cn(buttonVariants({ variant: "outline" }), "mt-2 h-10")}>
            레시피 탐색하기
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="saved-recipe-list">
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
