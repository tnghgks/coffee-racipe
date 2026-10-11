/** One serving = 15g of coffee (≈ 240ml at 1:16, a typical mug). */
export const SERVING_DOSE_G = 15;

export const SERVING_OPTIONS = [1, 2, 3, 4] as const;

export function doseForServings(servings: number): number {
  return servings * SERVING_DOSE_G;
}

/** The whole number of servings a dose equals, or null when it is in between (e.g. 20g). */
export function servingsForDose(doseG: number): number | null {
  const servings = doseG / SERVING_DOSE_G;
  return Number.isInteger(servings) && servings > 0 ? servings : null;
}
