import "server-only";

import { cache } from "react";

import { getCurrentUser } from "@/features/auth/queries";
import { isUuid } from "@/features/recipe/mappers";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import type { RoastLevel } from "./schema";

// Brew logs are private (RLS: owner only), so every read uses the session client and is never cached.
// Render callers inside <Suspense>/loading.tsx.

export type BrewLog = {
  id: string;
  recipe: { id: string; title: string } | null;
  beanName: string | null;
  roaster: string | null;
  roastLevel: RoastLevel | null;
  doseG: number;
  waterG: number;
  iced: boolean;
  grindText: string | null;
  waterTempC: number | null;
  totalTimeS: number | null;
  rating: number;
  acidity: number | null;
  sweetness: number | null;
  body: number | null;
  notes: string | null;
  nextAdjustment: string | null;
  brewedAt: string;
};

const logColumns = `id, bean_name, roaster, roast_level, dose_g, water_g, iced, grind_text, water_temp_c, total_time_s,
  rating, acidity, sweetness, body, notes, next_adjustment, brewed_at, recipes(id, title)`;
type LogRow = Omit<Tables<"brew_logs">, "user_id" | "recipe_id" | "created_at" | "updated_at"> & {
  recipes: { id: string; title: string } | null;
};

function toLog(row: LogRow): BrewLog {
  return {
    id: row.id,
    recipe: row.recipes,
    beanName: row.bean_name,
    roaster: row.roaster,
    roastLevel: row.roast_level,
    doseG: row.dose_g,
    waterG: row.water_g,
    iced: row.iced,
    grindText: row.grind_text,
    waterTempC: row.water_temp_c,
    totalTimeS: row.total_time_s,
    rating: row.rating,
    acidity: row.acidity,
    sweetness: row.sweetness,
    body: row.body,
    notes: row.notes,
    nextAdjustment: row.next_adjustment,
    brewedAt: row.brewed_at,
  };
}

export type LogFilters = { bean: string | null; recipeId: string | null };

export async function listMyLogs({ bean, recipeId }: LogFilters, limit = 100): Promise<BrewLog[]> {
  if (!(await getCurrentUser())) return [];
  const supabase = await createClient();
  let query = supabase.from("brew_logs").select(logColumns).order("brewed_at", { ascending: false }).limit(limit);
  if (bean) query = query.eq("bean_name", bean);
  if (recipeId && isUuid(recipeId)) query = query.eq("recipe_id", recipeId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load logs: ${error.message}`);
  return data.map(toLog);
}

export const getMyLog = cache(async (id: string): Promise<BrewLog | null> => {
  if (!isUuid(id) || !(await getCurrentUser())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("brew_logs").select(logColumns).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load log: ${error.message}`);
  return data ? toLog(data) : null;
});

/** Distinct beans and recipes the user has logged, for the /me/logs filters. */
export async function getMyLogFilterOptions() {
  if (!(await getCurrentUser())) return { beans: [], recipes: [] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brew_logs")
    .select("bean_name, recipes(id, title)")
    .order("brewed_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Failed to load log filters: ${error.message}`);

  const beans = [...new Set(data.map((row) => row.bean_name).filter((name): name is string => !!name))];
  const recipes = [
    ...new Map(data.flatMap((row) => (row.recipes ? [[row.recipes.id, row.recipes] as const] : []))).values(),
  ];
  return { beans, recipes };
}

/** The user's latest logs for one recipe (recipe page section). */
export const listMyLogsForRecipe = cache(async (recipeId: string, limit = 3) =>
  listMyLogs({ bean: null, recipeId }, limit),
);

/** The most recent "next time" note left for this recipe, shown before brewing it again. */
export const getLastAdjustment = cache(async (recipeId: string) => {
  if (!isUuid(recipeId) || !(await getCurrentUser())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brew_logs")
    .select("next_adjustment, brewed_at")
    .eq("recipe_id", recipeId)
    .not("next_adjustment", "is", null)
    .order("brewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load last adjustment: ${error.message}`);
  return data?.next_adjustment ? { text: data.next_adjustment, brewedAt: data.brewed_at } : null;
});
