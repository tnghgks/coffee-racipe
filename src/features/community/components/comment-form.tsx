"use client";

import { useActionState, useId } from "react";

import { HydrationFieldset } from "@/components/common/hydration-guard";
import { Button } from "@/components/ui/button";

import { type FormState } from "../actions";
import { COMMENT_MAX_LENGTH } from "../comment-schema";

type Props = {
  /** createComment/updateComment with the id already bound. */
  submit: (prev: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  submitLabel: string;
  defaultValue?: string;
  onDone?: () => void;
  onCancel?: () => void;
};

/**
 * Textarea + submit for writing or editing a comment. React resets the form after every action, so the
 * textarea is re-keyed per result and refilled with the text the server echoes back on failure.
 */
export function CommentForm({ submit, label, submitLabel, defaultValue = "", onDone, onCancel }: Props) {
  const [state, action, pending] = useActionState(
    async (prev: FormState & { n: number }, formData: FormData) => {
      const result = await submit(prev, formData);
      if (result.ok) onDone?.();
      return { ...result, n: prev.n + 1 };
    },
    { n: 0 },
  );
  const id = useId();

  return (
    <form action={action} className="flex flex-col gap-2">
      <HydrationFieldset>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <textarea
          key={state.n}
          id={id}
          name="body"
          required
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
          defaultValue={state.ok ? "" : (state.body ?? defaultValue)}
          placeholder="레시피에 대한 생각이나 추출 팁을 남겨 주세요"
          className="w-full rounded-lg border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" className="h-9" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button type="submit" className="h-9" disabled={pending}>
            {submitLabel}
          </Button>
        </div>
      </HydrationFieldset>
    </form>
  );
}
