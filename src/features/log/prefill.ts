import { parseBrewSettings, type BrewSettings } from "@/features/brew/settings";
import { formatSeconds, roundGrams } from "@/lib/brew";

import type { LogFormInput } from "./schema";

/**
 * Brew mode → log form handoff. The finished screen links to /me/logs/new with what was brewed;
 * the query survives a login redirect, so nothing is lost for signed-out users.
 */

export type BrewResult = {
  recipeId: string;
  doseG: number;
  ratio: number;
  iced: boolean;
  /** Actual elapsed brewing time. */
  elapsedS: number;
};

export function newLogHref({ recipeId, doseG, ratio, iced, elapsedS }: BrewResult): string {
  const query = new URLSearchParams({
    recipe: recipeId,
    dose: String(doseG),
    ratio: String(ratio),
    time: String(Math.round(elapsedS)),
  });
  if (iced) query.set("iced", "1");
  return `/me/logs/new?${query}`;
}

type RawSearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function positive(raw: string | undefined, max: number): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= max ? value : null;
}

/** What the recipe contributes to the defaults (when the log starts from a recipe). */
export type RecipeDefaults = {
  id: string;
  doseG: number;
  ratio: number;
  grindText: string | null;
  waterTempC: number | null;
  totalTimeS: number;
};

export function emptyLogForm(): LogFormInput {
  return {
    recipeId: null,
    beanName: "",
    roaster: "",
    roastLevel: "",
    doseG: 15,
    waterG: 240,
    iced: false,
    grindText: "",
    waterTempC: Number.NaN,
    totalTime: "",
    rating: 0,
    acidity: 0,
    sweetness: 0,
    body: 0,
    notes: "",
    nextAdjustment: "",
  };
}

/** Defaults for /me/logs/new: brew results from the query win over the recipe's own values. */
export function logDefaultsFromQuery(query: RawSearchParams, recipe: RecipeDefaults | null): LogFormInput {
  const base = emptyLogForm();
  const doseG = positive(first(query.dose), 200) ?? recipe?.doseG ?? base.doseG;
  const ratio = positive(first(query.ratio), 30) ?? recipe?.ratio ?? null;
  const time = positive(first(query.time), 3600) ?? recipe?.totalTimeS ?? null;

  return {
    ...base,
    recipeId: recipe?.id ?? null,
    doseG,
    waterG: ratio ? roundGrams(doseG * ratio) : base.waterG,
    iced: first(query.iced) === "1",
    grindText: recipe?.grindText ?? "",
    waterTempC: recipe?.waterTempC ?? Number.NaN,
    totalTime: time ? formatSeconds(time) : "",
  };
}

/**
 * Log → brew mode ("brew it again"): the settings a past log was brewed with. Logs store grams, not the
 * ratio, so water within rounding of the recipe's ratio means the recipe ratio was used as-is.
 * Out-of-range values fall back to the recipe's, like the brew query string.
 */
export function brewSettingsFromLog(
  log: { doseG: number; waterG: number; iced: boolean },
  recipe: { doseG: number; ratio: number },
): BrewSettings {
  const ratio =
    Math.abs(log.doseG * recipe.ratio - log.waterG) <= 0.5 ? recipe.ratio : Number((log.waterG / log.doseG).toFixed(1));
  return parseBrewSettings({ dose: String(log.doseG), ratio: String(ratio), iced: log.iced ? "1" : undefined }, recipe);
}
