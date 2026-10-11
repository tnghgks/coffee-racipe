import { Copy, GitFork, Pencil } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/queries";
import { AuthorLink } from "@/features/community/components/author-link";
import { cn } from "@/lib/utils";

import { getRecipeForViewer } from "../my-queries";
import type { RecipeDetail } from "../types";

const action = cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 gap-1.5");

type ForkLinkProps = { recipe: Pick<RecipeDetail, "id" | "forkCount"> };

/** "복제해서 수정" for everyone (anonymous users go through login), with how many times it was forked. */
export function ForkLink({ recipe }: ForkLinkProps) {
  return (
    <Link href={`/recipes/new?fork=${recipe.id}`} className={action} data-testid="fork-link">
      <Copy aria-hidden />
      복제해서 수정
      {recipe.forkCount > 0 && (
        <span className="text-muted-foreground tabular-nums" title={`${recipe.forkCount}번 복제됐어요`}>
          {recipe.forkCount}
        </span>
      )}
    </Link>
  );
}

/** Reads the session; render inside <Suspense fallback={<ForkLink …/>}>. */
export async function RecipeActions({ recipe }: { recipe: Pick<RecipeDetail, "id" | "authorId" | "forkCount"> }) {
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
      <ForkLink recipe={recipe} />
    </div>
  );
}

/** "원본: @작성자 / 레시피" for forks, shown only if the viewer can see the original. */
export async function ForkOrigin({ forkedFrom }: { forkedFrom: string }) {
  const origin = await getRecipeForViewer(forkedFrom);
  if (!origin) return null;
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground" data-testid="fork-origin">
      <GitFork className="size-4 shrink-0" aria-hidden />
      원본:
      {origin.author ? <AuthorLink author={origin.author} /> : origin.isOfficial && <span>공식</span>}
      <span aria-hidden>/</span>
      <Link href={`/recipes/${origin.id}`} className="min-w-0 truncate font-medium text-foreground underline underline-offset-2">
        {origin.title}
      </Link>
    </p>
  );
}
