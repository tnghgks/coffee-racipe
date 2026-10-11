"use server";

import { z } from "zod";

import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

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
