import { DOSE_LIMITS, RATIO_LIMITS, widenLimits, type Limits } from "@/lib/brew/limits";

/** What the user dialed in on the recipe page, carried to brew mode (and back) in the query string. */
export type BrewSettings = {
  doseG: number;
  ratio: number;
  iced: boolean;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function parseNumber(raw: string | undefined, limits: Limits, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= limits.min && value <= limits.max ? value : fallback;
}

/** Reads ?dose=&ratio=&iced=1, falling back to the recipe's values for anything missing or out of range. */
export function parseBrewSettings(searchParams: RawSearchParams, recipe: { doseG: number; ratio: number }): BrewSettings {
  return {
    doseG: parseNumber(first(searchParams.dose), widenLimits(DOSE_LIMITS, recipe.doseG), recipe.doseG),
    ratio: parseNumber(first(searchParams.ratio), widenLimits(RATIO_LIMITS, recipe.ratio), recipe.ratio),
    iced: first(searchParams.iced) === "1",
  };
}

/** Query string for the settings, omitting values equal to the recipe's defaults. Includes "?" when non-empty. */
export function brewSettingsQuery(settings: BrewSettings, recipe: { doseG: number; ratio: number }): string {
  const query = new URLSearchParams();
  if (settings.doseG !== recipe.doseG) query.set("dose", String(settings.doseG));
  if (settings.ratio !== recipe.ratio) query.set("ratio", String(settings.ratio));
  if (settings.iced) query.set("iced", "1");
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}
