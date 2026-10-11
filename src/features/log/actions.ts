"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/queries";
import { isUuid } from "@/features/recipe/mappers";
import { createClient } from "@/lib/supabase/server";

import { logFormSchema, logToRow, type LogFormInput } from "./schema";

export type SaveLogState = {
  fieldErrors?: Record<string, string>;
  error?: string;
};

/** Creates (logId = null) or updates the signed-in user's brew log. RLS keeps it owner-only. */
export async function saveBrewLog(values: LogFormInput, logId: string | null): Promise<SaveLogState> {
  if (!(await getCurrentUser())) redirect("/login");
  if (logId !== null && !isUuid(logId)) return { error: "잘못된 기록이에요." };

  const parsed = logFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { fieldErrors };
  }

  const supabase = await createClient();
  const row = logToRow(parsed.data);
  const { error } = logId
    ? await supabase.from("brew_logs").update(row).eq("id", logId).select("id").single()
    : await supabase.from("brew_logs").insert(row);

  if (error?.code === "PGRST116") return { error: "기록을 찾을 수 없어요." }; // update matched no row
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };

  redirect("/me/logs");
}

export async function deleteBrewLog(logId: string) {
  if (!(await getCurrentUser())) redirect("/login");
  if (isUuid(logId)) {
    const supabase = await createClient();
    await supabase.from("brew_logs").delete().eq("id", logId);
  }
  redirect("/me/logs");
}
