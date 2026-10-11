import { Copy, GitFork, Pencil } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

import { getRecipeForViewer } from "../my-queries";
import type { RecipeDetail } from "../types";

const action = cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 gap-1.5");

/** "복제해서 수정" for everyone (anonymous users go through login), "수정" for the author. */
export function ForkLink({ recipeId }: { recipeId: string }) {
  return (
    <Link href={`/recipes/new?fork=${recipeId}`} className={action}>
      <Copy aria-hidden />
      복제해서 수정
    </Link>
  );
}

/** Reads the session; render inside <Suspense fallback={<ForkLink …/>}>. */
export async function RecipeActions({ recipe }: { recipe: Pick<RecipeDetail, "id" | "authorId"> }) {
  const user = await getCurrentUser();
  const isAuthor = !!user && user.id === recipe.authorId;

  return (
    <div className="flex flex-wrap gap-2">
      {isAuthor && (
        <Link href={`/recipes/${recipe.id}/edit`} className={action}>
          <Pencil aria-hidden />
          수정
        </Link>
      )}
      <ForkLink recipeId={recipe.id} />
    </div>
  );
}

/** "원본: …" link for forks, shown only if the viewer can see the original. */
export async function ForkOrigin({ forkedFrom }: { forkedFrom: string }) {
  const origin = await getRecipeForViewer(forkedFrom);
  if (!origin) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <GitFork className="size-4" aria-hidden />
      원본{" "}
      <Link href={`/recipes/${origin.id}`} className="font-medium text-foreground underline underline-offset-2">
        {origin.title}
      </Link>
    </p>
  );
}
