"use client";

import { Flag } from "lucide-react";
import { useActionState, useId, useState } from "react";

import { HydrationFieldset } from "@/components/common/hydration-guard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { reportContent, type FormState } from "../actions";
import { REPORT_DETAIL_MAX_LENGTH, reportReasons, type ReportReason, type ReportTarget } from "../comment-schema";

type Props = { target: { type: ReportTarget; id: string }; className?: string };

/** "신고" opens a small inline form (reason + optional detail). Reports are only readable by admins. */
export function ReportButton({ target, className }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: FormState & { n: number }, formData: FormData) => ({
      ...(await reportContent(target, prev, formData)),
      n: prev.n + 1,
    }),
    { n: 0 },
  );
  const detailId = useId();
  const noun = target.type === "recipe" ? "레시피" : "댓글";

  if (state.ok) {
    return (
      <p role="status" className={cn("text-sm text-muted-foreground", className)}>
        신고했어요. 확인 후 조치할게요.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground", className)}
      >
        <Flag className="size-3.5" aria-hidden />
        {target.type === "recipe" ? "레시피 신고" : "신고"}
      </button>
    );
  }

  return (
    <form action={action} className={cn("flex w-full flex-col gap-3 rounded-lg border bg-muted/40 p-3", className)}>
      <HydrationFieldset>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-medium">이 {noun}을 신고하는 이유</legend>
          {(Object.keys(reportReasons) as ReportReason[]).map((reason) => (
            <label key={reason} className="flex min-h-8 items-center gap-2 text-sm">
              <input type="radio" name="reason" value={reason} required className="size-4 accent-primary" />
              {reportReasons[reason]}
            </label>
          ))}
        </fieldset>
        <label htmlFor={detailId} className="text-sm">
          자세한 내용 <span className="text-muted-foreground">(선택)</span>
        </label>
        <textarea
          key={state.n}
          id={detailId}
          name="detail"
          rows={2}
          maxLength={REPORT_DETAIL_MAX_LENGTH}
          defaultValue={state.body ?? ""}
          className="rounded-md border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" className="h-9" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button type="submit" variant="destructive" className="h-9" disabled={pending}>
            신고하기
          </Button>
        </div>
      </HydrationFieldset>
    </form>
  );
}
