"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

import { commentBodySchema, reportSchema } from "./comment-schema";
import type { ReactionState } from "./reactions";

const reactionSchema = z.object({
  recipeId: z.uuid(),
  kind: z.enum(["like", "save"]),
  active: z.boolean(),
});

export type ReactionResult = { ok: true; state: ReactionState } | { ok: false; error: string };

/**
 * Sets (not toggles) the viewer's like or save, so repeated or retried requests converge on the last
 * click. Returns the fresh totals. No cache invalidation: the buttons own their state, and cached lists
 * catch up within their cache lifetime.
 */
export async function setReaction(input: z.input<typeof reactionSchema>): Promise<ReactionResult> {
  const parsed = reactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 요청이에요." };
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };

  const { recipeId, kind, active } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("set_recipe_reaction", { target: recipeId, kind, active })
    .maybeSingle();

  if (error?.code === "42501") return { ok: false, error: "이 레시피에는 반응할 수 없어요." };
  if (error) return { ok: false, error: "반영하지 못했어요. 잠시 후 다시 시도해 주세요." };
  if (!data) return { ok: false, error: "레시피를 찾을 수 없어요." };
  return { ok: true, state: data };
}

// ---------------------------------------------------------------------------
// Comments and reports. Forms post here directly (`<form action>`), so they work before hydration;
// on success `refresh()` re-renders the (uncached) comment list.
// ---------------------------------------------------------------------------

export type FormState = {
  ok?: boolean;
  error?: string;
  /** Echoed back on failure so the form keeps what the user typed (React resets forms after an action). */
  body?: string;
};

const SIGN_IN_REQUIRED = "로그인이 필요해요.";
const RETRY_LATER = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

export async function createComment(recipeId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const raw = text(formData, "body");
  if (!(await getCurrentUser())) return { error: SIGN_IN_REQUIRED, body: raw };
  const body = commentBodySchema.safeParse(raw);
  if (!z.uuid().safeParse(recipeId).success) return { error: "잘못된 레시피예요.", body: raw };
  if (!body.success) return { error: body.error.issues[0].message, body: raw };

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({ recipe_id: recipeId, body: body.data });
  if (error?.code === "P0429") return { error: "댓글은 1분에 5개까지 쓸 수 있어요. 잠시 후 다시 써 주세요.", body: raw };
  if (error?.code === "42501") return { error: "이 레시피에는 댓글을 쓸 수 없어요.", body: raw };
  if (error) return { error: RETRY_LATER, body: raw };

  refresh();
  return { ok: true };
}

export async function updateComment(commentId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const raw = text(formData, "body");
  if (!(await getCurrentUser())) return { error: SIGN_IN_REQUIRED, body: raw };
  const body = commentBodySchema.safeParse(raw);
  if (!z.uuid().safeParse(commentId).success) return { error: "잘못된 댓글이에요.", body: raw };
  if (!body.success) return { error: body.error.issues[0].message, body: raw };

  const supabase = await createClient();
  // RLS limits this to the author's own, not-yet-deleted comment; no row back means "not allowed".
  const { data, error } = await supabase
    .from("comments")
    .update({ body: body.data })
    .eq("id", commentId)
    .select("id")
    .maybeSingle();
  if (error) return { error: RETRY_LATER, body: raw };
  if (!data) return { error: "수정할 수 없는 댓글이에요.", body: raw };

  refresh();
  return { ok: true };
}

/** Soft delete: the row stays (thread order, reports) and the database clears the text. */
export async function deleteComment(commentId: string): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: SIGN_IN_REQUIRED };
  if (!z.uuid().safeParse(commentId).success) return { error: "잘못된 댓글이에요." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .select("id")
    .maybeSingle();
  if (error) return { error: RETRY_LATER };
  if (!data) return { error: "삭제할 수 없는 댓글이에요." };

  refresh();
  return { ok: true };
}

export async function reportContent(
  target: { type: "recipe" | "comment"; id: string },
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: SIGN_IN_REQUIRED };
  const parsed = reportSchema.safeParse({
    targetType: target.type,
    targetId: target.id,
    reason: formData.get("reason") ?? undefined,
    detail: text(formData, "detail"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, body: text(formData, "detail") };

  const { targetType, targetId, reason, detail } = parsed.data;
  const supabase = await createClient();
  // Insert without returning the row: reporters can't read reports (admins only).
  const { error } = await supabase
    .from("reports")
    .insert({ target_type: targetType, target_id: targetId, reason, detail });
  if (error?.code === "23505") return { ok: true }; // already reported — same outcome for the user
  if (error?.code === "P0002") return { error: "신고할 대상을 찾을 수 없어요." };
  if (error) return { error: RETRY_LATER, body: detail ?? "" };
  return { ok: true };
}
