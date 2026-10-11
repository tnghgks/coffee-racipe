"use client";

import { useState, useTransition } from "react";

import { deleteComment, updateComment } from "../actions";
import { formatCommentTime } from "../comment-schema";
import type { RecipeComment } from "../my-queries";

import { AuthorLink } from "./author-link";
import { CommentForm } from "./comment-form";
import { ReportButton } from "./report-button";

const textButton = "text-xs text-muted-foreground hover:text-foreground disabled:opacity-50";

export function CommentItem({ comment, canReport }: { comment: RecipeComment; canReport: boolean }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  if (comment.deleted) {
    return (
      <li className="py-3 text-sm text-muted-foreground italic" data-testid="comment">
        삭제된 댓글이에요.
      </li>
    );
  }

  const remove = () =>
    startDelete(async () => {
      const result = await deleteComment(comment.id);
      if (result.error) setError(result.error);
      setMode("view");
    });

  return (
    <li className="flex flex-col gap-1.5 py-3" data-testid="comment">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {comment.author ? <AuthorLink author={comment.author} className="text-sm text-foreground" /> : <span>알 수 없음</span>}
        <time dateTime={comment.createdAt}>{formatCommentTime(comment.createdAt)}</time>
        {comment.edited && <span>(수정됨)</span>}
      </div>

      {mode === "edit" ? (
        <CommentForm
          submit={updateComment.bind(null, comment.id)}
          label="댓글 수정"
          submitLabel="수정 완료"
          defaultValue={comment.body}
          onDone={() => setMode("view")}
          onCancel={() => setMode("view")}
        />
      ) : (
        <p className="text-sm break-words whitespace-pre-line">{comment.body}</p>
      )}

      {mode !== "edit" && (
        <div className="flex flex-wrap items-center gap-3">
          {comment.isMine &&
            (mode === "confirm-delete" ? (
              <>
                <span className="text-xs">댓글을 삭제할까요?</span>
                <button type="button" className={`${textButton} font-medium text-destructive`} onClick={remove} disabled={deleting}>
                  삭제
                </button>
                <button type="button" className={textButton} onClick={() => setMode("view")}>
                  취소
                </button>
              </>
            ) : (
              <>
                <button type="button" className={textButton} onClick={() => setMode("edit")}>
                  수정
                </button>
                <button type="button" className={textButton} onClick={() => setMode("confirm-delete")}>
                  삭제
                </button>
              </>
            ))}
          {canReport && <ReportButton target={{ type: "comment", id: comment.id }} />}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
