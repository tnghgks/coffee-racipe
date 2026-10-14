import { ChevronRight, NotebookPen, Play } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { Profile } from "@/features/auth/queries";
import { brewSettingsQuery } from "@/features/brew/settings";
import { listLikedRecipes, listSavedRecipes } from "@/features/community/my-queries";
import { getLastAdjustment, getLastBrew } from "@/features/log/queries";
import { CacheForOffline } from "@/features/pwa/components/cache-for-offline";
import { RecipeImage } from "@/features/recipe/components/recipe-image";
import { RecipeRow } from "@/features/recipe/components/recipe-row";
import type { RecipeSummary } from "@/features/recipe/types";
import { formatGrams, formatRatio } from "@/lib/brew";
import { recipeOfflineUrls } from "@/lib/pwa/offline";
import { cn } from "@/lib/utils";

import { HomeSection } from "./home-section";
import { MyRecipeTabs } from "./my-recipe-tabs";

// Signed-in home: everything here reads the session (never cached). Render inside <Suspense>.

const MY_LIST_COUNT = 5;

export async function SignedInTop({ profile }: { profile: Profile }) {
  const name = profile.displayName ?? profile.username;
  const [saved, liked] = await Promise.all([listSavedRecipes(MY_LIST_COUNT), listLikedRecipes(MY_LIST_COUNT)]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{name ? `안녕하세요, ${name}님` : "안녕하세요"}</h1>
        <p className="text-muted-foreground">오늘은 어떤 한 잔을 내릴까요?</p>
      </header>

      <ContinueBrewCard />

      <HomeSection title="내 레시피 모음">
        <MyRecipeTabs
          saved={
            <MyRecipeList
              recipes={saved}
              allHref="/me/saved"
              allLabel="저장한 레시피 전체 보기"
              empty="레시피 상세에서 “저장”을 누르면 여기에 모여요."
              testId="home-saved"
            />
          }
          liked={
            <MyRecipeList
              recipes={liked}
              allHref="/me/liked"
              allLabel="좋아요한 레시피 전체 보기"
              empty="레시피 상세에서 “좋아요”를 누르면 여기에 모여요."
              testId="home-liked"
            />
          }
        />
      </HomeSection>
    </>
  );
}

function MyRecipeList({
  recipes,
  allHref,
  allLabel,
  empty,
  testId,
}: {
  recipes: RecipeSummary[];
  allHref: string;
  allLabel: string;
  empty: string;
  testId: string;
}) {
  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center" data-testid={testId}>
        <p className="text-sm text-muted-foreground">{empty}</p>
        <Link href="/explore" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>
          레시피 탐색하기
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2" data-testid={testId}>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <RecipeRow recipe={recipe} showCounts />
          </li>
        ))}
      </ul>
      <Link
        href={allHref}
        className="inline-flex items-center justify-center gap-0.5 self-center text-sm font-medium text-primary hover:underline"
      >
        {allLabel}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/** The last recipe brewed, with a one-tap "brew it again" using the same dose, ratio and hot/iced. */
async function ContinueBrewCard() {
  const last = await getLastBrew();
  if (!last) return null;
  const { recipe, settings } = last;
  const note = await getLastAdjustment(recipe.id);
  const brewHref = `/recipes/${recipe.id}/brew${brewSettingsQuery(settings, recipe)}`;

  return (
    <section aria-label="지난번에 내린 레시피" className="flex flex-col gap-4 rounded-2xl border bg-card p-4" data-testid="continue-brew">
      {/* brewing it again should work offline too */}
      <CacheForOffline urls={recipeOfflineUrls(recipe.id)} />
      <Link href={`/recipes/${recipe.id}`} className="flex gap-4 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <RecipeImage recipe={recipe} sizes="112px" preload className="size-24 rounded-xl sm:size-28" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs text-muted-foreground">지난번에 내린 레시피</p>
          <h2 className="truncate text-lg font-bold">{recipe.title}</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            원두 {formatGrams(settings.doseG)} · {formatRatio(settings.ratio)} · {settings.iced ? "아이스" : "핫"}
          </p>
          {note && (
            <p className="mt-1 flex items-start gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm text-secondary-foreground">
              <NotebookPen className="mt-0.5 size-4 shrink-0 opacity-70" aria-hidden />
              <span className="line-clamp-2">다음엔: {note.text}</span>
            </p>
          )}
        </div>
      </Link>
      <Link href={brewHref} className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
        <Play className="fill-current" aria-hidden />이 레시피로 다시 추출
      </Link>
    </section>
  );
}
