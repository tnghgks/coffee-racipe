import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/features/auth/paths";
import { getMyProfile } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

import { createComment } from "../actions";
import { listComments } from "../my-queries";

import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import { ReportButton } from "./report-button";

/** Comment thread + form at the bottom of a recipe. Reads the session: render in <Suspense>. */
export async function RecipeComments({ recipeId, authorId }: { recipeId: string; authorId: string | null }) {
  const [comments, profile] = await Promise.all([listComments(recipeId), getMyProfile()]);
  const count = comments.filter((comment) => !comment.deleted).length;
  const here = `/recipes/${recipeId}`;

  return (
    <section aria-label="댓글" className="flex flex-col gap-3 border-t pt-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageCircle className="size-5 text-primary" aria-hidden />
        댓글 <span className="text-muted-foreground tabular-nums">{count}</span>
      </h2>

      {comments.length > 0 ? (
        <ol className="flex flex-col divide-y" data-testid="comment-list">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} canReport={!!profile && !comment.isMine} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>
      )}

      {!profile ? (
        <Link href={loginHref(here)} className={cn(buttonVariants({ variant: "outline" }), "h-10 w-fit")}>
          로그인하고 댓글 쓰기
        </Link>
      ) : !profile.username ? (
        <Link href={`/me/setup?next=${encodeURIComponent(here)}`} className={cn(buttonVariants({ variant: "outline" }), "h-10 w-fit")}>
          프로필을 만들고 댓글 쓰기
        </Link>
      ) : (
        <CommentForm submit={createComment.bind(null, recipeId)} label="댓글 쓰기" submitLabel="등록" />
      )}

      {profile && profile.id !== authorId && (
        <ReportButton target={{ type: "recipe", id: recipeId }} className="mt-2 self-start" />
      )}
    </section>
  );
}
