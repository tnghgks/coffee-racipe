"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

import { formToSavePayload, recipeFormSchema, type RecipeFormInput } from "./editor-schema";
import { isUuid } from "./mappers";
import { getDrippers, recipeTags } from "./queries";

export type SaveRecipeState = {
  /** Field path ("title", "steps.2.cumulativeG", …) → message. */
  fieldErrors?: Record<string, string>;
  error?: string;
};

/** Creates (recipeId = null, optionally as a fork) or updates the signed-in user's recipe. */
export async function saveRecipe(values: RecipeFormInput, recipeId: string | null): Promise<SaveRecipeState> {
  if (!(await getCurrentUser())) redirect("/login");
  if (recipeId !== null && !isUuid(recipeId)) return { error: "잘못된 레시피예요." };

  const parsed = recipeFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { fieldErrors };
  }

  const dripper = (await getDrippers()).find((d) => d.slug === parsed.data.dripperSlug);
  if (!dripper) return { fieldErrors: { dripperSlug: "드리퍼를 골라 주세요" } };

  const { recipe, steps } = formToSavePayload(parsed.data, dripper.id);
  const supabase = await createClient();
  const { data: savedId, error } = await supabase.rpc("save_recipe", {
    recipe,
    steps,
    ...(recipeId ? { recipe_id: recipeId } : {}),
  });

  if (error?.code === "P0002") return { error: "레시피를 찾을 수 없거나 수정 권한이 없어요." };
  if (error?.code === "22023") return { error: "단계의 시간과 물량 순서를 확인해 주세요." };
  if (error || !savedId) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };

  updateTag(recipeTags.all);
  updateTag(recipeTags.detail(savedId));
  redirect(`/recipes/${savedId}`);
}

export async function deleteRecipe(recipeId: string) {
  if (!(await getCurrentUser())) redirect("/login");
  if (!isUuid(recipeId)) redirect("/me/recipes");

  const supabase = await createClient();
  // RLS limits deletes to the author's own rows; steps cascade.
  await supabase.from("recipes").delete().eq("id", recipeId);

  updateTag(recipeTags.all);
  updateTag(recipeTags.detail(recipeId));
  redirect("/me/recipes");
}
